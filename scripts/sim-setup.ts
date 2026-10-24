import { CLASS_BUDGET } from '@/domain/characters/enums/character-class'
import { DIFFICULTY_RULES, PROFILE_WEIGHTS } from '@/domain/ai/ai-values'
import {
  CLASS_MARKS,
  FORMATION_STAT_AURA,
} from '@/domain/combat/engine/battle-engine'
import { vi } from 'vitest'

/**
 * Ajustes experimentais das simulações (`npm run simulate` e `npm run balance`, `engine.md` 3.15): testam valores e
 * regras sem mudar o código. Todos desligados por padrão.
 *
 * - `BAL_OVERRIDES`: JSON do conteúdo (`ContentOverrides` do seed, mais `classBudgets`);
 * - `BAL_AI_VALUES`: JSON com constantes de `ai-values`;
 * - `BAL_FLANK_POWER`: multiplicador de Poder do flanco;
 * - `BAL_END_BY_DAMAGE=1`: fim forçado por dano causado;
 * - `BAL_D38=1`: a IA só Defende sem skill possível.
 */

// conteúdo do seed com os ajustes (e o orçamento por classe que a validação do modelo usa)
vi.mock('../prisma/seed/content', async (original) => {
  const mod = await original<typeof import('../prisma/seed/content')>()
  const overrides = process.env.BAL_OVERRIDES
    ? JSON.parse(process.env.BAL_OVERRIDES)
    : {}
  Object.assign(CLASS_BUDGET, overrides.classBudgets ?? {})
  return {
    ...mod,
    loadSeedContent: (explicit?: Parameters<typeof mod.loadSeedContent>[0]) =>
      mod.loadSeedContent(explicit ?? overrides),
  }
})

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

// SIM_OVERRIDES: JSON com regras de nível e pesos de perfil da IA (também lido por calibrate.sim.ts)
if (process.env.SIM_OVERRIDES) {
  const overrides = JSON.parse(process.env.SIM_OVERRIDES)
  for (const [level, rules] of Object.entries(overrides.difficulty ?? {})) {
    Object.assign(
      DIFFICULTY_RULES[level as keyof typeof DIFFICULTY_RULES],
      rules
    )
  }
  for (const [profile, weights] of Object.entries(overrides.profiles ?? {})) {
    Object.assign(
      PROFILE_WEIGHTS[profile as keyof typeof PROFILE_WEIGHTS],
      weights
    )
  }
}

// BAL_HP_MULT: multiplica o HP de todos (tempo para matar); BAL_DAMAGE_MULT: multiplica o dano base de todos
vi.mock('@/domain/characters/services/stat-calculator', async (original) => {
  const mod =
    await original<
      typeof import('@/domain/characters/services/stat-calculator')
    >()
  const mult = Number(process.env.BAL_HP_MULT ?? 1)
  if (mult === 1) return mod
  return {
    ...mod,
    computeStats: (...args: Parameters<typeof mod.computeStats>) => {
      const stats = mod.computeStats(...args)
      return { ...stats, HP: Math.round(stats.HP * mult) }
    },
  }
})
vi.mock('@/domain/combat/services/damage', async (original) => {
  const mod = await original<typeof import('@/domain/combat/services/damage')>()
  const mult = Number(process.env.BAL_DAMAGE_MULT ?? 1)
  if (mult === 1) return mod
  return {
    ...mod,
    baseDamage: (...args: Parameters<typeof mod.baseDamage>) =>
      mod.baseDamage(...args) * mult,
  }
})

// BAL_AURAS: JSON que troca auras de formação por classe (ex.: {"TACTICIAN":{"stat":"SPEED","percent":10}})
if (process.env.BAL_AURAS) {
  Object.assign(FORMATION_STAT_AURA, JSON.parse(process.env.BAL_AURAS))
}

// BAL_MARKS: JSON que troca marcas de classe (ex.: {"coordinationAttackPercent":20,"controllerWillFactor":0.5})
if (process.env.BAL_MARKS) {
  Object.assign(CLASS_MARKS, JSON.parse(process.env.BAL_MARKS))
}
