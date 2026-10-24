import { Rng } from '@/core/rng/rng'
import { SeededRng } from '@/core/rng/seeded-rng'
import { Stat } from '@/domain/characters/enums/stat'
import { BattleSide } from '@/domain/combat/enums/battle-enums'
import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { BattleActionPayload } from '@/domain/combat/value-objects/battle-action'
import {
  DifficultyRules,
  DIFFICULTY_RULES,
  LOOKAHEAD_MAX_ACTIONS,
  LOOKAHEAD_WEIGHT,
  PROFILE_WEIGHTS,
  SCORE_CUT,
} from './ai-values'
import { evaluateBattle } from './services/battle-evaluation'
import { AiDifficulty } from './enums/ai-difficulty'
import { AiProfile } from './enums/ai-profile'
import { Candidate, generateCandidates } from './services/action-generator'
import {
  Factors,
  scoreFactors,
  ScoringContext,
  weightedScore,
} from './services/action-scorer'
import { normalizeScores, sampleAction } from './services/action-sampler'
import { PlayerLog } from './services/player-log'

const other = (side: BattleSide) =>
  side === BattleSide.PLAYER ? BattleSide.OPPONENT : BattleSide.PLAYER

/** Sal da seed da IA por lado: a IA tem sorte própria, separada da do motor (`engine.md` 3.13). */
const AI_SEED_SALT: Record<BattleSide, number> = {
  PLAYER: 0x9e3779b9,
  OPPONENT: 0x85ebca6b,
}

/**
 * Rng da IA derivada da seed da batalha. O replay só reaplica as ações gravadas (não roda a IA), então a IA não pode
 * consumir a Rng do motor: isso desalinharia o replay. Continua determinística (D90).
 */
export function aiRng(seed: number, side: BattleSide): Rng {
  return new SeededRng((seed ^ AI_SEED_SALT[side]) >>> 0)
}

export interface MachineAiConfig {
  side: BattleSide
  profile: AiProfile
  difficulty: AiDifficulty
  /** `false` desliga a previsão (modelos internos da própria previsão e comparações no simulador). */
  planning?: boolean
}

/** Ação escolhida e o porquê (para o simulador e os testes). */
export interface AiDecision {
  payload: BattleActionPayload
  candidates: {
    payload: BattleActionPayload
    factors: Factors
    score: number
  }[]
}

/**
 * IA da máquina (D90, D103, `pvp_brief.md` 8 e 10, `engine.md` 3.13). Em cada turno: gera as ações legais, pontua pelos
 * fatores com os pesos do perfil (só os que o nível enxerga), normaliza (min-max), soma o bônus de proteção do log
 * do jogador, corta abaixo de 0,2 e sorteia com a temperatura do nível. Vê só o que o jogador vê e nunca ganha stat.
 */
export class MachineAi {
  private readonly log: PlayerLog

  constructor(
    private readonly config: MachineAiConfig,
    private readonly rng: Rng
  ) {
    this.log = new PlayerLog(config.side)
  }

  decide(engine: BattleEngine, actorRef: string): AiDecision {
    const rules = DIFFICULTY_RULES[this.config.difficulty]
    const weights = PROFILE_WEIGHTS[this.config.profile]
    this.log.update(engine)

    const candidates = generateCandidates(engine, actorRef)
    const context = this.context(engine, actorRef)
    const factors = candidates.map((c) => scoreFactors(engine, c, context))
    const normalized = normalizeScores(
      factors.map((f) => weightedScore(f, weights, rules.factors))
    )

    const focus = rules.logWindow > 0 ? this.log.focus(rules.logWindow) : null
    const scores = normalized.map((score, i) =>
      focus && protects(candidates[i], actorRef, focus.ref, engine)
        ? score + focus.bonus * rules.protectionScale
        : score
    )

    const chosen =
      rules.lookahead > 0 &&
      this.config.planning !== false &&
      candidates.length > 1 &&
      // só dá para simular a jogada de quem está na vez
      engine.currentRef === actorRef
        ? this.plan(engine, candidates, scores, rules)
        : sampleAction(scores, rules.temperature, this.rng)

    return {
      payload: candidates[chosen].payload,
      candidates: candidates.map((c, i) => ({
        payload: c.payload,
        factors: factors[i],
        score: scores[i],
      })),
    }
  }

  /**
   * Previsão (etapa 6, `engine.md` 3.13): testa as melhores ações numa cópia da batalha, deixa o inimigo responder
   * (e, com `depth` 2, joga mais uma vez) e escolhe pela nota do estado que sobra.
   */
  private plan(
    engine: BattleEngine,
    candidates: Candidate[],
    scores: number[],
    rules: DifficultyRules
  ): number {
    const depth = rules.lookahead
    const temperature = rules.temperature
    const best = Math.max(...scores)
    const shortlist = scores
      .map((score, index) => ({ score, index }))
      .filter(({ score }) => score >= SCORE_CUT || score >= best)
      .sort((a, b) => b.score - a.score)
      .slice(0, rules.lookaheadCandidates)
      .map(({ index }) => index)

    // ganho previsto: média de algumas simulações (sem loteria) menos o estado de agora
    const now = evaluateBattle(engine, this.config.side)
    const gains = shortlist.map((index) => {
      let total = 0
      for (let r = 0; r < rules.lookaheadRollouts; r++) {
        total += this.simulateLine(engine, candidates[index].payload, depth)
      }
      return total / rules.lookaheadRollouts - now
    })

    // jogada que falhou na cópia fica com o pior ganho (não quebra o sorteio)
    const finite = gains.filter(Number.isFinite)
    const floor = finite.length > 0 ? Math.min(...finite) - 1 : 0
    const final = shortlist.map(
      (index, i) =>
        scores[index] +
        LOOKAHEAD_WEIGHT * (Number.isFinite(gains[i]) ? gains[i] : floor)
    )

    return shortlist[
      sampleAction(normalizeScores(final), temperature, this.rng)
    ]
  }

  private simulateLine(
    engine: BattleEngine,
    payload: BattleActionPayload,
    depth: number
  ): number {
    const { side } = this.config
    const seed = this.rng.int(0, 0x7fffffff)
    const fork = engine.fork(new SeededRng(seed))
    if (fork.act(payload).isLeft()) return -Infinity

    // o inimigo responde com a melhor jogada imediata; nós jogamos como somos, sem nova previsão
    const enemy = new MachineAi(
      {
        side: other(side),
        profile: AiProfile.BALANCED,
        difficulty: AiDifficulty.GRANDMASTER,
        planning: false,
      },
      new SeededRng((seed ^ 0x5bd1e995) >>> 0)
    )
    const self = new MachineAi(
      { ...this.config, planning: false },
      new SeededRng((seed ^ 0x27d4eb2d) >>> 0)
    )

    // horizonte: as respostas do inimigo, mais `depth` jogadas nossas (com as respostas), até a vez seguinte
    let ownMoves = 0
    let steps = 0
    for (let turn = fork.nextTurn(); turn; turn = fork.nextTurn()) {
      if (++steps > LOOKAHEAD_MAX_ACTIONS) break
      if (turn.side === side) {
        if (ownMoves >= depth) break
        ownMoves += 1
      }
      const mover = turn.side === side ? self : enemy
      if (fork.act(mover.decide(fork, turn.ref).payload).isLeft()) break
    }

    return evaluateBattle(fork, side)
  }

  private context(engine: BattleEngine, actorRef: string): ScoringContext {
    const { side } = this.config
    const enemySide =
      side === BattleSide.PLAYER ? BattleSide.OPPONENT : BattleSide.PLAYER
    const threats = engine
      .aliveRefs(enemySide)
      .map((ref) => engine.unit(ref).stats)
      .map((s) => s[Stat.ATTACK] * s[Stat.SPEED])

    return {
      actorRef,
      side,
      maxThreat: Math.max(0, ...threats),
      situation: hpShare(engine, side) - hpShare(engine, enemySide),
      actorExposed: isExposed(engine, actorRef),
      strongSkillReady:
        DIFFICULTY_RULES[this.config.difficulty].remembersSkills &&
        this.log.strongSkillReady(engine),
    }
  }
}

/** HP% total vivo de um lado (sobre o HP máximo atual). */
function hpShare(engine: BattleEngine, side: BattleSide): number {
  const units = engine.aliveRefs(side).map((ref) => engine.unit(ref))
  const max = units.reduce((sum, u) => sum + u.maxHp, 0)

  return max > 0 ? units.reduce((sum, u) => sum + u.hp, 0) / max : 0
}

/** Alvo de corpo a corpo: primeiro vivo da linha ou com o status Exposto (11.2, 11.9). */
function isExposed(engine: BattleEngine, ref: string): boolean {
  const unit = engine.unit(ref)
  if (unit.isExposed) return true
  if (!unit.position) return false

  const row = unit.position.row
  const front = Math.min(
    ...engine
      .aliveRefs(unit.side)
      .map((r) => engine.unit(r).position)
      .filter((p) => p?.row === row)
      .map((p) => p!.column)
  )

  return unit.position.column === front
}

/** Ação que protege o personagem focado (10.2): cura, escudo ou buff nele, ele Defender, se mover ou trocar. */
function protects(
  candidate: Candidate,
  actorRef: string,
  focusRef: string,
  engine: BattleEngine
): boolean {
  const { payload, preview } = candidate

  if (payload.type === 'SWAP') {
    return actorRef === focusRef || payload.withRef === focusRef
  }
  if (payload.type === 'DEFEND' || payload.type === 'MOVE') {
    return actorRef === focusRef
  }

  const hit = preview?.hits.find((h) => h.ref === focusRef)
  if (!hit || engine.unit(hit.ref).side !== engine.unit(actorRef).side) {
    return false
  }

  return hit.effects.some(
    (e) =>
      e.type === 'HEAL' ||
      e.type === 'SHIELD' ||
      e.type === 'PROTECT' ||
      (e.type === 'STAT_MODIFIER' && e.percent > 0)
  )
}
