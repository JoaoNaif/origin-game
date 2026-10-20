import { Stat } from '@/domain/characters/enums/stat'
import { StatusType } from '../enums/status-type'

/** A quem o efeito se aplica: aos alvos da skill (padrão) ou a quem a usou. */
export type EffectRecipient = 'TARGET' | 'SELF'

interface EffectBase {
  appliesTo?: EffectRecipient
}

/**
 * Efeito de skill, item da lista JSON `effects` (sem tabela: é valor, não entidade).
 * `power` em HEAL/SHIELD: 1,0 = 10% do HP máximo do alvo (D92).
 */
export type SkillEffect = EffectBase &
  (
    | { type: 'DAMAGE'; power: number }
    | { type: 'HEAL'; power: number }
    | { type: 'SHIELD'; power: number }
    | { type: 'STAT_MODIFIER'; stat: Stat; percent: number; duration: number }
    | {
        type: 'APPLY_STATUS'
        status: StatusType
        duration: number
        baseChance: number
      }
    | {
        type: 'REPOSITION'
        kind: 'PUSH' | 'PULL' | 'SWAP' | 'MOVE_ALLY' | 'DASH'
      }
    | { type: 'TURN_SHIFT'; percent: number }
    | { type: 'CHANGE_FIELD'; duration: number; multiplier: number }
    /** Skill de recuperação (9.4b, D120): alivia 50% do Desgaste acumulado, incluindo o HP máximo da Fundamental. */
    | { type: 'RECOVER' }
  )

export type SkillEffectType = SkillEffect['type']
