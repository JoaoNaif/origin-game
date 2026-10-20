import { SeededRng } from '@/core/rng/seeded-rng'
import { CLASS_BUDGET } from '@/domain/characters/enums/character-class'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { aiRng, MachineAi } from '@/domain/ai/machine-ai'
import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { BattleSide, MAX_ROUNDS } from '@/domain/combat/enums/battle-enums'
import { toSnapshotField } from '@/domain/combat/services/build-snapshot'
import { BattleActionPayload } from '@/domain/combat/value-objects/battle-action'
import {
  BattleSnapshot,
  SnapshotField,
} from '@/domain/combat/value-objects/battle-snapshot'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { writeFileSync } from 'node:fs'
import {
  autoFormation,
  DuelMember,
  makeDuelSnapshot,
  randomSquadKeys,
} from 'test/factories/make-duel-snapshot'
import { it, vi } from 'vitest'
import { generateCandidates } from '@/domain/ai/services/action-generator'

// BAL_AI_VALUES: JSON que sobrescreve constantes de ai-values (ex.: {"TURN_SHIFT_VALUE": 22})
vi.mock('@/domain/ai/ai-values', async (original) => {
  const mod = await original<typeof import('@/domain/ai/ai-values')>()
  return process.env.BAL_AI_VALUES
    ? { ...mod, ...JSON.parse(process.env.BAL_AI_VALUES) }
    : mod
})

// BAL_FLANK_POWER: multiplicador de Poder do flanco na referência (hoje 1,0, skills_brief.md 12.2)
vi.mock('@/domain/skills/services/skill-reference', async (original) => {
  const mod =
    await original<typeof import('@/domain/skills/services/skill-reference')>()
  const flank = Number(process.env.BAL_FLANK_POWER ?? 1)
  return {
    ...mod,
    skillReference: (input: Parameters<typeof mod.skillReference>[0]) => {
      const ref = mod.skillReference(input)
      return input.range === 'FLANK' && input.target === 'ENEMY'
        ? { ...ref, power: Math.round(ref.power * flank * 100) / 100 }
        : ref
    },
  }
})

// BAL_END_BY_DAMAGE=1: no fim forçado, vence quem causou mais dano em % do HP total do inimigo
vi.mock('@/domain/combat/services/battle-end', async (original) => {
  const mod =
    await original<typeof import('@/domain/combat/services/battle-end')>()
  if (process.env.BAL_END_BY_DAMAGE !== '1') return mod
  const share = (
    dealer: { damageDealt?: number },
    victim: { units: readonly { startingMaxHp: number }[] }
  ) =>
    (dealer.damageDealt ?? 0) /
    victim.units.reduce((sum, u) => sum + u.startingMaxHp, 0)
  return {
    ...mod,
    forcedEnd: (...args: Parameters<typeof mod.forcedEnd>) => {
      const [player, opponent] = args
      const difference = share(player, opponent) - share(opponent, player)
      if (Math.abs(difference) > 1e-9) {
        return {
          winner: difference > 0 ? 'PLAYER' : 'OPPONENT',
          reason: 'ROUND_LIMIT',
        } as const
      }
      return mod.forcedEnd(...args)
    },
  }
})

// BAL_D38=1: Defender só sem skill possível (D38), na IA e na squad que só segura
vi.mock('@/domain/ai/services/action-generator', async (original) => {
  const mod =
    await original<typeof import('@/domain/ai/services/action-generator')>()
  if (process.env.BAL_D38 !== '1') return mod
  return {
    ...mod,
    generateCandidates: (
      ...args: Parameters<typeof mod.generateCandidates>
    ) => {
      const all = mod.generateCandidates(...args)
      return all.some((c) => c.payload.type === 'SKILL')
        ? all.filter((c) => c.payload.type !== 'DEFEND')
        : all
    },
  }
})
import { loadSeedContent } from '../prisma/seed/content'

/**
 * Balanceamento do combate (`engine.md` 3.15). Rodar com `npm run balance`. Variáveis:
 * - `BAL_MODE`: `random` (padrão; squads sorteadas, estatística por personagem e classe) ou `turtle` (squad que só cura,
 *   protege e Defende contra as composições do seed);
 * - `BAL_BATTLES` (padrão 200), `BAL_FIRST_SEED` (padrão 1), `BAL_LEVEL` (padrão 58);
 * - `BAL_DIFFICULTY` (padrão MASTER) e `BAL_PROFILE` (padrão BALANCED) da IA;
 * - `BAL_OUT`: caminho de um JSON com os números brutos (para somar rodadas paralelas).
 */
const MODE = process.env.BAL_MODE ?? 'random'
const BATTLES = Number(process.env.BAL_BATTLES ?? 200)
const FIRST_SEED = Number(process.env.BAL_FIRST_SEED ?? 1)
const LEVEL = Number(process.env.BAL_LEVEL ?? 58)
const DIFFICULTY = (process.env.BAL_DIFFICULTY ?? 'MASTER') as AiDifficulty
const PROFILE = (process.env.BAL_PROFILE ?? 'BALANCED') as AiProfile

type Policy = (engine: BattleEngine, ref: string) => BattleActionPayload

/** Jogador que só segura: cura/escudo/recupera o aliado mais ferido, buff em si, senão Defende. */
const turtlePolicy: Policy = (engine, ref) => {
  const me = engine.unit(ref)
  const allies = engine.aliveRefs(me.side).map((r) => engine.unit(r))
  const hurt = [...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]

  for (const skill of engine.skillsOf(ref)) {
    if (!me.readySkills.includes(skill.key)) continue
    const supportive = skill.effects.some(
      (e) =>
        e.type === 'HEAL' ||
        e.type === 'SHIELD' ||
        e.type === 'RECOVER' ||
        (e.type === 'STAT_MODIFIER' && e.percent > 0)
    )
    if (!supportive || skill.target === SkillTarget.ENEMY) continue
    const target = skill.target === SkillTarget.SELF ? me : hurt
    const payload: BattleActionPayload = {
      type: 'SKILL',
      skillKey: skill.key,
      targetSide: me.side,
      target: target.position!,
    }
    if (engine.previewSkill(ref, payload).isRight()) return payload
  }

  if (process.env.BAL_D38 === '1') {
    const skill = generateCandidates(engine, ref).find(
      (c) => c.payload.type === 'SKILL'
    )
    if (skill) return skill.payload
  }

  return { type: 'DEFEND' }
}

interface CharacterStats {
  picks: number
  wins: number
  damage: number
  healing: number
  shield: number
  kills: number
  deaths: number
  actions: Record<string, number>
}

interface Totals {
  battles: number
  eliminations: number
  rounds: number
  actions: Record<string, number>
  /** Batalhas ao fim forçado vencidas pelo lado que causou menos dano (vitória por segurar). */
  timeoutWonByLessDamage: number
  /** Modo turtle: vitórias da squad que só segura. */
  turtleWins: number
  /** Modo turtle: vitórias no fim forçado com menos dano causado (cairiam com o critério de dano). */
  turtleWinsByLessDamage: number
  characters: Record<string, CharacterStats>
  /** Usos de cada skill (`modelo:skill`). */
  skills: Record<string, number>
}

const overrides = process.env.BAL_OVERRIDES
  ? JSON.parse(process.env.BAL_OVERRIDES)
  : {}
// orçamento por classe (experimento): a validação do modelo usa CLASS_BUDGET
Object.assign(CLASS_BUDGET, overrides.classBudgets ?? {})
const content = loadSeedContent(overrides)
const fields: SnapshotField[] = content.fields.map((f) => {
  const field = toSnapshotField(f, content.catalog.traits)
  if (field.isLeft()) throw field.value
  return field.value
})

const totals: Totals = {
  battles: 0,
  eliminations: 0,
  rounds: 0,
  actions: {},
  timeoutWonByLessDamage: 0,
  turtleWins: 0,
  turtleWinsByLessDamage: 0,
  characters: {},
  skills: {},
}

const bump = (record: Record<string, number>, key: string, by = 1) =>
  (record[key] = (record[key] ?? 0) + by)

function statsOf(key: string): CharacterStats {
  return (totals.characters[key] ??= {
    picks: 0,
    wins: 0,
    damage: 0,
    healing: 0,
    shield: 0,
    kills: 0,
    deaths: 0,
    actions: {},
  })
}

function play(
  snapshot: BattleSnapshot,
  seed: number,
  policies: Record<BattleSide, Policy>
) {
  const engine = new BattleEngine(snapshot, new SeededRng(seed))
  const keyOf = new Map(
    [...snapshot.player.units, ...snapshot.opponent.units].map((u) => [
      u.ref,
      u.templateKey,
    ])
  )
  const sideOf = (ref: string) => engine.unit(ref).side

  for (let turn = engine.nextTurn(); turn; turn = engine.nextTurn()) {
    const payload = policies[turn.side](engine, turn.ref)
    const result = engine.act(payload)
    if (result.isLeft()) throw result.value
    bump(totals.actions, payload.type)
    if (payload.type === 'SKILL') bump(totals.skills, payload.skillKey)
    bump(statsOf(keyOf.get(turn.ref)!).actions, payload.type)
  }

  const outcome = engine.outcome!
  const damageBySide: Record<BattleSide, number> = { PLAYER: 0, OPPONENT: 0 }
  const lastHitter = new Map<string, string>()

  for (const event of engine.events) {
    if (event.type === 'DAMAGE') {
      statsOf(keyOf.get(event.ref)!).damage += event.amount
      damageBySide[sideOf(event.ref)] += event.amount
      if (sideOf(event.ref) !== sideOf(event.targetRef))
        lastHitter.set(event.targetRef, event.ref)
    }
    if (event.type === 'HEAL')
      statsOf(keyOf.get(event.ref)!).healing += event.amount
    if (event.type === 'SHIELD')
      statsOf(keyOf.get(event.ref)!).shield += event.amount
    if (event.type === 'DEFEATED') {
      statsOf(keyOf.get(event.ref)!).deaths += 1
      const killer = lastHitter.get(event.ref)
      if (killer) statsOf(keyOf.get(killer)!).kills += 1
    }
  }

  for (const unit of [...snapshot.player.units, ...snapshot.opponent.units]) {
    const stats = statsOf(unit.templateKey)
    stats.picks += 1
    if (sideOf(unit.ref) === outcome.winner) stats.wins += 1
  }

  totals.battles += 1
  totals.rounds += Math.min(engine.round, MAX_ROUNDS)
  if (outcome.reason === 'ELIMINATION') totals.eliminations += 1
  else {
    const loser =
      outcome.winner === BattleSide.PLAYER
        ? BattleSide.OPPONENT
        : BattleSide.PLAYER
    if (damageBySide[outcome.winner] < damageBySide[loser]) {
      totals.timeoutWonByLessDamage += 1
      return { ...outcome, byLessDamage: true }
    }
  }

  return { ...outcome, byLessDamage: false }
}

function aiPolicy(side: BattleSide, seed: number, profile = PROFILE): Policy {
  const ai = new MachineAi(
    { side, profile, difficulty: DIFFICULTY },
    aiRng(seed, side)
  )
  return (engine, ref) => ai.decide(engine, ref).payload
}

const fieldFor = (seed: number) => ({
  initial: fields[Math.floor((seed - 1) / 2) % fields.length],
  catalog: fields,
})

const pct = (a: number, b: number) =>
  b > 0 ? `${Math.round((100 * a) / b)}%` : '-'
const avg = (a: number, b: number) => (b > 0 ? (a / b).toFixed(0) : '-')

function report() {
  const t = totals
  const totalActions = Object.values(t.actions).reduce((a, b) => a + b, 0)
  const lines = [
    `modo ${MODE}, ${t.battles} batalhas, nível ${LEVEL}, IA ${PROFILE} ${DIFFICULTY}`,
    `eliminação ${pct(t.eliminations, t.battles)} | rodada média ${(t.rounds / t.battles).toFixed(1)} | ` +
      `fim forçado vencido por quem bateu menos: ${t.timeoutWonByLessDamage} de ${t.battles - t.eliminations}`,
    `ações: ${Object.entries(t.actions)
      .map(([k, v]) => `${k} ${pct(v, totalActions)}`)
      .join(', ')}`,
  ]
  if (MODE === 'turtle') {
    lines.push(
      `squad que só segura venceu ${t.turtleWins} de ${t.battles} (${pct(t.turtleWins, t.battles)})`
    )
  }

  lines.push(
    '',
    '| Personagem | Classe | Vitória | Dano/batalha | Cura+escudo/batalha | Abates | Mortes | Defender |',
    '|---|---|---|---|---|---|---|---|'
  )
  const classOf = (key: string) =>
    content.characters.find((c) => c.spec.key === key)?.template
      .characterClass ?? '?'
  const rows = Object.entries(t.characters).sort(
    (a, b) => b[1].wins / b[1].picks - a[1].wins / a[1].picks
  )
  for (const [key, s] of rows) {
    const acts = Object.values(s.actions).reduce((a, b) => a + b, 0)
    lines.push(
      `| ${key} | ${classOf(key)} | ${pct(s.wins, s.picks)} | ${avg(s.damage, s.picks)} | ` +
        `${avg(s.healing + s.shield, s.picks)} | ${(s.kills / s.picks).toFixed(2)} | ` +
        `${(s.deaths / s.picks).toFixed(2)} | ${pct(s.actions.DEFEND ?? 0, acts)} |`
    )
  }
  console.log('\n' + lines.join('\n') + '\n')
}

it(`balance ${MODE}`, { timeout: 0 }, async () => {
  if (MODE === 'turtle') {
    const turtle = autoFormation(content, [
      'gaia',
      'tank-valen',
      'kara',
      'derik-okoro',
    ])
    const opponents = content.npcSquads
      .filter((s) => s.difficulty === 'ADVANCED')
      .map((s) =>
        autoFormation(
          content,
          s.members.map(
            (m) =>
              content.characters.find((c) =>
                c.template.id.equals(m.templateId)
              )!.spec.key
          )
        )
      )

    for (let i = 0; i < BATTLES; i++) {
      const seed = FIRST_SEED + i
      const rival = opponents[i % opponents.length]
      const turtleSide = i % 2 === 0 ? BattleSide.PLAYER : BattleSide.OPPONENT
      const [player, opponent]: DuelMember[][] =
        turtleSide === BattleSide.PLAYER ? [turtle, rival] : [rival, turtle]
      const snapshot = makeDuelSnapshot(
        content,
        player,
        opponent,
        LEVEL,
        fieldFor(seed)
      )
      const other =
        turtleSide === BattleSide.PLAYER
          ? BattleSide.OPPONENT
          : BattleSide.PLAYER
      const outcome = play(snapshot, seed, {
        [turtleSide]: turtlePolicy,
        [other]: aiPolicy(other, seed),
      } as Record<BattleSide, Policy>)
      if (outcome.winner === turtleSide) {
        totals.turtleWins += 1
        if (outcome.byLessDamage) totals.turtleWinsByLessDamage += 1
      }
      await new Promise((resolve) => setImmediate(resolve))
    }
  } else {
    // pares de batalhas com as mesmas duas squads, trocando de lado
    for (let i = 0; i < BATTLES; i += 2) {
      const seed = FIRST_SEED + i
      const draw = new SeededRng(seed * 7919)
      const a = autoFormation(content, randomSquadKeys(content, draw))
      const b = autoFormation(content, randomSquadKeys(content, draw))
      for (const [k, [player, opponent]] of [
        [a, b],
        [b, a],
      ].entries()) {
        const s = seed + k
        play(
          makeDuelSnapshot(content, player, opponent, LEVEL, fieldFor(s)),
          s,
          {
            PLAYER: aiPolicy(BattleSide.PLAYER, s),
            OPPONENT: aiPolicy(BattleSide.OPPONENT, s),
          }
        )
      }
      await new Promise((resolve) => setImmediate(resolve))
    }
  }

  if (process.env.BAL_OUT)
    writeFileSync(process.env.BAL_OUT, JSON.stringify(totals))
  report()
})
