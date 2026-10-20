import { Stat } from '@/domain/characters/enums/stat'
import { BattleSide } from '@/domain/combat/enums/battle-enums'
import {
  BattleEngine,
  PreviewHit,
  SkillPreview,
} from '@/domain/combat/engine/battle-engine'
import { qualifies } from '@/domain/combat/services/field-draw'
import { SnapshotField } from '@/domain/combat/value-objects/battle-snapshot'
import {
  AiFactor,
  DEFEND_VALUE,
  FactorWeights,
  HP_EQUIVALENT_SCALE,
  LOW_HP_THRESHOLD,
  MODIFIER_VALUE_PER_PERCENT,
  MOVE_VALUE,
  STATUS_VALUE,
  STRONG_SKILL_RISK,
  TURN_SHIFT_VALUE,
} from '../ai-values'
import { Candidate } from './action-generator'

export type Factors = Record<AiFactor, number>

/** O que vale para todas as ações do turno. */
export interface ScoringContext {
  actorRef: string
  side: BattleSide
  /** Maior Ataque × Velocidade entre os inimigos vivos (base da Ameaça). */
  maxThreat: number
  /** `s` = HP% total aliado − HP% total inimigo, de −1 a 1 (Situação). */
  situation: number
  /** A unidade da vez é alvo de corpo a corpo (frente da linha ou Exposto). */
  actorExposed: boolean
  /** Mestre e Grão-mestre: uma skill forte conhecida do jogador está pronta (10.2). */
  strongSkillReady: boolean
}

const cap = (value: number) => Math.min(1, Math.max(0, value))
const toFactor = (hpEquivalent: number) =>
  cap(hpEquivalent / HP_EQUIVALENT_SCALE)

/**
 * Fatores de uma ação candidata (D103, `pvp_brief.md` 10.1), cada um de 0 a 1 em "% de HP equivalente ÷ 25". O Risco
 * vai de 0 a pouco mais de 1 e subtrai na nota.
 */
export function scoreFactors(
  engine: BattleEngine,
  candidate: Candidate,
  context: ScoringContext
): Factors {
  const actor = engine.unit(context.actorRef)
  const { payload, preview } = candidate

  let damage = 0
  let kill = 0
  let threat = 0
  let support = 0
  let offensive = false

  if (preview) {
    for (const hit of preview.hits) {
      const target = engine.unit(hit.ref)
      if (target.side !== context.side) {
        const hostile = hostileValue(engine, hit, context)
        damage += hostile.damage
        kill += hostile.kill
        threat = Math.max(threat, hostile.threat)
        support += hostile.support
        offensive = true
      } else {
        support += allyValue(engine, hit)
      }
    }
    support += selfValue(preview)
    support += fieldValue(engine, preview, payload, context.side)
  } else if (payload.type === 'DEFEND') {
    support = DEFEND_VALUE
  } else {
    support = MOVE_VALUE
  }

  const desgasteRisk =
    preview && preview.desgaste.cost > 0
      ? preview.desgaste.slack > 0
        ? Math.min(1, preview.desgaste.cost / preview.desgaste.slack)
        : 1
      : 0
  const hpShare = actor.hp / actor.maxHp
  const lowHpRisk =
    offensive && hpShare < LOW_HP_THRESHOLD
      ? (LOW_HP_THRESHOLD - hpShare) / LOW_HP_THRESHOLD
      : 0
  const staysExposed = payload.type === 'SKILL'
  const strongSkillRisk =
    context.strongSkillReady && context.actorExposed && staysExposed
      ? STRONG_SKILL_RISK
      : 0

  const factors = {
    DAMAGE: toFactor(damage),
    KILL: cap(kill),
    THREAT: cap(threat),
    RISK: 0.5 * desgasteRisk + 0.5 * lowHpRisk + strongSkillRisk,
    SUPPORT: toFactor(support),
    SITUATION: 0,
  }
  factors.SITUATION =
    context.situation * factors.KILL - context.situation * factors.SUPPORT

  return factors
}

/** Nota = soma ponderada pelo perfil, só dos fatores que o nível enxerga; o Risco subtrai (8.1). */
export function weightedScore(
  factors: Factors,
  weights: FactorWeights,
  visible: readonly AiFactor[]
): number {
  return visible.reduce((total, factor) => {
    const value = weights[factor] * factors[factor]
    return factor === AiFactor.RISK ? total - value : total + value
  }, 0)
}

/** Dano, abate e ameaça num inimigo; status, debuffs, atraso e reposicionamento entram em apoio. */
function hostileValue(
  engine: BattleEngine,
  hit: PreviewHit,
  context: ScoringContext
) {
  const target = engine.unit(hit.ref)
  const life = target.hp + target.shield
  let amount = 0
  let support = 0

  for (const effect of hit.effects) {
    switch (effect.type) {
      case 'DAMAGE':
        amount += effect.amount
        break
      case 'APPLY_STATUS':
        support += effect.chance * STATUS_VALUE[effect.status]
        break
      case 'STAT_MODIFIER':
        if (effect.percent < 0) {
          support += -effect.percent * MODIFIER_VALUE_PER_PERCENT
        }
        break
      case 'TURN_SHIFT':
        if (effect.percent < 0) {
          support += (-effect.percent / 100) * TURN_SHIFT_VALUE
        }
        break
      case 'REPOSITION':
        support += effect.chance * MOVE_VALUE
        break
    }
  }

  const expected = hit.hitChance * Math.min(amount, life)
  const threatValue =
    context.maxThreat > 0
      ? (target.stats[Stat.ATTACK] * target.stats[Stat.SPEED]) /
        context.maxThreat
      : 0

  return {
    damage: (expected / target.maxHp) * 100,
    kill: life > 0 ? (expected / life) ** 2 : 0,
    threat: amount > 0 || support > 0 ? hit.hitChance * threatValue : 0,
    support: hit.hitChance * support,
  }
}

/** Cura e escudo (×(1 + o que falta de vida)), buff e adiantar a vez num aliado. */
function allyValue(engine: BattleEngine, hit: PreviewHit): number {
  const target = engine.unit(hit.ref)
  const missing = 1 - target.hp / target.maxHp
  let value = 0

  for (const effect of hit.effects) {
    switch (effect.type) {
      case 'HEAL': {
        const healed = Math.min(effect.amount, target.maxHp - target.hp)
        value += (healed / target.maxHp) * 100 * (1 + missing)
        break
      }
      case 'SHIELD':
        value += (effect.amount / target.maxHp) * 100 * (1 + missing)
        break
      case 'STAT_MODIFIER':
        if (effect.percent > 0) {
          value += effect.percent * MODIFIER_VALUE_PER_PERCENT
        }
        break
      case 'TURN_SHIFT':
        if (effect.percent > 0) {
          value += (effect.percent / 100) * TURN_SHIFT_VALUE
        }
        break
      case 'REPOSITION':
        value += MOVE_VALUE
        break
      case 'RECOVER':
        // fração aliviada em pontos percentuais de stat, como os buffs (D120)
        value += effect.relieved * 100 * MODIFIER_VALUE_PER_PERCENT
        break
    }
  }

  return value
}

/** Efeitos em quem usa (ex.: golpe que dá buff no próprio usuário). */
function selfValue(preview: SkillPreview): number {
  return preview.skill.effects.reduce((value, effect) => {
    if (effect.appliesTo !== 'SELF') return value
    if (effect.type === 'STAT_MODIFIER' && effect.percent > 0) {
      return (
        value + effect.percent * preview.potency * MODIFIER_VALUE_PER_PERCENT
      )
    }
    if (effect.type === 'TURN_SHIFT' && effect.percent > 0) {
      return value + (effect.percent / 100) * TURN_SHIFT_VALUE
    }
    if (effect.type === 'REPOSITION' && effect.kind === 'DASH') {
      return value + MOVE_VALUE
    }
    return value
  }, 0)
}

/**
 * Trocar o campo: quanto o bônus muda para cada lado (aliados somam, inimigos subtraem), com o mesmo valor por ponto
 * percentual dos buffs.
 */
function fieldValue(
  engine: BattleEngine,
  preview: SkillPreview,
  payload: Candidate['payload'],
  side: BattleSide
): number {
  const change = preview.skill.effects.find((e) => e.type === 'CHANGE_FIELD')
  if (!change || payload.type !== 'SKILL' || !payload.fieldKey) return 0

  const next = engine.fields.find((f) => f.key === payload.fieldKey)
  const currentKey = engine.activeField.key
  const current = engine.fields.find((f) => f.key === currentKey) ?? null
  const bonus = (field: SnapshotField | null, traitKeys: string[], m = 1) =>
    field && qualifies(field, traitKeys)
      ? (field.primaryPercent + field.secondaryPercent) * m
      : 0

  let total = 0
  for (const s of [BattleSide.PLAYER, BattleSide.OPPONENT]) {
    for (const ref of engine.aliveRefs(s)) {
      const { traitKeys } = engine.unit(ref)
      const gain =
        bonus(next ?? null, traitKeys, change.multiplier) -
        bonus(current, traitKeys)
      total += s === side ? gain : -gain
    }
  }

  return Math.max(0, total * MODIFIER_VALUE_PER_PERCENT)
}
