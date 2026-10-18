import { Skill } from '@/domain/skills/entities/skill'
import { CharacterSkillSource } from '../enums/character-skill-source'

/** Skill aprendida pelo personagem (linha de `CharacterSkill`). */
export interface LearnedSkill {
  skill: Skill
  source: CharacterSkillSource
  /** Aprimorada (+15% de Poder, D100). Um aprimoramento só por skill (D80). */
  isEnhanced: boolean
  /** Posição na build de batalha (1 a 4); nulo = guardada. */
  buildSlot: number | null
}
