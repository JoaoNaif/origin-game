import { SkillRange } from '@/domain/skills/enums/skill-range'
import { Stat } from '../enums/stat'

/**
 * Efeito de um traço. Guardado como item da lista JSON `effects` (sem tabela própria: é valor, não entidade).
 * Novo tipo de efeito = nova linha aqui, sem migração de banco.
 */
export type TraitEffect =
  | { type: 'STAT_MODIFIER'; stat: Stat; percent: number }
  | { type: 'SKILL_DAMAGE_MODIFIER'; range: SkillRange; percent: number }
  | { type: 'LINEAGE_COST_MODIFIER'; percent: number }
  | { type: 'GEAR_REQUIREMENT_WAIVER'; count: number }
  | { type: 'EXTRA_BEAST_SLOT'; count: number }

export type TraitEffectType = TraitEffect['type']
