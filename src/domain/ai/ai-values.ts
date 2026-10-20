import { StatusType } from '@/domain/skills/enums/status-type'
import { AiDifficulty } from './enums/ai-difficulty'
import { AiProfile } from './enums/ai-profile'

/** Fatores da nota (`pvp_brief.md` 8.1, 10.1). */
export const AiFactor = {
  DAMAGE: 'DAMAGE',
  KILL: 'KILL',
  THREAT: 'THREAT',
  RISK: 'RISK',
  SUPPORT: 'SUPPORT',
  SITUATION: 'SITUATION',
} as const

export type AiFactor = (typeof AiFactor)[keyof typeof AiFactor]

export type FactorWeights = Record<AiFactor, number>

/** Pesos dos perfis (D90, `pvp_brief.md` 8.1, placeholder). Risco subtrai; pela metade desde o D115; defesa/cura/status e dano ajustados no D118. */
export const PROFILE_WEIGHTS: Record<AiProfile, FactorWeights> = {
  AGGRESSIVE: {
    DAMAGE: 1.0,
    KILL: 0.8,
    THREAT: 0.5,
    RISK: 0.1,
    SUPPORT: 0.35,
    SITUATION: 0.3,
  },
  CAUTIOUS: {
    DAMAGE: 0.5,
    KILL: 0.5,
    THREAT: 0.5,
    RISK: 0.5,
    SUPPORT: 0.7,
    SITUATION: 0.6,
  },
  FINISHER: {
    DAMAGE: 0.8,
    KILL: 1.0,
    THREAT: 0.7,
    RISK: 0.2,
    SUPPORT: 0.5,
    SITUATION: 0.4,
  },
  BALANCED: {
    DAMAGE: 0.7,
    KILL: 0.7,
    THREAT: 0.6,
    RISK: 0.3,
    SUPPORT: 0.6,
    SITUATION: 0.6,
  },
}

export interface DifficultyRules {
  /** Temperatura do sorteio `p ∝ exp(nota / T)`; 0 = sempre a melhor. */
  temperature: number
  /** Fatores que o nível enxerga (os outros valem 0). */
  factors: readonly AiFactor[]
  /** Quantas ações do jogador o nível lê (0 = nenhuma). */
  logWindow: number
  /** Escala do bônus de proteção do log. */
  protectionScale: number
  /** Lembra as skills já usadas pelo jogador e o cooldown delas (10.2). */
  remembersSkills: boolean
}

/** Todos os níveis enxergam dano, abate e defesa/cura/status (D115). */
const BASIC: AiFactor[] = [AiFactor.DAMAGE, AiFactor.KILL, AiFactor.SUPPORT]
const ALL: AiFactor[] = Object.values(AiFactor)

/** Dificuldade (D90, D103, `pvp_brief.md` 8.1 e 10.2; temperaturas do D117, calibradas por simulação). Nunca dá bônus de stat. */
export const DIFFICULTY_RULES: Record<AiDifficulty, DifficultyRules> = {
  BEGINNER: {
    temperature: 0.6,
    factors: BASIC,
    logWindow: 0,
    protectionScale: 0,
    remembersSkills: false,
  },
  INTERMEDIATE: {
    temperature: 0.35,
    factors: [...BASIC, AiFactor.THREAT],
    logWindow: 1,
    protectionScale: 0.25,
    remembersSkills: false,
  },
  ADVANCED: {
    temperature: 0.18,
    factors: [...BASIC, AiFactor.THREAT, AiFactor.RISK],
    logWindow: 5,
    protectionScale: 0.5,
    remembersSkills: false,
  },
  MASTER: {
    temperature: 0.1,
    factors: ALL,
    logWindow: 5,
    protectionScale: 0.75,
    remembersSkills: true,
  },
  GRANDMASTER: {
    temperature: 0,
    factors: ALL,
    logWindow: 5,
    protectionScale: 1.0,
    remembersSkills: true,
  },
}

/** Cada fator vira "% de HP equivalente" ÷ 25 (≈ maior golpe único), teto 1 (10.1). */
export const HP_EQUIVALENT_SCALE = 25

/** Valor dos efeitos de apoio e controle em % de HP equivalente (10.1). */
export const STATUS_VALUE: Record<StatusType, number> = {
  STUN: 11,
  LOCK: 6,
  ROOT: 3,
  EXPOSE: 4,
  MARK: 5,
  DOT: 12,
}

/** Buff/debuff: 10/15/20% valem 3/4,5/6, ou seja, 0,3 por ponto percentual. */
export const MODIFIER_VALUE_PER_PERCENT = 0.3

/** Adiantar/atrasar a vez: X% × 11 (uma ação inteira vale 11). */
export const TURN_SHIFT_VALUE = 11

export const DEFEND_VALUE = 4
export const MOVE_VALUE = 2

/** Abaixo deste HP, ação ofensiva conta como risco (sobe em linha até 1 com HP zero). */
export const LOW_HP_THRESHOLD = 0.5

/** Corte: nota' abaixo disto nunca é sorteada, em nenhum nível (10.1). */
export const SCORE_CUT = 0.2

/** Pesos das últimas 5 ações do jogador, da mais recente para a mais antiga (10.2). */
export const LOG_WEIGHTS = [1.0, 0.8, 0.6, 0.4, 0.2] as const

/** Bônus de proteção ao personagem focado: 2 ataques seguidos (indício) e 3 (padrão), antes da escala (10.2). */
export const PROTECTION_BONUS = { HINT: 0.15, PATTERN: 0.3 } as const

/** Mestre e Grão-mestre: skill forte do jogador de volta do cooldown sobe o risco do exposto (10.2). */
export const STRONG_SKILL_RISK = 0.1
