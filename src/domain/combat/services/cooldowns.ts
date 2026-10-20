import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'
import { STATUS_RULES } from './conditions'

/** O que a recarga precisa saber de cada skill da build. */
export interface CooldownSkill {
  key: string
  tier: SkillTier
  cooldown: number
  effects: readonly SkillEffect[]
}

const TIER_RANK: Record<SkillTier, number> = {
  BASIC: 0,
  STANDARD: 1,
  REINFORCED: 2,
  STRONG: 3,
  FINAL: 4,
}

/** Poder principal da skill (dano, cura ou escudo); 0 se ela não tem. */
function mainPower(skill: CooldownSkill): number {
  return Math.max(0, ...skill.effects.map((e) => ('power' in e ? e.power : 0)))
}

/**
 * Recargas da build de uma unidade (D92, 8.2). Contam em **turnos do próprio personagem**: recarga N = a skill fica
 * fora dos próximos N turnos dele. Baixam no fim de cada turno dele, menos a skill usada naquele turno.
 */
export class SkillCooldowns {
  private readonly remaining = new Map<string, number>()
  private readonly usedThisTurn = new Set<string>()

  /** `skills` na ordem dos slots da build. */
  constructor(private readonly skills: readonly CooldownSkill[]) {
    for (const skill of skills) this.remaining.set(skill.key, 0)
  }

  turnsLeft(key: string): number {
    return this.remaining.get(key) ?? 0
  }

  isReady(key: string): boolean {
    return this.turnsLeft(key) === 0
  }

  /** Skills prontas, na ordem da build. */
  ready(): CooldownSkill[] {
    return this.skills.filter((s) => this.isReady(s.key))
  }

  /** Usa a skill: entra na recarga dela. */
  use(key: string) {
    const skill = this.find(key)
    this.remaining.set(key, skill.cooldown)
    this.usedThisTurn.add(key)
  }

  /** Reduz a recarga das skills que estão recarregando (passiva, ex.: Lucky, D83). Nunca abaixo de 0. */
  reduce(amount: number) {
    for (const [key, turns] of this.remaining) {
      if (turns > 0) this.remaining.set(key, Math.max(0, turns - amount))
    }
  }

  /** Fim do turno da unidade: baixa 1 de todas, menos as usadas agora. */
  endTurn() {
    for (const [key, turns] of this.remaining) {
      if (turns > 0 && !this.usedThisTurn.has(key)) {
        this.remaining.set(key, turns - 1)
      }
    }
    this.usedThisTurn.clear()
  }

  /**
   * Travado (D110): **+2 de recarga na skill mais forte que está pronta** (maior tipo; empate: maior Poder; empate: a
   * primeira da build). Se nenhuma está pronta, trava a que ficaria pronta primeiro. Devolve a `key` travada.
   */
  lock(): string {
    const target = strongest(this.ready()) ?? soonestReady(this.skills, this)
    const extra = STATUS_RULES.LOCK.extraCooldown

    this.remaining.set(target.key, this.turnsLeft(target.key) + extra)

    return target.key
  }

  private find(key: string): CooldownSkill {
    const skill = this.skills.find((s) => s.key === key)
    if (!skill)
      throw new Error(`SkillCooldowns: skill ${key} não está na build`)

    return skill
  }
}

function strongest(skills: CooldownSkill[]): CooldownSkill | undefined {
  return skills.reduce<CooldownSkill | undefined>((best, skill) => {
    if (!best) return skill

    const byTier = TIER_RANK[skill.tier] - TIER_RANK[best.tier]
    if (byTier !== 0) return byTier > 0 ? skill : best

    return mainPower(skill) > mainPower(best) ? skill : best
  }, undefined)
}

function soonestReady(
  skills: readonly CooldownSkill[],
  cooldowns: SkillCooldowns
): CooldownSkill {
  const minTurns = Math.min(...skills.map((s) => cooldowns.turnsLeft(s.key)))

  return strongest(
    skills.filter((s) => cooldowns.turnsLeft(s.key) === minTurns)
  )!
}
