import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { DangerLevel } from '@/domain/characters/enums/danger-level'
import { Exclusivity } from '@/domain/characters/enums/exclusivity'
import { Rarity } from '@/domain/characters/enums/rarity'
import { Stat } from '@/domain/characters/enums/stat'
import { Passive } from '@/domain/characters/value-objects/passive'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { STATUS_RULES } from '@/domain/combat/services/conditions'
import { Skill } from '@/domain/skills/entities/skill'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillKitSlot } from '@/domain/skills/enums/skill-kit-slot'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { StatusType } from '@/domain/skills/enums/status-type'
import { skillReference } from '@/domain/skills/services/skill-reference'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'
import { unwrap } from './catalog'

// ---------------------------------------------------------------------------
// Perfis das classes no nível 100 (`classes_brief.md` 2)
// ---------------------------------------------------------------------------

const CLASS_PROFILE: Record<CharacterClass, StatBlock> = {
  VANGUARD: {
    HP: 700,
    ATTACK: 100,
    DEFENSE: 120,
    SPEED: 75,
    PRECISION: 85,
    EVASION: 55,
    WILL: 95,
  },
  MARKSMAN: {
    HP: 420,
    ATTACK: 125,
    DEFENSE: 60,
    SPEED: 95,
    PRECISION: 125,
    EVASION: 90,
    WILL: 85,
  },
  EXECUTOR: {
    HP: 400,
    ATTACK: 140,
    DEFENSE: 55,
    SPEED: 115,
    PRECISION: 110,
    EVASION: 115,
    WILL: 55,
  },
  CONTROLLER: {
    HP: 520,
    ATTACK: 80,
    DEFENSE: 85,
    SPEED: 90,
    PRECISION: 115,
    EVASION: 75,
    WILL: 125,
  },
  SUPPORT: {
    HP: 500,
    ATTACK: 70,
    DEFENSE: 80,
    SPEED: 105,
    PRECISION: 85,
    EVASION: 100,
    WILL: 130,
  },
  ARTILLERY: {
    HP: 500,
    ATTACK: 140,
    DEFENSE: 70,
    SPEED: 65,
    PRECISION: 110,
    EVASION: 65,
    WILL: 90,
  },
  GUARDIAN: {
    HP: 780,
    ATTACK: 60,
    DEFENSE: 140,
    SPEED: 70,
    PRECISION: 70,
    EVASION: 50,
    WILL: 115,
  },
  TACTICIAN: {
    HP: 480,
    ATTACK: 75,
    DEFENSE: 75,
    SPEED: 110,
    PRECISION: 105,
    EVASION: 90,
    WILL: 120,
  },
}

// ---------------------------------------------------------------------------
// Efeitos (o Poder vem da referência do tipo + forma, `skillReference`)
// ---------------------------------------------------------------------------

/** Recebe o Poder de referência da skill e devolve os efeitos. */
type Effects = (power: number) => SkillEffect[]

const r2 = (x: number) => Math.round(x * 100) / 100

/** Magnitude de buff/debuff por tipo (`skills_brief.md` 12.5: 10 / 15 / 20%). */
const MODIFIER_BY_TIER: Record<SkillTier, number> = {
  BASIC: 10,
  STANDARD: 10,
  REINFORCED: 15,
  STRONG: 20,
  FINAL: 20,
}

const damage =
  (multiplier = 1): Effects =>
  (power) => [{ type: 'DAMAGE', power: r2(power * multiplier) }]

const status = (s: StatusType): SkillEffect => ({
  type: 'APPLY_STATUS',
  status: s,
  duration:
    'duration' in STATUS_RULES[s]
      ? (STATUS_RULES[s] as { duration: number }).duration
      : 1,
  baseChance: STATUS_RULES[s].baseChance,
})

const modifier = (
  stat: Stat,
  percent: number,
  appliesTo?: 'SELF'
): SkillEffect => ({
  type: 'STAT_MODIFIER',
  stat,
  percent,
  duration: 2,
  ...(appliesTo ? { appliesTo } : {}),
})

/** Dano com efeito lateral (assinatura: ~0,8 do Poder + efeito pequeno, 12.6). */
const damageWith =
  (multiplier: number, ...extra: SkillEffect[]): Effects =>
  (power) => [{ type: 'DAMAGE', power: r2(power * multiplier) }, ...extra]

const heal: Effects = (power) => [{ type: 'HEAL', power }]
const shield: Effects = (power) => [{ type: 'SHIELD', power }]
const only =
  (...effects: SkillEffect[]): Effects =>
  () =>
    effects

// ---------------------------------------------------------------------------
// Personagens
// ---------------------------------------------------------------------------

interface SkillSpec {
  key: string
  name: string
  /** Chave da variante; nula = skill none. */
  variant: string | null
  tier: SkillTier
  /** Papel no kit básico (só Básica e Padrão, nível mínimo 0). */
  slot?: SkillKitSlot
  target?: SkillTarget
  range?: SkillRange
  area?: SkillArea
  effects: Effects
}

export interface CharacterSpec {
  key: string
  name: string
  description: string
  characterClass: CharacterClass
  rarity: Rarity
  danger: DangerLevel
  /** A primeira é a principal. */
  variants: string[]
  familyTrait?: string
  /** Traço conquistado que os NPCs desse modelo levam (liga com os campos). */
  npcTrait: string
  passive: Passive
  skills: SkillSpec[]
}

const { BASIC, STANDARD, REINFORCED, STRONG, FINAL } = SkillTier
const { MELEE, RANGED, FLANK, PIERCING } = SkillRange
const { ALLY, SELF } = SkillTarget
const { LINE, COLUMN, GRID } = SkillArea
const K = SkillKitSlot

export const CHARACTERS: CharacterSpec[] = [
  {
    key: 'ecko-nocthar',
    name: 'Ecko Nocthar',
    description:
      'Comandante. Controle absoluto por fora, instabilidade silenciosa por dentro. Lidera por inevitabilidade.',
    characterClass: CharacterClass.EXECUTOR,
    rarity: Rarity.SS,
    danger: DangerLevel.CHAOTIC,
    variants: ['antimateria'],
    familyTrait: 'nocthar',
    npcTrait: 'berserker',
    passive: {
      name: 'Aniquilação',
      description:
        'A antimatéria apaga a matéria: todo dano dele ignora escudos e bate na vida.',
      trigger: { type: 'ALWAYS' },
      effects: [{ type: 'IGNORE_SHIELD' }],
    },
    skills: [
      {
        key: 'toque-do-vazio',
        name: 'Toque do Vazio',
        variant: 'antimateria',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'corte-de-antimateria',
        name: 'Corte de Antimatéria',
        variant: 'antimateria',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'infiltracao',
        name: 'Infiltração',
        variant: 'antimateria',
        tier: STANDARD,
        slot: K.ROLE,
        range: FLANK,
        effects: damage(),
      },
      {
        key: 'apagar',
        name: 'Apagar',
        variant: 'antimateria',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
        effects: damageWith(0.8, status(StatusType.EXPOSE)),
      },
      {
        key: 'intangivel',
        name: 'Intangível',
        variant: 'antimateria',
        tier: REINFORCED,
        range: MELEE,
        effects: damageWith(0.9, modifier(Stat.EVASION, 15, 'SELF')),
      },
      {
        key: 'salto-de-aniquilacao',
        name: 'Salto de Aniquilação',
        variant: 'antimateria',
        tier: STRONG,
        range: FLANK,
        effects: damage(),
      },
      {
        key: 'aniquilacao-total',
        name: 'Aniquilação Total',
        variant: 'antimateria',
        tier: FINAL,
        range: MELEE,
        effects: damage(),
      },
    ],
  },
  {
    key: 'kael-vaz',
    name: 'Kael Vaz',
    description:
      'Mão direita. Disciplina militar em guerra constante; teme ser inútil mais do que morrer.',
    characterClass: CharacterClass.VANGUARD,
    rarity: Rarity.A,
    danger: DangerLevel.DIFFERENTIABLE,
    variants: ['explosao', 'endurecimento'],
    npcTrait: 'muralha-viva',
    passive: {
      name: 'Disciplina de Guerra',
      description: 'Com HP abaixo de 50%, endurece: +15% de Defesa.',
      trigger: { type: 'HP_BELOW', percent: 50 },
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.DEFENSE, percent: 15 }],
    },
    skills: [
      {
        key: 'soco-explosivo',
        name: 'Soco Explosivo',
        variant: 'explosao',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'detonacao',
        name: 'Detonação',
        variant: 'explosao',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
        effects: damageWith(0.8, { type: 'REPOSITION', kind: 'PUSH' }),
      },
      {
        key: 'punho-de-aco',
        name: 'Punho de Aço',
        variant: 'endurecimento',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'blindagem',
        name: 'Blindagem',
        variant: 'endurecimento',
        tier: STANDARD,
        slot: K.ROLE,
        target: SELF,
        effects: only(modifier(Stat.DEFENSE, 10)),
      },
      {
        key: 'onda-de-choque',
        name: 'Onda de Choque',
        variant: 'explosao',
        tier: REINFORCED,
        range: MELEE,
        area: LINE,
        effects: damage(),
      },
      {
        key: 'colosso',
        name: 'Colosso',
        variant: 'endurecimento',
        tier: STRONG,
        range: MELEE,
        effects: damageWith(0.9, modifier(Stat.DEFENSE, 20, 'SELF')),
      },
      {
        key: 'detonacao-total',
        name: 'Detonação Total',
        variant: 'explosao',
        tier: FINAL,
        range: MELEE,
        effects: damage(),
      },
    ],
  },
  {
    key: 'derik-okoro',
    name: 'Derik Okoro',
    description:
      'Mão esquerda. O palhaço do grupo; quando o sorriso some, a coisa é séria. O que não pode ser morto.',
    characterClass: CharacterClass.VANGUARD,
    rarity: Rarity.A,
    danger: DangerLevel.DIFFERENTIABLE,
    variants: ['regeneracao'],
    npcTrait: 'berserker',
    passive: {
      name: 'Imortal',
      description: 'No começo de cada turno, regenera 3% do HP máximo.',
      trigger: { type: 'TURN_START' },
      effects: [{ type: 'HEAL', percentOfMaxHp: 3 }],
    },
    skills: [
      {
        key: 'pancada',
        name: 'Pancada',
        variant: 'regeneracao',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'golpe-do-corpo',
        name: 'Golpe do Corpo',
        variant: 'regeneracao',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'pele-viva',
        name: 'Pele Viva',
        variant: 'regeneracao',
        tier: STANDARD,
        slot: K.ROLE,
        target: SELF,
        effects: only(modifier(Stat.DEFENSE, 10)),
      },
      {
        key: 'sangue-que-volta',
        name: 'Sangue que Volta',
        variant: 'regeneracao',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
        effects: damageWith(0.8, {
          type: 'HEAL',
          power: 0.5,
          appliesTo: 'SELF',
        }),
      },
      {
        key: 'atrito',
        name: 'Atrito',
        variant: 'regeneracao',
        tier: REINFORCED,
        range: MELEE,
        area: LINE,
        effects: damage(),
      },
      {
        key: 'nao-morre',
        name: 'Não Morre',
        variant: 'regeneracao',
        tier: STRONG,
        target: SELF,
        effects: heal,
      },
      {
        key: 'moedor-de-carne',
        name: 'Moedor de Carne',
        variant: 'regeneracao',
        tier: FINAL,
        range: MELEE,
        effects: damage(),
      },
    ],
  },
  {
    key: 'lucky',
    name: 'Lucky',
    description:
      'Carismático, leve e protetor. Herói cansado de ser símbolo; quer uma revolução pelas linhagens caçadas.',
    characterClass: CharacterClass.MARKSMAN,
    rarity: Rarity.SS,
    danger: DangerLevel.NON_LINEAR,
    variants: ['relampago', 'tempo'],
    familyTrait: 'nocthar',
    npcTrait: 'olho-de-aguia',
    passive: {
      name: 'Fluxo do Tempo',
      description: 'A cada 3 turnos dele, as recargas em andamento baixam 1.',
      trigger: { type: 'PERIODIC', everyTurns: 3 },
      effects: [{ type: 'REDUCE_COOLDOWN', amount: 1, scope: 'RECHARGING' }],
    },
    skills: [
      {
        key: 'faisca',
        name: 'Faísca',
        variant: 'relampago',
        tier: BASIC,
        slot: K.BASIC,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'raio',
        name: 'Raio',
        variant: 'relampago',
        tier: STANDARD,
        slot: K.STANDARD,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'marcar-o-instante',
        name: 'Marcar o Instante',
        variant: 'tempo',
        tier: STANDARD,
        slot: K.ROLE,
        range: RANGED,
        effects: damageWith(0.5, status(StatusType.MARK)),
      },
      {
        key: 'passo-adiante',
        name: 'Passo Adiante',
        variant: 'tempo',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: RANGED,
        effects: damageWith(0.8, {
          type: 'TURN_SHIFT',
          percent: 25,
          appliesTo: 'SELF',
        }),
      },
      {
        key: 'corrente',
        name: 'Corrente',
        variant: 'relampago',
        tier: REINFORCED,
        range: RANGED,
        area: LINE,
        effects: damage(),
      },
      {
        key: 'trovao',
        name: 'Trovão',
        variant: 'relampago',
        tier: STRONG,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'instante-parado',
        name: 'Instante Parado',
        variant: 'tempo',
        tier: FINAL,
        range: RANGED,
        effects: damageWith(0.9, status(StatusType.STUN)),
      },
    ],
  },
  {
    key: 'sunna',
    name: 'Sunna',
    description:
      'A mulher mais forte de Carmesin e a de maior controle de variante. Elegante, irônica e controladora.',
    characterClass: CharacterClass.CONTROLLER,
    rarity: Rarity.S,
    danger: DangerLevel.NON_LINEAR,
    variants: ['gelo-superionico'],
    npcTrait: 'sangue-frio',
    passive: {
      name: 'Controle Absoluto',
      description: 'Ao causar dano, 20% de chance de Prender o alvo.',
      trigger: { type: 'ON_ATTACK' },
      effects: [
        {
          type: 'APPLY_STATUS',
          status: StatusType.ROOT,
          target: 'TARGET',
          chance: 0.2,
        },
      ],
    },
    skills: [
      {
        key: 'estilhaco',
        name: 'Estilhaço',
        variant: 'gelo-superionico',
        tier: BASIC,
        slot: K.BASIC,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'lanca-de-gelo',
        name: 'Lança de Gelo',
        variant: 'gelo-superionico',
        tier: STANDARD,
        slot: K.STANDARD,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'congelar',
        name: 'Congelar',
        variant: 'gelo-superionico',
        tier: STANDARD,
        slot: K.ROLE,
        range: RANGED,
        effects: damageWith(0.5, status(StatusType.STUN)),
      },
      {
        key: 'grilhao',
        name: 'Grilhão de Gelo',
        variant: 'gelo-superionico',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: RANGED,
        effects: damageWith(0.8, status(StatusType.ROOT)),
      },
      {
        key: 'muralha-de-gelo',
        name: 'Muralha de Gelo',
        variant: 'gelo-superionico',
        tier: REINFORCED,
        range: RANGED,
        area: COLUMN,
        effects: damage(),
      },
      {
        key: 'zero-absoluto',
        name: 'Zero Absoluto',
        variant: 'gelo-superionico',
        tier: STRONG,
        range: RANGED,
        area: GRID,
        effects: damage(),
      },
      {
        key: 'superionico',
        name: 'Superiônico',
        variant: 'gelo-superionico',
        tier: FINAL,
        range: RANGED,
        effects: damageWith(0.9, status(StatusType.STUN)),
      },
    ],
  },
  {
    key: 'nox',
    name: 'Nox',
    description:
      'Espionagem, rastreio e controle de sombra. Introspectiva e curiosa; busca entendimento, não poder.',
    characterClass: CharacterClass.EXECUTOR,
    rarity: Rarity.A,
    danger: DangerLevel.DIFFERENTIABLE,
    variants: ['sombra'],
    familyTrait: 'hyperion',
    npcTrait: 'passo-leve',
    passive: {
      name: 'Visão Sombria',
      description: 'Ao derrubar alguém, adianta a própria vez em 30%.',
      trigger: { type: 'ON_KILL' },
      effects: [{ type: 'ADVANCE_TURN', percent: 30 }],
    },
    skills: [
      {
        key: 'lamina-de-sombra',
        name: 'Lâmina de Sombra',
        variant: 'sombra',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'golpe-da-sombra',
        name: 'Golpe da Sombra',
        variant: 'sombra',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'pela-sombra',
        name: 'Pela Sombra',
        variant: 'sombra',
        tier: STANDARD,
        slot: K.ROLE,
        range: FLANK,
        effects: damage(),
      },
      {
        key: 'travamento',
        name: 'Travamento',
        variant: 'sombra',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
        effects: damageWith(0.8, status(StatusType.LOCK)),
      },
      {
        key: 'compressao',
        name: 'Compressão',
        variant: 'sombra',
        tier: REINFORCED,
        range: MELEE,
        effects: damageWith(0.8, status(StatusType.DOT)),
      },
      {
        key: 'assassinato-silencioso',
        name: 'Assassinato Silencioso',
        variant: 'sombra',
        tier: STRONG,
        range: FLANK,
        effects: damage(),
      },
      {
        key: 'eclipse',
        name: 'Eclipse',
        variant: 'sombra',
        tier: FINAL,
        range: MELEE,
        effects: damage(),
      },
    ],
  },
  {
    key: 'gaia',
    name: 'Gaia',
    description:
      'A melhor defensora de Carmesin. Escolhe a esperança de forma consciente; o coração da CORE.',
    characterClass: CharacterClass.GUARDIAN,
    rarity: Rarity.A,
    danger: DangerLevel.DIFFERENTIABLE,
    variants: ['terra'],
    npcTrait: 'muralha-viva',
    passive: {
      name: 'Coração da CORE',
      description:
        'Ao receber dano, +10% de Defesa até o fim do próximo turno.',
      trigger: { type: 'ON_HIT' },
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.DEFENSE, percent: 10 }],
    },
    skills: [
      {
        key: 'pedrada',
        name: 'Pedrada',
        variant: 'terra',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'martelo-de-pedra',
        name: 'Martelo de Pedra',
        variant: 'terra',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'muralha-de-terra',
        name: 'Muralha de Terra',
        variant: 'terra',
        tier: STANDARD,
        slot: K.ROLE,
        target: ALLY,
        effects: shield,
      },
      {
        key: 'tremor',
        name: 'Tremor',
        variant: 'terra',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
        effects: damageWith(0.8, modifier(Stat.ATTACK, -10)),
      },
      {
        key: 'bastiao',
        name: 'Bastião',
        variant: 'terra',
        tier: REINFORCED,
        target: ALLY,
        effects: shield,
      },
      {
        key: 'terremoto',
        name: 'Terremoto',
        variant: 'terra',
        tier: STRONG,
        range: MELEE,
        area: LINE,
        effects: damage(),
      },
      {
        key: 'coracao-da-terra',
        name: 'Coração da Terra',
        variant: 'terra',
        tier: FINAL,
        target: ALLY,
        area: GRID,
        effects: shield,
      },
    ],
  },
  {
    key: 'rolf-eidvar',
    name: 'Rolf Eidvar',
    description:
      'O melhor rastreador e batedor. Gentil, calmo, obcecado por limpeza e movido por culpa.',
    characterClass: CharacterClass.MARKSMAN,
    rarity: Rarity.B,
    danger: DangerLevel.CONTINUOUS,
    variants: ['alma'],
    npcTrait: 'mira-firme',
    passive: {
      name: 'Primeiro a Cair',
      description: 'Com HP abaixo de 30%, +15% de Ataque.',
      trigger: { type: 'HP_BELOW', percent: 30 },
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 15 }],
    },
    skills: [
      {
        key: 'flecha-espiritual',
        name: 'Flecha Espiritual',
        variant: 'alma',
        tier: BASIC,
        slot: K.BASIC,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'tiro-da-alma',
        name: 'Tiro da Alma',
        variant: 'alma',
        tier: STANDARD,
        slot: K.STANDARD,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'rastro',
        name: 'Rastro',
        variant: 'alma',
        tier: STANDARD,
        slot: K.ROLE,
        range: RANGED,
        effects: damageWith(0.5, status(StatusType.MARK)),
      },
      {
        key: 'ferir-a-alma',
        name: 'Ferir a Alma',
        variant: 'alma',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: RANGED,
        effects: damageWith(0.8, modifier(Stat.WILL, -10)),
      },
      {
        key: 'cacada',
        name: 'Caçada',
        variant: 'alma',
        tier: REINFORCED,
        range: RANGED,
        effects: damageWith(0.8, status(StatusType.EXPOSE)),
      },
      {
        key: 'atravessar',
        name: 'Atravessar',
        variant: 'alma',
        tier: STRONG,
        range: PIERCING,
        effects: damage(),
      },
      {
        key: 'sacrificio',
        name: 'Sacrifício',
        variant: 'alma',
        tier: FINAL,
        range: RANGED,
        effects: damage(),
      },
    ],
  },
  {
    key: 'kara',
    name: 'Kara',
    description:
      'Ilusão, interrogatório e estratégia. A "irmã mais velha"; sonha com civilização, não só com vitória.',
    characterClass: CharacterClass.SUPPORT,
    rarity: Rarity.B,
    danger: DangerLevel.CONTINUOUS,
    variants: ['ilusao'],
    npcTrait: 'sangue-frio',
    passive: {
      name: 'Irmã Mais Velha',
      description: 'Ao curar, adianta a própria vez em 15%.',
      trigger: { type: 'ON_HEAL' },
      effects: [{ type: 'ADVANCE_TURN', percent: 15 }],
    },
    skills: [
      {
        key: 'miragem',
        name: 'Miragem',
        variant: 'ilusao',
        tier: BASIC,
        slot: K.BASIC,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'pesadelo',
        name: 'Pesadelo',
        variant: 'ilusao',
        tier: STANDARD,
        slot: K.STANDARD,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'refugio',
        name: 'Refúgio',
        variant: 'ilusao',
        tier: STANDARD,
        slot: K.ROLE,
        target: ALLY,
        effects: heal,
      },
      {
        key: 'vertigem',
        name: 'Vertigem',
        variant: 'ilusao',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: RANGED,
        effects: damageWith(0.8, modifier(Stat.PRECISION, -10)),
      },
      {
        key: 'abrigo-ilusorio',
        name: 'Abrigo Ilusório',
        variant: 'ilusao',
        tier: REINFORCED,
        target: ALLY,
        effects: heal,
      },
      {
        key: 'confianca',
        name: 'Confiança',
        variant: 'ilusao',
        tier: STRONG,
        target: ALLY,
        area: GRID,
        effects: only(modifier(Stat.ATTACK, 14)),
      },
      {
        key: 'civilizacao',
        name: 'Civilização',
        variant: 'ilusao',
        tier: FINAL,
        target: ALLY,
        area: GRID,
        effects: heal,
      },
    ],
  },
  {
    key: 'tyir-ossvald',
    name: 'Tyir Ossvald',
    description:
      'O mais experiente, mestre em estratégia de guerra. "Vitória sem humanidade não vale nada."',
    characterClass: CharacterClass.TACTICIAN,
    rarity: Rarity.A,
    danger: DangerLevel.DIFFERENTIABLE,
    variants: ['resistencia'],
    npcTrait: 'impeto',
    passive: {
      name: 'Experiência',
      description: 'Recebe sempre 5% menos dano.',
      trigger: { type: 'ALWAYS' },
      effects: [{ type: 'REDUCE_DAMAGE', percent: 5 }],
    },
    skills: [
      {
        key: 'golpe-veterano',
        name: 'Golpe Veterano',
        variant: 'resistencia',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'contra-ataque',
        name: 'Contra-ataque',
        variant: 'resistencia',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'comando',
        name: 'Comando',
        variant: 'resistencia',
        tier: STANDARD,
        slot: K.ROLE,
        target: ALLY,
        effects: only({ type: 'TURN_SHIFT', percent: 50 }),
      },
      {
        key: 'postura-firme',
        name: 'Postura Firme',
        variant: 'resistencia',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
        effects: damageWith(0.8, modifier(Stat.DEFENSE, 10, 'SELF')),
      },
      {
        key: 'ordem-de-avanco',
        name: 'Ordem de Avanço',
        variant: 'resistencia',
        tier: REINFORCED,
        target: ALLY,
        effects: only({ type: 'TURN_SHIFT', percent: 70 }),
      },
      {
        key: 'manobra',
        name: 'Manobra',
        variant: 'resistencia',
        tier: STRONG,
        range: RANGED,
        effects: only({ type: 'TURN_SHIFT', percent: -55 }),
      },
      {
        key: 'agora',
        name: 'Agora!',
        variant: 'resistencia',
        tier: FINAL,
        target: ALLY,
        effects: only({ type: 'TURN_SHIFT', percent: 100 }),
      },
    ],
  },
  {
    key: 'isis-maccarthy',
    name: 'Isis Maccarthy',
    description:
      'Telecinese, combate aéreo e longa distância. Intensa e explosiva; vive pela aprovação do Ecko.',
    characterClass: CharacterClass.ARTILLERY,
    rarity: Rarity.B,
    danger: DangerLevel.CONTINUOUS,
    variants: ['telecinese'],
    npcTrait: 'olho-de-aguia',
    passive: {
      name: 'Explosiva',
      description:
        'Ao pagar Desgaste, +10% de Velocidade até o fim do próximo turno.',
      trigger: { type: 'ON_DESGASTE' },
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.SPEED, percent: 10 }],
    },
    skills: [
      {
        key: 'arremesso',
        name: 'Arremesso',
        variant: 'telecinese',
        tier: BASIC,
        slot: K.BASIC,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'projetil',
        name: 'Projétil',
        variant: 'telecinese',
        tier: STANDARD,
        slot: K.STANDARD,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'chuva-de-destrocos',
        name: 'Chuva de Destroços',
        variant: 'telecinese',
        tier: STANDARD,
        slot: K.ROLE,
        range: RANGED,
        area: LINE,
        effects: damage(),
      },
      {
        key: 'puxao',
        name: 'Puxão',
        variant: 'telecinese',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: RANGED,
        effects: damageWith(0.8, { type: 'REPOSITION', kind: 'PULL' }),
      },
      {
        key: 'esmagamento',
        name: 'Esmagamento',
        variant: 'telecinese',
        tier: REINFORCED,
        range: RANGED,
        area: COLUMN,
        effects: damage(),
      },
      {
        key: 'tempestade',
        name: 'Tempestade',
        variant: 'telecinese',
        tier: STRONG,
        range: RANGED,
        area: GRID,
        effects: damage(),
      },
      {
        key: 'queda-livre',
        name: 'Queda Livre',
        variant: 'telecinese',
        tier: FINAL,
        range: RANGED,
        area: LINE,
        effects: damage(),
      },
    ],
  },
  {
    key: 'tank-valen',
    name: 'Tank Valen',
    description:
      'Sem variante, prodígio no DOM. Humilde, disciplinado e constante: o esforço ainda vale a pena.',
    characterClass: CharacterClass.GUARDIAN,
    rarity: Rarity.C,
    danger: DangerLevel.DISCRETE,
    variants: [],
    npcTrait: 'muralha-viva',
    passive: {
      name: 'Constância',
      description: 'Com HP abaixo de 40%, recebe 15% menos dano.',
      trigger: { type: 'HP_BELOW', percent: 40 },
      effects: [{ type: 'REDUCE_DAMAGE', percent: 15 }],
    },
    skills: [
      {
        key: 'soco-firme',
        name: 'Soco Firme',
        variant: null,
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'investida',
        name: 'Investida',
        variant: null,
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'escudo-humano',
        name: 'Escudo Humano',
        variant: null,
        tier: STANDARD,
        slot: K.ROLE,
        target: ALLY,
        effects: shield,
      },
      {
        key: 'firmeza',
        name: 'Firmeza',
        variant: null,
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
        effects: damageWith(0.8, modifier(Stat.DEFENSE, 10, 'SELF')),
      },
      {
        key: 'guarda-alta',
        name: 'Guarda Alta',
        variant: null,
        tier: REINFORCED,
        target: ALLY,
        effects: shield,
      },
      {
        key: 'muralha-humana',
        name: 'Muralha Humana',
        variant: null,
        tier: STRONG,
        target: SELF,
        effects: only(modifier(Stat.DEFENSE, 20)),
      },
      {
        key: 'esforco',
        name: 'Esforço',
        variant: null,
        tier: FINAL,
        range: MELEE,
        effects: damage(),
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

export interface BuiltCharacter {
  spec: CharacterSpec
  template: CharacterTemplate
  /** Na ordem do `spec.skills` (kit primeiro). */
  skills: Skill[]
}

function buildSkill(
  spec: SkillSpec,
  owner: CharacterSpec,
  variants: Map<string, Variant>
): Skill {
  const target = spec.target ?? SkillTarget.ENEMY
  const area = spec.area ?? SkillArea.SINGLE
  const enemy = target === SkillTarget.ENEMY
  const ref = skillReference({
    tier: spec.tier,
    target,
    range: enemy ? spec.range : null,
    area,
    isNone: spec.variant === null,
  })

  return unwrap(
    Skill.create({
      key: `${owner.key}:${spec.key}`,
      name: spec.name,
      variant: spec.variant ? variants.get(spec.variant)! : null,
      tier: spec.tier,
      target,
      range: enemy ? spec.range! : null,
      area,
      cooldown: ref.cooldown,
      desgastePercent: ref.desgastePercent,
      baseHitChance: enemy ? 0.8 : null,
      minLevel: ref.minLevel,
      kitClass: spec.slot ? owner.characterClass : null,
      kitSlot: spec.slot ?? null,
      effects: spec.effects(ref.power),
    }),
    `skill ${owner.key}:${spec.key}`
  )
}

export function buildCharacters(
  variants: Map<string, Variant>,
  traits: Map<string, Trait>
): BuiltCharacter[] {
  return CHARACTERS.map((spec) => {
    const template = unwrap(
      CharacterTemplate.create({
        key: spec.key,
        name: spec.name,
        description: spec.description,
        characterClass: spec.characterClass,
        rarity: spec.rarity,
        initialDanger: spec.danger,
        exclusivity: Exclusivity.NONE,
        variants: spec.variants.map((key, i) => ({
          variant: variants.get(key)!,
          isPrimary: i === 0,
        })),
        familyTrait: spec.familyTrait ? traits.get(spec.familyTrait)! : null,
        stats: { ...CLASS_PROFILE[spec.characterClass] },
        passive: spec.passive,
      }),
      `modelo ${spec.key}`
    )

    return {
      spec,
      template,
      skills: spec.skills.map((s) => buildSkill(s, spec, variants)),
    }
  })
}
