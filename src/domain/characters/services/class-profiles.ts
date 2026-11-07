import { CharacterClass } from '../enums/character-class'
import { Stat } from '../enums/stat'
import { StatBlock } from '../value-objects/stat-block'

/** Perfis das classes no nível 100 (`classes_brief.md` 2, D142, D144): o ponto de partida dos modelos. */
export const CLASS_PROFILES: Record<CharacterClass, StatBlock> = {
  VANGUARD: {
    HP: 700,
    ATTACK: 105,
    DEFENSE: 120,
    SPEED: 80,
    PRECISION: 100,
    EVASION: 55,
    WILL: 95,
  },
  MARKSMAN: {
    HP: 420,
    ATTACK: 105,
    DEFENSE: 60,
    SPEED: 85,
    PRECISION: 125,
    EVASION: 90,
    WILL: 85,
  },
  EXECUTOR: {
    HP: 460,
    ATTACK: 115,
    DEFENSE: 65,
    SPEED: 100,
    PRECISION: 105,
    EVASION: 85,
    WILL: 55,
  },
  CONTROLLER: {
    HP: 580,
    ATTACK: 100,
    DEFENSE: 85,
    SPEED: 90,
    PRECISION: 115,
    EVASION: 75,
    WILL: 110,
  },
  SUPPORT: {
    HP: 500,
    ATTACK: 80,
    DEFENSE: 80,
    SPEED: 105,
    PRECISION: 85,
    EVASION: 100,
    WILL: 130,
  },
  ARTILLERY: {
    HP: 500,
    ATTACK: 115,
    DEFENSE: 70,
    SPEED: 65,
    PRECISION: 110,
    EVASION: 65,
    WILL: 90,
  },
  GUARDIAN: {
    HP: 780,
    ATTACK: 70,
    DEFENSE: 140,
    SPEED: 80,
    PRECISION: 85,
    EVASION: 50,
    WILL: 115,
  },
  TACTICIAN: {
    HP: 630,
    ATTACK: 105,
    DEFENSE: 75,
    SPEED: 110,
    PRECISION: 105,
    EVASION: 90,
    WILL: 95,
  },
}

/**
 * Média de cada stat nos perfis das 8 classes: a régua de "stat alto" e "stat baixo" (D151), que põe o HP (~570) e o
 * Ataque (~100) na mesma escala.
 */
export const CLASS_STAT_MEAN: StatBlock = Object.fromEntries(
  Object.values(Stat).map((stat) => {
    const profiles = Object.values(CLASS_PROFILES)
    return [
      stat,
      profiles.reduce((sum, p) => sum + p[stat], 0) / profiles.length,
    ]
  })
) as StatBlock
