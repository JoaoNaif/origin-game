import { Stat } from '@/domain/characters/enums/stat'
import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { BattleSide } from '@/domain/combat/enums/battle-enums'
import { StatusType } from '@/domain/skills/enums/status-type'

/** Vitória ou derrota na simulação vale mais que qualquer diferença de vida. */
export const OUTCOME_VALUE = 100

/** Valor de um personagem vivo, mesmo sem vida cheia (perder uma peça pesa mais que perder vida). */
export const ALIVE_VALUE = 0.5

/** Quanto a ameaça (Ataque × Velocidade) soma ao valor de uma peça, no máximo. */
export const THREAT_WORTH = 0.5

/**
 * Quanto cada status tira do valor de quem está com ele (fração do valor da peça): perder a ação, ficar sem proteção,
 * ter o golpe preso ao provocador, sofrer mais dano ou perder vida por turno.
 */
export const STATUS_PENALTY: Partial<Record<StatusType, number>> = {
  STUN: 0.3,
  ROOT: 0.08,
  TAUNT: 0.1,
  MARK: 0.1,
  EXPOSE: 0.08,
  DOT: 0.08,
}

/** Proteções: protegido por um aliado e coberto pela frente da linha (fração do valor da peça). */
export const PROTECTED_BONUS = 0.1
export const COVERED_BONUS = 0.05

/** Skills prontas: até este bônus (fração do valor da peça) com todas prontas. */
export const READY_SKILLS_BONUS = 0.1

/** Tempo: cada vez nas próximas `TEMPO_TURNS` da linha do tempo vale isto (em "peças"). */
export const TEMPO_VALUE = 0.1
export const TEMPO_TURNS = 4

const other = (side: BattleSide) =>
  side === BattleSide.PLAYER ? BattleSide.OPPONENT : BattleSide.PLAYER

/**
 * Nota do estado da batalha para um lado (etapa 6, `engine.md` 3.13), em "peças": o que o lado tem menos o que o
 * inimigo tem. Cada peça viva vale `(1 + 0,5 × ameaça) × (0,5 + 0,5 × vida%)`, menos o que os status tiram, mais
 * proteção, cobertura e skills prontas; e quem age nas próximas vezes ganha um pouco (tempo).
 */
export function evaluateBattle(engine: BattleEngine, side: BattleSide): number {
  if (engine.outcome) {
    return engine.outcome.winner === side ? OUTCOME_VALUE : -OUTCOME_VALUE
  }

  const threats = [BattleSide.PLAYER, BattleSide.OPPONENT]
    .flatMap((s) => engine.aliveRefs(s))
    .map((ref) => engine.unit(ref).stats)
    .map((s) => s[Stat.ATTACK] * s[Stat.SPEED])
  const maxThreat = Math.max(1, ...threats)

  const sideValue = (s: BattleSide) => {
    const units = engine.aliveRefs(s).map((ref) => engine.unit(ref))

    return units.reduce((sum, unit) => {
      const threat =
        (unit.stats[Stat.ATTACK] * unit.stats[Stat.SPEED]) / maxThreat
      const worth = 1 + THREAT_WORTH * threat
      const life = Math.min(1, (unit.hp + unit.shield) / unit.maxHp)
      const penalty = unit.statuses.reduce(
        (total, status) => total + (STATUS_PENALTY[status] ?? 0),
        0
      )
      const covered =
        unit.position !== null &&
        units.some(
          (u) =>
            u.position?.row === unit.position!.row &&
            u.position.column < unit.position!.column
        )
      const bonus =
        (unit.protectedBy ? PROTECTED_BONUS : 0) +
        (covered ? COVERED_BONUS : 0) +
        READY_SKILLS_BONUS * (unit.readySkills.length / unit.skillCount)

      return (
        sum +
        worth * (ALIVE_VALUE + (1 - ALIVE_VALUE) * life) * (1 - penalty + bonus)
      )
    }, 0)
  }

  const tempo = engine
    .timeline(TEMPO_TURNS)
    .reduce(
      (sum, t) =>
        sum + (engine.unit(t.ref).side === side ? TEMPO_VALUE : -TEMPO_VALUE),
      0
    )

  return sideValue(side) - sideValue(other(side)) + tempo
}
