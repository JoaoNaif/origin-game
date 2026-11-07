import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { DangerLevel } from '@/domain/characters/enums/danger-level'
import { Exclusivity } from '@/domain/characters/enums/exclusivity'
import { Rarity } from '@/domain/characters/enums/rarity'
import { Stat } from '@/domain/characters/enums/stat'
import { CLASS_PROFILES } from '@/domain/characters/services/class-profiles'
import { Passive } from '@/domain/characters/value-objects/passive'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { STATUS_RULES } from '@/domain/combat/services/conditions'
import { Skill } from '@/domain/skills/entities/skill'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillKitSlot } from '@/domain/skills/enums/skill-kit-slot'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { MAX_SKILL_POWER, SkillTier } from '@/domain/skills/enums/skill-tier'
import { StatusType } from '@/domain/skills/enums/status-type'
import { skillReference } from '@/domain/skills/services/skill-reference'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'
import { unwrap } from './catalog'

// ---------------------------------------------------------------------------
// Efeitos (o Poder vem da referência do tipo + forma, `skillReference`)
// ---------------------------------------------------------------------------

/** Recebe o Poder de referência da skill e devolve os efeitos. */
type Effects = (power: number) => SkillEffect[]

const r2 = (x: number) => Math.round(x * 100) / 100

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
  appliesTo?: 'SELF',
  duration = 2
): SkillEffect => ({
  type: 'STAT_MODIFIER',
  stat,
  percent,
  duration,
  ...(appliesTo ? { appliesTo } : {}),
})

/**
 * Suporte puro (D139): cura e escudo sem dano junto rendem ×1,5 do Poder de referência, e buff sem dano junto dura
 * 3 turnos. Um turno de suporte tem de valer um golpe do mesmo tipo: a cura só conta no aliado ferido e o buff de
 * Defesa de 10 a 20% só tira ~5 a 9% do dano recebido.
 */
const SUPPORT_BONUS = 1.5
const BUFF_DURATION = 3

/** Skill cujo foco é o status (Atordoar, Marcar, Prender): custa menos que um golpe, Poder ~0,6 à distância (D145). */
const STATUS_ONLY_DAMAGE = 0.67

/** Dano com efeito lateral (assinatura: ~0,8 do Poder + efeito pequeno, 12.6). */
const damageWith =
  (multiplier: number, ...extra: SkillEffect[]): Effects =>
  (power) => [{ type: 'DAMAGE', power: r2(power * multiplier) }, ...extra]

const heal: Effects = (power) => [
  { type: 'HEAL', power: r2(power * SUPPORT_BONUS) },
]
const shield: Effects = (power) => [
  { type: 'SHIELD', power: r2(power * SUPPORT_BONUS) },
]
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
  /** Foge da referência do tipo (ex.: trocar campo tem tabela própria, 12.7). */
  cooldown?: number
  /** Nível mínimo próprio (skills despertadas: 80 a 100, D96). */
  minLevel?: number
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
  /**
   * Ordem de preferência da build dos NPCs (`key` das skills): entram as 4 primeiras já liberadas no nível. Montada à
   * mão, como um designer faria: golpe forte, a função da classe e a assinatura.
   */
  npcPriority: string[]
  passive: Passive
  skills: SkillSpec[]
}

const { BASIC, STANDARD, REINFORCED, STRONG, FINAL } = SkillTier
const { MELEE, RANGED, FLANK, PIERCING } = SkillRange
const { ALLY, SELF } = SkillTarget
const { LINE, COLUMN, GRID } = SkillArea
const K = SkillKitSlot

/**
 * Os 12 da CORE (fichas em `art_direction.md` 4). Entre eles, o elenco cobre tudo o que o motor sabe fazer, para testar
 * o front com poucos personagens: as 8 classes, as 6 linhagens, os 4 alcances, as 4 áreas, os 7 status, os 5
 * reposicionamentos, adiantar e atrasar, Comando, Proteger, trocar campo, Recuperar, executar, cura, escudo, buff e
 * debuff (de um e da squad), e uma passiva por gatilho (só o `ON_HEAL` fica de fora). Conferido em
 * `test/seed/seed-content.spec.ts`.
 */
export const CHARACTERS: CharacterSpec[] = [
  {
    key: 'ecko-nocthar',
    name: 'Ecko Nocthar',
    description:
      'Líder da CORE, criado desde criança como guerreiro e assassino. Um rei que caminha na frente do seu povo, de presença intimidadora; harpe e antimatéria, a curta distância, fechando a luta.',
    characterClass: CharacterClass.EXECUTOR,
    rarity: Rarity.SS,
    danger: DangerLevel.CHAOTIC,
    variants: ['antimateria'],
    familyTrait: 'nocthar',
    npcTrait: 'berserker',
    npcPriority: [
      'aniquilacao-total',
      'sentenca',
      'presenca-do-rei',
      'gancho-da-harpe',
      'apagar-a-voz',
      'apagar',
      'infiltracao',
      'golpe-de-antimateria',
      'corte-da-harpe',
    ],
    passive: {
      name: 'Aniquilação',
      description:
        'A antimatéria apaga a matéria: todo dano dele ignora escudos e bate na vida.',
      trigger: { type: 'ALWAYS' },
      effects: [{ type: 'IGNORE_SHIELD' }],
    },
    skills: [
      {
        key: 'corte-da-harpe',
        name: 'Corte da Harpe',
        variant: 'antimateria',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'golpe-de-antimateria',
        name: 'Golpe de Antimatéria',
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
        key: 'apagar-a-voz',
        name: 'Apagar a Voz',
        variant: 'antimateria',
        tier: STANDARD,
        range: RANGED,
        // a antimatéria apaga o que o alvo ia dizer (D146)
        effects: damageWith(STATUS_ONLY_DAMAGE, status(StatusType.SILENCE)),
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
        key: 'gancho-da-harpe',
        name: 'Gancho da Harpe',
        variant: 'antimateria',
        tier: REINFORCED,
        range: FLANK,
        // o gancho alcança o fundo da linha e puxa o alvo para a frente
        effects: damageWith(0.8, { type: 'REPOSITION', kind: 'PULL' }),
      },
      {
        key: 'presenca-do-rei',
        name: 'Presença do Rei',
        variant: 'antimateria',
        tier: REINFORCED,
        range: RANGED,
        area: GRID,
        // intimidação: debuff de squad (magnitude ×0,7, 12.8)
        effects: only(modifier(Stat.ATTACK, -10)),
      },
      {
        key: 'sentenca',
        name: 'Sentença',
        variant: 'antimateria',
        tier: STRONG,
        range: MELEE,
        // executar (D125): ×1,5 em alvo Exposto, e a guarda aberta se fecha
        effects: (power) => [
          { type: 'DAMAGE', power },
          {
            type: 'EXPLOIT',
            status: StatusType.EXPOSE,
            multiplier: 1.5,
            consume: true,
          },
        ],
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
      'Mão direita. Cumpre regras, leal e de grande coração, mas impiedoso em campo. Híbrido perfeito: explode áreas grandes na linha de frente e o endurecimento o protege das próprias explosões.',
    characterClass: CharacterClass.VANGUARD,
    rarity: Rarity.A,
    danger: DangerLevel.DIFFERENTIABLE,
    variants: ['explosao', 'endurecimento'],
    npcTrait: 'muralha-viva',
    npcPriority: [
      'detonacao-total',
      'pilar-de-explosao',
      'onda-de-choque',
      'escudo-de-aco',
      'detonacao',
      'blindagem',
      'punho-de-aco',
      'soco-explosivo',
    ],
    passive: {
      name: 'Híbrido Perfeito',
      description:
        'Ao causar dano, a explosão o endurece: +10% de Defesa até o fim do próximo turno.',
      trigger: { type: 'ON_ATTACK' },
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.DEFENSE, percent: 10 }],
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
        key: 'punho-de-aco',
        name: 'Punho de Aço',
        variant: 'endurecimento',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'escudo-de-aco',
        name: 'Escudo de Aço',
        variant: 'endurecimento',
        tier: STANDARD,
        slot: K.ROLE,
        target: ALLY,
        // Proteger (D124): o golpe no aliado adjacente cai no Kael
        effects: only({ type: 'PROTECT' }),
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
        key: 'blindagem',
        name: 'Blindagem',
        variant: 'endurecimento',
        tier: REINFORCED,
        target: SELF,
        effects: (power) => [
          modifier(Stat.DEFENSE, 20, undefined, BUFF_DURATION),
          { type: 'SHIELD', power: r2(power * 0.6) },
        ],
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
        key: 'pilar-de-explosao',
        name: 'Pilar de Explosão',
        variant: 'explosao',
        tier: STRONG,
        range: MELEE,
        area: COLUMN,
        effects: damage(),
      },
      {
        key: 'detonacao-total',
        name: 'Detonação Total',
        variant: 'explosao',
        tier: FINAL,
        range: MELEE,
        area: GRID,
        effects: damage(),
      },
    ],
  },
  {
    key: 'derik-okoro',
    name: 'Derik Okoro',
    description:
      'Mão esquerda e o palhaço do grupo. Luta de um jeito louco, sem ligar para dano, porque se cura: vem como um trator, nos punhos. Duas Desert Eagles para longe. Viciado em cigarro e álcool.',
    characterClass: CharacterClass.VANGUARD,
    rarity: Rarity.A,
    danger: DangerLevel.DIFFERENTIABLE,
    variants: ['regeneracao'],
    npcTrait: 'berserker',
    npcPriority: [
      'moedor-de-carne',
      'nao-morre',
      'trator',
      'vem-pra-cima',
      'sangue-que-volta',
      'desert-eagles',
      'golpe-do-corpo',
      'pancada',
    ],
    passive: {
      name: 'Imortal',
      description: 'No começo de cada turno, regenera 2% do HP máximo.',
      trigger: { type: 'TURN_START' },
      effects: [{ type: 'HEAL', percentOfMaxHp: 2 }],
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
        key: 'vem-pra-cima',
        name: 'Vem pra Cima',
        variant: 'regeneracao',
        tier: STANDARD,
        slot: K.ROLE,
        range: RANGED,
        // Provocar Padrão (D124): 1 inimigo
        effects: only(status(StatusType.TAUNT)),
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
        key: 'desert-eagles',
        name: 'Desert Eagles',
        variant: 'regeneracao',
        tier: STANDARD,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'trator',
        name: 'Trator',
        variant: 'regeneracao',
        tier: REINFORCED,
        range: MELEE,
        // golpeia e avança para uma célula adjacente
        effects: damageWith(1, { type: 'REPOSITION', kind: 'DASH' }),
      },
      {
        key: 'nao-morre',
        name: 'Não Morre',
        variant: 'regeneracao',
        tier: STRONG,
        target: SELF,
        // skill de recuperação (9.4b, D120): cura e alivia 50% do Desgaste
        effects: (power) => [
          { type: 'HEAL', power: r2(power * SUPPORT_BONUS) },
          { type: 'RECOVER' },
        ],
      },
      {
        key: 'moedor-de-carne',
        name: 'Moedor de Carne',
        variant: 'regeneracao',
        tier: FINAL,
        range: MELEE,
        area: LINE,
        effects: damage(),
      },
    ],
  },
  {
    key: 'lucky',
    name: 'Lucky',
    description:
      'Irmão do Ecko e o melhor artista marcial da CORE. Katana canalizando o relâmpago, e o tempo: versátil de perto e de longe. Gentil e sentimental, o contraste com o irmão.',
    characterClass: CharacterClass.MARKSMAN,
    rarity: Rarity.SS,
    danger: DangerLevel.NON_LINEAR,
    variants: ['relampago', 'tempo'],
    familyTrait: 'nocthar',
    npcTrait: 'olho-de-aguia',
    npcPriority: [
      'instante-parado',
      'iaijutsu',
      'trovao-perfurante',
      'corrente',
      'passo-adiante',
      'marcar-o-instante',
      'raio',
      'corte-relampago',
    ],
    passive: {
      name: 'Fluxo do Tempo',
      description: 'A cada 3 turnos dele, as recargas em andamento baixam 1.',
      trigger: { type: 'PERIODIC', everyTurns: 3 },
      effects: [{ type: 'REDUCE_COOLDOWN', amount: 1, scope: 'RECHARGING' }],
    },
    skills: [
      {
        key: 'corte-relampago',
        name: 'Corte Relâmpago',
        variant: 'relampago',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
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
        effects: damageWith(STATUS_ONLY_DAMAGE, status(StatusType.MARK)),
      },
      {
        key: 'passo-adiante',
        name: 'Passo Adiante',
        variant: 'tempo',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
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
        key: 'trovao-perfurante',
        name: 'Trovão Perfurante',
        variant: 'relampago',
        tier: REINFORCED,
        range: PIERCING,
        effects: damage(),
      },
      {
        key: 'iaijutsu',
        name: 'Iaijutsu',
        variant: 'relampago',
        tier: STRONG,
        range: MELEE,
        // o saque da katana: golpeia e avança para uma célula adjacente
        effects: damageWith(1, { type: 'REPOSITION', kind: 'DASH' }),
      },
      {
        key: 'instante-parado',
        name: 'Instante Parado',
        variant: 'tempo',
        tier: FINAL,
        range: RANGED,
        // atrasa a vez do alvo (12.8); o alvo fica imune a novo atraso até agir
        effects: damageWith(0.9, { type: 'TURN_SHIFT', percent: -30 }),
      },
    ],
  },
  {
    key: 'sunna',
    name: 'Sunna',
    description:
      'A mulher mais forte de Carmesin e o maior controle de variante da CORE: faz quase tudo com o gelo, e o florete. Treinada com o Ecko, mata com a mesma facilidade. Direta, orgulhosa e irritada, mas carismática; pelo Ecko, destruiria uma cidade.',
    characterClass: CharacterClass.CONTROLLER,
    rarity: Rarity.S,
    danger: DangerLevel.NON_LINEAR,
    variants: ['gelo-superionico'],
    npcTrait: 'sangue-frio',
    npcPriority: [
      'superionico',
      'nevasca',
      'estilhacar',
      'grilhao',
      'congelar',
      'inverno-eterno',
      'lanca-de-gelo',
      'estocada',
    ],
    passive: {
      name: 'Toque Gélido',
      description: 'Ao receber dano, 25% de chance de Prender quem a atingiu.',
      trigger: { type: 'ON_HIT' },
      effects: [
        {
          type: 'APPLY_STATUS',
          status: StatusType.ROOT,
          target: 'ATTACKER',
          chance: 0.25,
        },
      ],
    },
    skills: [
      {
        key: 'estocada',
        name: 'Estocada',
        variant: 'gelo-superionico',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
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
        effects: damageWith(STATUS_ONLY_DAMAGE, status(StatusType.STUN)),
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
        key: 'estilhacar',
        name: 'Estilhaçar',
        variant: 'gelo-superionico',
        tier: REINFORCED,
        range: MELEE,
        // executar (D125): ×1,5 em alvo Preso, e o gelo quebra (o Preso acaba)
        effects: (power) => [
          { type: 'DAMAGE', power },
          {
            type: 'EXPLOIT',
            status: StatusType.ROOT,
            multiplier: 1.5,
            consume: true,
          },
        ],
      },
      {
        key: 'inverno-eterno',
        name: 'Inverno Eterno',
        variant: 'gelo-superionico',
        tier: STRONG,
        target: SELF,
        // troca o campo (12.7): Forte = 2 rodadas, bônus ×1,5, cooldown 4
        cooldown: 4,
        effects: only({ type: 'CHANGE_FIELD', duration: 2, multiplier: 1.5 }),
      },
      {
        key: 'nevasca',
        name: 'Nevasca',
        variant: 'gelo-superionico',
        tier: STRONG,
        range: RANGED,
        area: GRID,
        effects: damageWith(1, status(StatusType.LOCK)),
      },
      {
        key: 'superionico',
        name: 'Superiônico',
        variant: 'gelo-superionico',
        tier: FINAL,
        range: PIERCING,
        effects: damageWith(0.9, status(StatusType.STUN)),
      },
    ],
  },
  {
    key: 'nox',
    name: 'Nox',
    description:
      'A mais rápida da CORE: se move pela sombra. Infiltração, furtividade e ataque surpresa; paralisa segurando a sombra do inimigo, com duas adagas de assassina. Quieta, gentil, gosta de ler e do céu estrelado; odeia que invadam o espaço dela.',
    characterClass: CharacterClass.EXECUTOR,
    rarity: Rarity.A,
    danger: DangerLevel.DIFFERENTIABLE,
    variants: ['sombra'],
    familyTrait: 'hyperion',
    npcTrait: 'passo-leve',
    npcPriority: [
      'assassinato',
      'emboscada',
      'manto-de-sombra',
      'entre-sombras',
      'agarrar-a-sombra',
      'passo-sombrio',
      'golpe-da-sombra',
      'adagas-gemeas',
    ],
    passive: {
      name: 'Visão Sombria',
      description: 'Ao derrubar alguém, adianta a própria vez em 30%.',
      trigger: { type: 'ON_KILL' },
      effects: [{ type: 'ADVANCE_TURN', percent: 30 }],
    },
    skills: [
      {
        key: 'adagas-gemeas',
        name: 'Adagas Gêmeas',
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
        // a sombra corta fundo: sangramento (D145)
        effects: damageWith(0.8, status(StatusType.DOT)),
      },
      {
        key: 'passo-sombrio',
        name: 'Passo Sombrio',
        variant: 'sombra',
        tier: STANDARD,
        slot: K.ROLE,
        range: FLANK,
        // sai da sombra no fundo da linha e avança para uma célula adjacente
        effects: damageWith(0.9, { type: 'REPOSITION', kind: 'DASH' }),
      },
      {
        key: 'agarrar-a-sombra',
        name: 'Agarrar a Sombra',
        variant: 'sombra',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: RANGED,
        effects: damageWith(0.8, status(StatusType.ROOT)),
      },
      {
        key: 'entre-sombras',
        name: 'Entre Sombras',
        variant: 'sombra',
        tier: STANDARD,
        target: SELF,
        // some até a próxima vez dele (D146); a recarga impede ficar sumido o tempo todo
        cooldown: 3,
        effects: only(status(StatusType.STEALTH)),
      },
      {
        key: 'manto-de-sombra',
        name: 'Manto de Sombra',
        variant: 'sombra',
        tier: REINFORCED,
        target: SELF,
        // as tatuagens viram sombra
        effects: only(
          modifier(Stat.EVASION, 20, undefined, BUFF_DURATION),
          modifier(Stat.SPEED, 10, undefined, BUFF_DURATION)
        ),
      },
      {
        key: 'emboscada',
        name: 'Emboscada',
        variant: 'sombra',
        tier: STRONG,
        range: MELEE,
        // executar (D125): ×1,5 em alvo Preso (não solta a sombra)
        effects: (power) => [
          { type: 'DAMAGE', power },
          {
            type: 'EXPLOIT',
            status: StatusType.ROOT,
            multiplier: 1.5,
            consume: false,
          },
        ],
      },
      {
        key: 'assassinato',
        name: 'Assassinato',
        variant: 'sombra',
        tier: FINAL,
        range: FLANK,
        effects: damage(),
      },
      {
        key: 'lamina-do-abismo',
        name: 'Lâmina do Abismo',
        variant: 'sombra-abissal',
        tier: REINFORCED,
        range: MELEE,
        minLevel: 80,
        // despertadas (D151): Poder ×1,25 e Desgaste ×1,5 sobre a referência
        effects: damageWith(0.8, status(StatusType.DOT)),
      },
      {
        key: 'mergulho-abissal',
        name: 'Mergulho Abissal',
        variant: 'sombra-abissal',
        tier: STRONG,
        range: FLANK,
        minLevel: 85,
        effects: damageWith(1, { type: 'REPOSITION', kind: 'DASH' }),
      },
      {
        key: 'veu-abissal',
        name: 'Véu Abissal',
        variant: 'sombra-abissal',
        tier: REINFORCED,
        target: SELF,
        minLevel: 90,
        effects: only(
          status(StatusType.STEALTH),
          modifier(Stat.ATTACK, 20, undefined, BUFF_DURATION)
        ),
      },
      {
        key: 'ceifa-sombria',
        name: 'Ceifa Sombria',
        variant: 'sombra-abissal',
        tier: STRONG,
        range: MELEE,
        area: LINE,
        minLevel: 95,
        effects: damage(),
      },
      {
        key: 'noite-sem-fim',
        name: 'Noite Sem Fim',
        variant: 'sombra-abissal',
        tier: FINAL,
        range: FLANK,
        minLevel: 100,
        effects: damage(),
      },
      {
        key: 'prender-a-sombra',
        name: 'Prender a Sombra',
        variant: 'eclipse',
        tier: REINFORCED,
        range: RANGED,
        minLevel: 80,
        effects: damageWith(STATUS_ONLY_DAMAGE, status(StatusType.ROOT)),
      },
      {
        key: 'eclipse',
        name: 'Eclipse',
        variant: 'eclipse',
        tier: STRONG,
        range: RANGED,
        area: GRID,
        minLevel: 85,
        effects: damageWith(1, status(StatusType.SILENCE)),
      },
      {
        key: 'sono-da-sombra',
        name: 'Sono da Sombra',
        variant: 'eclipse',
        tier: REINFORCED,
        range: RANGED,
        minLevel: 90,
        // sem dano: qualquer golpe acorda (D146)
        effects: only(status(StatusType.SLEEP)),
      },
      {
        key: 'sombras-ligadas',
        name: 'Sombras Ligadas',
        variant: 'eclipse',
        tier: STRONG,
        range: RANGED,
        minLevel: 95,
        effects: damageWith(0.8, status(StatusType.LINK)),
      },
      {
        key: 'umbra-total',
        name: 'Umbra Total',
        variant: 'eclipse',
        tier: FINAL,
        range: PIERCING,
        minLevel: 100,
        effects: damageWith(0.9, status(StatusType.STUN)),
      },
    ],
  },
  {
    key: 'gaia',
    name: 'Gaia',
    description:
      'O coração da CORE: suporte do grupo pela terra, na defesa e no ataque, a média distância, moldando o terreno para criar vantagem. Cajado forjado pela família. A mais gentil e empática; odeia guerra e morte.',
    characterClass: CharacterClass.SUPPORT,
    rarity: Rarity.A,
    danger: DangerLevel.DIFFERENTIABLE,
    variants: ['terra'],
    npcTrait: 'muralha-viva',
    npcPriority: [
      'coracao-da-terra',
      'terremoto',
      'solo-firme',
      'muralha-de-terra',
      'cura-da-terra',
      'purificar',
      'raizes',
      'estaca-de-pedra',
      'moldar-o-terreno',
      'pedrada',
    ],
    passive: {
      name: 'Terra Viva',
      description:
        'Quando o campo de batalha muda, adianta a vez de todos os aliados em 15%.',
      trigger: { type: 'ON_FIELD_CHANGE' },
      effects: [{ type: 'ADVANCE_ALLIES', percent: 15 }],
    },
    skills: [
      {
        key: 'pedrada',
        name: 'Pedrada',
        variant: 'terra',
        tier: BASIC,
        slot: K.BASIC,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'estaca-de-pedra',
        name: 'Estaca de Pedra',
        variant: 'terra',
        tier: STANDARD,
        slot: K.STANDARD,
        range: RANGED,
        // a pedra fica cravada: sangramento (D145)
        effects: damageWith(0.8, status(StatusType.DOT)),
      },
      {
        key: 'cura-da-terra',
        name: 'Cura da Terra',
        variant: 'terra',
        tier: STANDARD,
        slot: K.ROLE,
        target: ALLY,
        // acima do ×1,5 do suporte puro: Gaia é quem só sustenta (D144)
        effects: only({ type: 'HEAL', power: 1.9 }),
      },
      {
        key: 'purificar',
        name: 'Purificar',
        variant: 'terra',
        tier: STANDARD,
        target: ALLY,
        // a terra limpa o que está errado (D146)
        effects: only({ type: 'CLEANSE' }),
      },
      {
        key: 'moldar-o-terreno',
        name: 'Moldar o Terreno',
        variant: 'terra',
        tier: STANDARD,
        slot: K.SIGNATURE,
        target: SELF,
        // troca o campo (12.7): Padrão = 4 rodadas, bônus ×1,0, cooldown 2
        cooldown: 2,
        effects: only({ type: 'CHANGE_FIELD', duration: 4, multiplier: 1 }),
      },
      {
        key: 'raizes',
        name: 'Raízes',
        variant: 'terra',
        tier: STANDARD,
        range: RANGED,
        effects: damageWith(STATUS_ONLY_DAMAGE, status(StatusType.ROOT)),
      },
      {
        key: 'muralha-de-terra',
        name: 'Muralha de Terra',
        variant: 'terra',
        tier: REINFORCED,
        target: ALLY,
        effects: only({ type: 'SHIELD', power: 2.4 }),
      },
      {
        key: 'solo-firme',
        name: 'Solo Firme',
        variant: 'terra',
        tier: REINFORCED,
        target: ALLY,
        area: GRID,
        // buff de squad (12.8): magnitude ×0,7
        effects: only(modifier(Stat.DEFENSE, 10, undefined, BUFF_DURATION)),
      },
      {
        key: 'terremoto',
        name: 'Terremoto',
        variant: 'terra',
        tier: STRONG,
        range: RANGED,
        area: GRID,
        effects: damage(),
      },
      {
        key: 'coracao-da-terra',
        name: 'Coração da Terra',
        variant: 'terra',
        tier: FINAL,
        target: ALLY,
        area: GRID,
        effects: heal,
      },
      {
        key: 'escudo-de-cristal',
        name: 'Escudo de Cristal',
        variant: 'cristal',
        tier: REINFORCED,
        target: ALLY,
        minLevel: 80,
        // despertadas (D151); cura e escudo param no teto de Poder 2,5 (D96)
        effects: shield,
      },
      {
        key: 'cura-cristalina',
        name: 'Cura Cristalina',
        variant: 'cristal',
        tier: STRONG,
        target: ALLY,
        minLevel: 85,
        effects: only({ type: 'HEAL', power: MAX_SKILL_POWER }),
      },
      {
        key: 'prisma',
        name: 'Prisma',
        variant: 'cristal',
        tier: REINFORCED,
        target: ALLY,
        area: GRID,
        minLevel: 90,
        effects: only(modifier(Stat.DEFENSE, 15, undefined, BUFF_DURATION)),
      },
      {
        key: 'estilhacos-de-cristal',
        name: 'Estilhaços de Cristal',
        variant: 'cristal',
        tier: STRONG,
        range: RANGED,
        area: GRID,
        minLevel: 95,
        effects: damageWith(1, status(StatusType.ROOT)),
      },
      {
        key: 'coracao-de-cristal',
        name: 'Coração de Cristal',
        variant: 'cristal',
        tier: FINAL,
        target: ALLY,
        area: GRID,
        minLevel: 100,
        effects: only(
          { type: 'HEAL', power: MAX_SKILL_POWER },
          { type: 'CLEANSE' }
        ),
      },
    ],
  },
  {
    key: 'rolf-eidvar',
    name: 'Rolf Eidvar',
    description:
      'Atirador cego que se localiza vendo as almas. O ataque de longa distância da CORE, com rifle de precisão e balas imbuídas da própria alma. Calmo e sereno; por pecados antigos, sempre disposto ao sacrifício.',
    characterClass: CharacterClass.MARKSMAN,
    rarity: Rarity.B,
    danger: DangerLevel.CONTINUOUS,
    variants: ['alma'],
    npcTrait: 'mira-firme',
    npcPriority: [
      'ultimo-disparo',
      'sentenca-da-alma',
      'tiro-na-alma',
      'elo-de-almas',
      'bala-de-alma',
      'ler-a-alma',
      'em-meu-lugar',
      'tiro-da-alma',
      'tiro-certeiro',
    ],
    passive: {
      name: 'Primeiro a Cair',
      description: 'Ao ser derrotado, os aliados adiantam a vez em 30% (D124).',
      trigger: { type: 'ON_DEFEATED' },
      effects: [{ type: 'ADVANCE_ALLIES', percent: 30 }],
    },
    skills: [
      {
        key: 'tiro-certeiro',
        name: 'Tiro Certeiro',
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
        key: 'elo-de-almas',
        name: 'Elo de Almas',
        variant: 'alma',
        tier: STANDARD,
        range: RANGED,
        // amarra duas almas: o que um sente, o vizinho sente também (D146)
        effects: damageWith(STATUS_ONLY_DAMAGE, status(StatusType.LINK)),
      },
      {
        key: 'ler-a-alma',
        name: 'Ler a Alma',
        variant: 'alma',
        tier: STANDARD,
        slot: K.ROLE,
        range: RANGED,
        effects: damageWith(STATUS_ONLY_DAMAGE, status(StatusType.MARK)),
      },
      {
        key: 'bala-de-alma',
        name: 'Bala de Alma',
        variant: 'alma',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: PIERCING,
        effects: damageWith(0.9, modifier(Stat.WILL, -10)),
      },
      {
        key: 'em-meu-lugar',
        name: 'Em Meu Lugar',
        variant: 'alma',
        tier: STANDARD,
        target: ALLY,
        // Proteger (D124): o sacrifício, o golpe no aliado adjacente cai no Rolf
        effects: only({ type: 'PROTECT' }),
      },
      {
        key: 'tiro-na-alma',
        name: 'Tiro na Alma',
        variant: 'alma',
        tier: REINFORCED,
        range: RANGED,
        effects: damageWith(0.8, status(StatusType.LOCK)),
      },
      {
        key: 'sentenca-da-alma',
        name: 'Sentença da Alma',
        variant: 'alma',
        tier: STRONG,
        range: RANGED,
        // executar (D125): ×1,5 em alvo Marcado, e a marca se apaga
        effects: (power) => [
          { type: 'DAMAGE', power },
          {
            type: 'EXPLOIT',
            status: StatusType.MARK,
            multiplier: 1.5,
            consume: true,
          },
        ],
      },
      {
        key: 'ultimo-disparo',
        name: 'Último Disparo',
        variant: 'alma',
        tier: FINAL,
        range: PIERCING,
        effects: damage(),
      },
    ],
  },
  {
    key: 'kara',
    name: 'Kara',
    description:
      'Progressista, com uma visão clara do mundo que deseja; afrontosa, mas muito amorosa com os seus. Discute com o Ecko e é nele que mais confia. Ilusão de suporte: confunde inimigos, ergue a moral e faz sonhar acordado, de lança, no corpo a corpo.',
    characterClass: CharacterClass.SUPPORT,
    rarity: Rarity.B,
    danger: DangerLevel.CONTINUOUS,
    variants: ['ilusao'],
    npcTrait: 'sangue-frio',
    npcPriority: [
      'civilizacao',
      'perdidos',
      'abrigo-ilusorio',
      'sono-profundo',
      'vertigem',
      'sonho-acordado',
      'moral',
      'lanca-ilusoria',
      'golpe-de-lanca',
    ],
    passive: {
      name: 'Pelos Meus',
      description:
        'Quando um aliado cai, +20% de Ataque até o fim do próximo turno.',
      trigger: { type: 'ON_ALLY_DEFEATED' },
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 20 }],
    },
    skills: [
      {
        key: 'golpe-de-lanca',
        name: 'Golpe de Lança',
        variant: 'ilusao',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'lanca-ilusoria',
        name: 'Lança Ilusória',
        variant: 'ilusao',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'moral',
        name: 'Moral',
        variant: 'ilusao',
        tier: STANDARD,
        slot: K.ROLE,
        target: ALLY,
        area: GRID,
        // buff de squad (12.8): magnitude ×0,7
        effects: only(modifier(Stat.ATTACK, 7, undefined, BUFF_DURATION)),
      },
      {
        key: 'sonho-acordado',
        name: 'Sonho Acordado',
        variant: 'ilusao',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: RANGED,
        effects: damageWith(STATUS_ONLY_DAMAGE, status(StatusType.STUN)),
      },
      {
        key: 'sono-profundo',
        name: 'Sono Profundo',
        variant: 'ilusao',
        tier: REINFORCED,
        range: RANGED,
        // sem dano: qualquer golpe acorda (D146)
        effects: only(status(StatusType.SLEEP)),
      },
      {
        key: 'vertigem',
        name: 'Vertigem',
        variant: 'ilusao',
        tier: REINFORCED,
        range: RANGED,
        // a ilusão troca o alvo de lugar com um inimigo adjacente (D111)
        effects: damageWith(0.8, { type: 'REPOSITION', kind: 'SWAP' }),
      },
      {
        key: 'abrigo-ilusorio',
        name: 'Abrigo Ilusório',
        variant: 'ilusao',
        tier: REINFORCED,
        target: ALLY,
        // skill de recuperação (9.4b, D120): cura e alivia 50% do Desgaste
        effects: (power) => [
          { type: 'HEAL', power: r2(power * SUPPORT_BONUS) },
          { type: 'RECOVER' },
        ],
      },
      {
        key: 'perdidos',
        name: 'Perdidos',
        variant: 'ilusao',
        tier: STRONG,
        range: RANGED,
        area: GRID,
        // debuff de squad (12.8): magnitude ×0,7
        effects: only(modifier(Stat.PRECISION, -14)),
      },
      {
        key: 'civilizacao',
        name: 'Civilização',
        variant: 'ilusao',
        tier: FINAL,
        target: ALLY,
        area: GRID,
        effects: only(
          modifier(Stat.ATTACK, 14, undefined, BUFF_DURATION),
          modifier(Stat.DEFENSE, 14, undefined, BUFF_DURATION)
        ),
      },
    ],
  },
  {
    key: 'tyir-ossvald',
    name: 'Tyir Ossvald',
    description:
      'O mais experiente da CORE; ex-comandante genial e disruptivo. Os ossos o protegem e a maça é o golpe de perto, mas a arma maior é a inteligência tática. Busca redenção pela nação perdida; quase um pai para o Ecko.',
    characterClass: CharacterClass.TACTICIAN,
    rarity: Rarity.A,
    danger: DangerLevel.DIFFERENTIABLE,
    variants: ['ossos'],
    npcTrait: 'impeto',
    npcPriority: [
      'agora',
      'lancas-de-osso',
      'ler-a-batalha',
      'peste-de-osso',
      'comando',
      'formacao-de-guerra',
      'couraca-de-osso',
      'reposicionar-tropa',
      'maca-de-osso',
      'golpe-de-maca',
    ],
    passive: {
      name: 'Veterano',
      description:
        'Já viu de tudo: ao ser Atordoado, as recargas de todas as skills baixam 1.',
      trigger: { type: 'ON_STATUS', status: StatusType.STUN },
      effects: [{ type: 'REDUCE_COOLDOWN', amount: 1, scope: 'ALL' }],
    },
    skills: [
      {
        key: 'golpe-de-maca',
        name: 'Golpe de Maça',
        variant: 'ossos',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'maca-de-osso',
        name: 'Maça de Osso',
        variant: 'ossos',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'comando',
        name: 'Comando',
        variant: 'ossos',
        tier: STANDARD,
        slot: K.ROLE,
        target: ALLY,
        // Comando (D126): o aliado age logo depois do Tyir
        cooldown: 3,
        effects: only({ type: 'GRANT_TURN' }),
      },
      {
        key: 'couraca-de-osso',
        name: 'Couraça de Osso',
        variant: 'ossos',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
        effects: damageWith(0.8, modifier(Stat.DEFENSE, 10, 'SELF')),
      },
      {
        key: 'reposicionar-tropa',
        name: 'Reposicionar Tropa',
        variant: 'ossos',
        tier: STANDARD,
        target: ALLY,
        // move um aliado para uma célula adjacente (ou troca com quem está lá), sem custar a ação dele (12.8)
        effects: only({ type: 'REPOSITION', kind: 'MOVE_ALLY' }),
      },
      {
        key: 'ler-a-batalha',
        name: 'Ler a Batalha',
        variant: 'ossos',
        tier: REINFORCED,
        range: RANGED,
        // atrasar a vez de um inimigo (12.8): Reforçada −40%, cooldown 3
        cooldown: 3,
        effects: only({ type: 'TURN_SHIFT', percent: -40 }),
      },
      {
        key: 'formacao-de-guerra',
        name: 'Formação de Guerra',
        variant: 'ossos',
        tier: REINFORCED,
        target: ALLY,
        area: GRID,
        // buff de squad (12.8): magnitude ×0,7
        effects: only(modifier(Stat.SPEED, 10, undefined, BUFF_DURATION)),
      },
      {
        key: 'peste-de-osso',
        name: 'Peste de Osso',
        variant: 'ossos',
        tier: REINFORCED,
        range: RANGED,
        // farpas de osso que passam de um para o outro (D146); o golpe é fraco, o perigo é o Contágio
        effects: only(
          { type: 'DAMAGE', power: 0.45 },
          status(StatusType.DOT),
          status(StatusType.CONTAGION)
        ),
      },
      {
        key: 'lancas-de-osso',
        name: 'Lanças de Osso',
        variant: 'ossos',
        tier: STRONG,
        range: MELEE,
        area: LINE,
        effects: damage(),
      },
      {
        key: 'agora',
        name: 'Agora!',
        variant: 'ossos',
        tier: FINAL,
        target: ALLY,
        // Comando Forte (D126): age logo depois, com +15% de Ataque
        cooldown: 2,
        effects: only({ type: 'GRANT_TURN', attackPercent: 15 }),
      },
    ],
  },
  {
    key: 'isis-maccarthy',
    name: 'Isis Maccarthy',
    description:
      'A artilharia aérea da CORE: telecinese absurda, cobre uma grande área do céu; fraca no corpo a corpo. Esculpe uma liga de metal na forma que quiser. Moleca, sempre rindo e arrumando problema.',
    characterClass: CharacterClass.ARTILLERY,
    rarity: Rarity.B,
    danger: DangerLevel.CONTINUOUS,
    variants: ['telecinese'],
    npcTrait: 'olho-de-aguia',
    npcPriority: [
      'queda-livre',
      'tempestade',
      'estilhacos',
      'onda-telecinetica',
      'chuva-de-metal',
      'puxao',
      'lamina-de-liga',
      'arremesso',
    ],
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
        key: 'lamina-de-liga',
        name: 'Lâmina de Liga',
        variant: 'telecinese',
        tier: STANDARD,
        slot: K.STANDARD,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'chuva-de-metal',
        name: 'Chuva de Metal',
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
        key: 'onda-telecinetica',
        name: 'Onda Telecinética',
        variant: 'telecinese',
        tier: REINFORCED,
        range: RANGED,
        effects: damageWith(0.8, { type: 'REPOSITION', kind: 'PUSH' }),
      },
      {
        key: 'estilhacos',
        name: 'Estilhaços',
        variant: 'telecinese',
        tier: REINFORCED,
        range: RANGED,
        area: COLUMN,
        effects: damageWith(1, status(StatusType.DOT)),
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
      'O mais novo da CORE, sem variante: prodígio do DOM. Menosprezado, se esforça mais que todos para ser digno da CORE. Respeitoso com todos; idolatra o Ecko, que o escolheu.',
    characterClass: CharacterClass.GUARDIAN,
    rarity: Rarity.C,
    danger: DangerLevel.DISCRETE,
    variants: [],
    npcTrait: 'muralha-viva',
    // Abrir a Guarda logo depois da Final: sem ela, do nível 40 em diante ele não equipava nenhum dano (D148)
    npcPriority: [
      'esforco',
      'abrir-a-guarda',
      'aqui',
      'escudo-humano',
      'muralha-humana',
      'escudo-vivo',
      'investida',
      'soco-firme',
    ],
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
        key: 'escudo-vivo',
        name: 'Escudo Vivo',
        variant: null,
        tier: STANDARD,
        slot: K.ROLE,
        target: ALLY,
        // Proteger (D124): golpes de alvo único no aliado adjacente caem no Tank
        effects: only({ type: 'PROTECT' }),
      },
      {
        key: 'abrir-a-guarda',
        name: 'Abrir a Guarda',
        variant: null,
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
        effects: damageWith(0.8, status(StatusType.EXPOSE)),
      },
      {
        key: 'aqui',
        name: 'Aqui!',
        variant: null,
        tier: REINFORCED,
        range: RANGED,
        area: LINE,
        // Provocar Reforçada (D124): uma linha
        effects: only(status(StatusType.TAUNT)),
      },
      {
        key: 'escudo-humano',
        name: 'Escudo Humano',
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
        effects: (power) => [
          modifier(Stat.DEFENSE, 20, undefined, BUFF_DURATION),
          { type: 'SHIELD', power: r2(power * 0.75) },
        ],
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

/**
 * Personagens de baú (D150): não vêm na conta nova (`isStarter` falso), só saem de baú. Randoms de famílias ancestrais
 * (`world_build.md` 4.2), de raridade baixa (D85), para testar o sorteio do baú. Sem traço de família (as famílias
 * ancestrais ainda não têm traço) e fora dos squads de NPC.
 */
export const CHEST_CHARACTERS: CharacterSpec[] = [
  {
    key: 'brann-granek',
    name: 'Brann Granek',
    description:
      'Granek dos Picos de Alpha, cobrador de pedágio de montanha. Pele de pedra e paciência de rocha: segura a linha enquanto os outros trabalham.',
    characterClass: CharacterClass.GUARDIAN,
    rarity: Rarity.E,
    danger: DangerLevel.DISCRETE,
    variants: ['rocha'],
    npcTrait: 'muralha-viva',
    npcPriority: [
      'montanha',
      'tremor',
      'muro-de-pedra',
      'pele-de-granito',
      'desabamento',
      'punho-de-rocha',
      'pedrada',
    ],
    passive: {
      name: 'Rocha Rachada',
      description: 'Com HP abaixo de 50%, ganha +15% de Defesa.',
      trigger: { type: 'HP_BELOW', percent: 50 },
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.DEFENSE, percent: 15 }],
    },
    skills: [
      {
        key: 'pedrada',
        name: 'Pedrada',
        variant: 'rocha',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'punho-de-rocha',
        name: 'Punho de Rocha',
        variant: 'rocha',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'muro-de-pedra',
        name: 'Muro de Pedra',
        variant: 'rocha',
        tier: STANDARD,
        slot: K.ROLE,
        target: ALLY,
        // Proteger (D124): golpes de alvo único no aliado adjacente caem nele
        effects: only({ type: 'PROTECT' }),
      },
      {
        key: 'tremor',
        name: 'Tremor',
        variant: 'rocha',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
        effects: damageWith(0.8, status(StatusType.ROOT)),
      },
      {
        key: 'pele-de-granito',
        name: 'Pele de Granito',
        variant: 'rocha',
        tier: REINFORCED,
        target: SELF,
        effects: only(modifier(Stat.DEFENSE, 20, undefined, BUFF_DURATION)),
      },
      {
        key: 'desabamento',
        name: 'Desabamento',
        variant: 'rocha',
        tier: STRONG,
        range: RANGED,
        area: LINE,
        effects: damage(),
      },
      {
        key: 'montanha',
        name: 'Montanha',
        variant: 'rocha',
        tier: FINAL,
        range: MELEE,
        effects: damage(),
      },
    ],
  },
  {
    key: 'vesna-kovarik',
    name: 'Vesna Kovarik',
    description:
      'Engenheira de armamento da zona industrial de Carmesin. Amoral e prática: forja a arma no meio da luta e cobra por projeto.',
    characterClass: CharacterClass.VANGUARD,
    rarity: Rarity.E,
    danger: DangerLevel.DISCRETE,
    variants: ['metal'],
    npcTrait: 'berserker',
    npcPriority: [
      'fundicao',
      'lanca-de-ferro',
      'estilhacos',
      'blindar-aliado',
      'corte-largo',
      'martelo-forjado',
      'lamina-de-aco',
    ],
    passive: {
      name: 'Reaproveitar',
      description: 'Ao derrotar um inimigo, recupera 10% do HP máximo.',
      trigger: { type: 'ON_KILL' },
      effects: [{ type: 'HEAL', percentOfMaxHp: 10 }],
    },
    skills: [
      {
        key: 'lamina-de-aco',
        name: 'Lâmina de Aço',
        variant: 'metal',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'martelo-forjado',
        name: 'Martelo Forjado',
        variant: 'metal',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'corte-largo',
        name: 'Corte Largo',
        variant: 'metal',
        tier: STANDARD,
        slot: K.ROLE,
        range: MELEE,
        area: LINE,
        effects: damage(),
      },
      {
        key: 'estilhacos',
        name: 'Estilhaços',
        variant: 'metal',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: MELEE,
        // lascas de metal ficam cravadas: sangramento
        effects: damageWith(0.8, status(StatusType.DOT)),
      },
      {
        key: 'blindar-aliado',
        name: 'Blindar Aliado',
        variant: 'metal',
        tier: REINFORCED,
        target: ALLY,
        effects: shield,
      },
      {
        key: 'lanca-de-ferro',
        name: 'Lança de Ferro',
        variant: 'metal',
        tier: STRONG,
        range: PIERCING,
        effects: damage(),
      },
      {
        key: 'fundicao',
        name: 'Fundição',
        variant: 'metal',
        tier: FINAL,
        range: MELEE,
        area: LINE,
        effects: damage(),
      },
    ],
  },
  {
    key: 'oren-ignara',
    name: 'Oren Ignara',
    description:
      'Mercenário de demolição do sul quente de Alpha. Na Ignara manda quem fez o maior feito dos últimos 3 anos, e ele quer ser o próximo.',
    characterClass: CharacterClass.ARTILLERY,
    rarity: Rarity.D,
    danger: DangerLevel.CONTINUOUS,
    variants: ['combustao'],
    npcTrait: 'olho-de-aguia',
    npcPriority: [
      'combustao-total',
      'demolicao',
      'incendiar',
      'barragem',
      'carga-explosiva',
      'disparo-incendiario',
      'fagulha',
    ],
    passive: {
      name: 'Pavio Curto',
      description:
        'Ao atacar, 15% de chance de deixar o alvo com Dano contínuo.',
      trigger: { type: 'ON_ATTACK' },
      effects: [
        {
          type: 'APPLY_STATUS',
          status: StatusType.DOT,
          target: 'TARGET',
          chance: 0.15,
        },
      ],
    },
    skills: [
      {
        key: 'fagulha',
        name: 'Fagulha',
        variant: 'combustao',
        tier: BASIC,
        slot: K.BASIC,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'disparo-incendiario',
        name: 'Disparo Incendiário',
        variant: 'combustao',
        tier: STANDARD,
        slot: K.STANDARD,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'carga-explosiva',
        name: 'Carga Explosiva',
        variant: 'combustao',
        tier: STANDARD,
        slot: K.ROLE,
        range: RANGED,
        area: LINE,
        effects: damage(),
      },
      {
        key: 'incendiar',
        name: 'Incendiar',
        variant: 'combustao',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: RANGED,
        effects: damageWith(0.8, status(StatusType.DOT)),
      },
      {
        key: 'barragem',
        name: 'Barragem',
        variant: 'combustao',
        tier: REINFORCED,
        range: RANGED,
        area: COLUMN,
        effects: damage(),
      },
      {
        key: 'demolicao',
        name: 'Demolição',
        variant: 'combustao',
        tier: STRONG,
        range: RANGED,
        area: GRID,
        effects: damage(),
      },
      {
        key: 'combustao-total',
        name: 'Combustão Total',
        variant: 'combustao',
        tier: FINAL,
        range: RANGED,
        area: LINE,
        effects: damage(),
      },
      {
        key: 'feixe-de-plasma',
        name: 'Feixe de Plasma',
        variant: 'plasma',
        tier: REINFORCED,
        range: PIERCING,
        minLevel: 80,
        // despertadas (D151): Poder ×1,25 e Desgaste ×1,5 sobre a referência
        effects: damage(),
      },
      {
        key: 'arco-de-plasma',
        name: 'Arco de Plasma',
        variant: 'plasma',
        tier: STRONG,
        range: RANGED,
        area: LINE,
        minLevel: 85,
        effects: damageWith(1, status(StatusType.DOT)),
      },
      {
        key: 'sobrecarga',
        name: 'Sobrecarga',
        variant: 'plasma',
        tier: REINFORCED,
        target: SELF,
        minLevel: 90,
        effects: only(modifier(Stat.ATTACK, 25, undefined, BUFF_DURATION)),
      },
      {
        key: 'chuva-de-plasma',
        name: 'Chuva de Plasma',
        variant: 'plasma',
        tier: STRONG,
        range: RANGED,
        area: GRID,
        minLevel: 95,
        effects: damage(),
      },
      {
        key: 'sol-artificial',
        name: 'Sol Artificial',
        variant: 'plasma',
        tier: FINAL,
        range: RANGED,
        area: LINE,
        minLevel: 100,
        effects: damage(),
      },
    ],
  },
  {
    key: 'mira-kisar',
    name: 'Mira Kisar',
    description:
      'Observadora de uma célula Kisar em Delta. Ninguém sabe se a Névoa Central existe; ela sabe que a névoa esconde uma lâmina.',
    characterClass: CharacterClass.EXECUTOR,
    rarity: Rarity.D,
    danger: DangerLevel.CONTINUOUS,
    variants: ['nevoa'],
    npcTrait: 'passo-leve',
    npcPriority: [
      'ultimo-suspiro',
      'execucao-silenciosa',
      'atravessar-a-nevoa',
      'sumir-na-nevoa',
      'nevoa-cegante',
      'golpe-na-nevoa',
      'adaga-umida',
    ],
    passive: {
      name: 'Forma Difusa',
      description: 'A cada 3 turnos dela, ganha +15% de Esquiva.',
      trigger: { type: 'PERIODIC', everyTurns: 3 },
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.EVASION, percent: 15 }],
    },
    skills: [
      {
        key: 'adaga-umida',
        name: 'Adaga Úmida',
        variant: 'nevoa',
        tier: BASIC,
        slot: K.BASIC,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'golpe-na-nevoa',
        name: 'Golpe na Névoa',
        variant: 'nevoa',
        tier: STANDARD,
        slot: K.STANDARD,
        range: MELEE,
        effects: damage(),
      },
      {
        key: 'atravessar-a-nevoa',
        name: 'Atravessar a Névoa',
        variant: 'nevoa',
        tier: STANDARD,
        slot: K.ROLE,
        range: FLANK,
        effects: damage(),
      },
      {
        key: 'sumir-na-nevoa',
        name: 'Sumir na Névoa',
        variant: 'nevoa',
        tier: STANDARD,
        slot: K.SIGNATURE,
        target: SELF,
        // some até a próxima vez dela (D146); a recarga impede ficar sumida o tempo todo
        cooldown: 3,
        effects: only(status(StatusType.STEALTH)),
      },
      {
        key: 'nevoa-cegante',
        name: 'Névoa Cegante',
        variant: 'nevoa',
        tier: REINFORCED,
        range: RANGED,
        area: LINE,
        effects: only(modifier(Stat.PRECISION, -15)),
      },
      {
        key: 'execucao-silenciosa',
        name: 'Execução Silenciosa',
        variant: 'nevoa',
        tier: STRONG,
        range: FLANK,
        effects: damage(),
      },
      {
        key: 'ultimo-suspiro',
        name: 'Último Suspiro',
        variant: 'nevoa',
        tier: FINAL,
        range: MELEE,
        effects: damage(),
      },
    ],
  },
  {
    key: 'lio-virelli',
    name: 'Lio Virelli',
    description:
      'Ressonante menor do Conselho de Frequência, em Beta. Ouve a mentira na voz de quem fala e cala quem fala demais.',
    characterClass: CharacterClass.CONTROLLER,
    rarity: Rarity.C,
    danger: DangerLevel.DIFFERENTIABLE,
    variants: ['som'],
    npcTrait: 'sangue-frio',
    npcPriority: [
      'grito-do-ressonante',
      'ressonancia',
      'frequencia-paralisante',
      'cancao-de-ninar',
      'silencio-absoluto',
      'onda-sonora',
      'nota-aguda',
    ],
    passive: {
      name: 'Eco',
      description:
        'Ao receber dano, 20% de chance de Silenciar quem o atingiu.',
      trigger: { type: 'ON_HIT' },
      effects: [
        {
          type: 'APPLY_STATUS',
          status: StatusType.SILENCE,
          target: 'ATTACKER',
          chance: 0.2,
        },
      ],
    },
    skills: [
      {
        key: 'nota-aguda',
        name: 'Nota Aguda',
        variant: 'som',
        tier: BASIC,
        slot: K.BASIC,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'onda-sonora',
        name: 'Onda Sonora',
        variant: 'som',
        tier: STANDARD,
        slot: K.STANDARD,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'frequencia-paralisante',
        name: 'Frequência Paralisante',
        variant: 'som',
        tier: STANDARD,
        slot: K.ROLE,
        range: RANGED,
        effects: damageWith(STATUS_ONLY_DAMAGE, status(StatusType.STUN)),
      },
      {
        key: 'silencio-absoluto',
        name: 'Silêncio Absoluto',
        variant: 'som',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: RANGED,
        effects: damageWith(STATUS_ONLY_DAMAGE, status(StatusType.SILENCE)),
      },
      {
        key: 'cancao-de-ninar',
        name: 'Canção de Ninar',
        variant: 'som',
        tier: REINFORCED,
        range: RANGED,
        effects: only(status(StatusType.SLEEP)),
      },
      {
        key: 'ressonancia',
        name: 'Ressonância',
        variant: 'som',
        tier: STRONG,
        range: RANGED,
        area: LINE,
        effects: damage(),
      },
      {
        key: 'grito-do-ressonante',
        name: 'Grito do Ressonante',
        variant: 'som',
        tier: FINAL,
        range: RANGED,
        area: GRID,
        effects: damage(),
      },
    ],
  },
  {
    key: 'dax-zarek',
    name: 'Dax Zarek',
    description:
      'Mercenário de elite de Epsilon. Entre os Zarek manda o mais rápido, e Dax só cobra por missão cumprida.',
    characterClass: CharacterClass.MARKSMAN,
    rarity: Rarity.B,
    danger: DangerLevel.NON_LINEAR,
    variants: ['relampago'],
    npcTrait: 'mira-firme',
    npcPriority: [
      'primeiro-raio',
      'trovao',
      'marcar-o-alvo',
      'tiro-perfurante',
      'corrente',
      'disparo-eletrico',
      'faisca',
    ],
    passive: {
      name: 'Hierarquia da Velocidade',
      description: 'Ao derrotar um inimigo, adianta a própria vez em 25%.',
      trigger: { type: 'ON_KILL' },
      effects: [{ type: 'ADVANCE_TURN', percent: 25 }],
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
        key: 'disparo-eletrico',
        name: 'Disparo Elétrico',
        variant: 'relampago',
        tier: STANDARD,
        slot: K.STANDARD,
        range: RANGED,
        effects: damage(),
      },
      {
        key: 'tiro-perfurante',
        name: 'Tiro Perfurante',
        variant: 'relampago',
        tier: STANDARD,
        slot: K.ROLE,
        range: PIERCING,
        effects: damage(),
      },
      {
        key: 'marcar-o-alvo',
        name: 'Marcar o Alvo',
        variant: 'relampago',
        tier: STANDARD,
        slot: K.SIGNATURE,
        range: RANGED,
        effects: damageWith(STATUS_ONLY_DAMAGE, status(StatusType.MARK)),
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
        key: 'primeiro-raio',
        name: 'Primeiro Raio',
        variant: 'relampago',
        tier: FINAL,
        range: RANGED,
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
  variants: Map<string, Variant>,
  overrides: ContentOverrides = {}
): Skill {
  const target = spec.target ?? SkillTarget.ENEMY
  const area = spec.area ?? SkillArea.SINGLE
  const enemy = target === SkillTarget.ENEMY
  const range =
    overrides.skillRanges?.[`${owner.key}:${spec.key}`] ?? spec.range
  const ref = skillReference({
    tier: spec.tier,
    target,
    range: enemy ? range : null,
    area,
    isNone: spec.variant === null,
    isAwakened: spec.variant ? variants.get(spec.variant)!.isAwakened : false,
  })

  return unwrap(
    Skill.create({
      key: `${owner.key}:${spec.key}`,
      name: spec.name,
      variant: spec.variant ? variants.get(spec.variant)! : null,
      tier: spec.tier,
      target,
      range: enemy ? range! : null,
      area,
      cooldown: spec.cooldown ?? ref.cooldown,
      desgastePercent: ref.desgastePercent,
      baseHitChance: enemy ? 0.8 : null,
      minLevel: spec.minLevel ?? ref.minLevel,
      kitClass: spec.slot ? owner.characterClass : null,
      kitSlot: spec.slot ?? null,
      effects:
        overrides.skillEffects?.[`${owner.key}:${spec.key}`] ??
        spec.effects(ref.power),
    }),
    `skill ${owner.key}:${spec.key}`
  )
}

/** Ajustes para experimentos de balanceamento (`scripts/balance.sim.ts`): stats por classe ou por personagem. */
export interface ContentOverrides {
  classProfiles?: Partial<Record<CharacterClass, Partial<StatBlock>>>
  characterStats?: Record<string, Partial<StatBlock>>
  /** Efeitos de uma skill (`modelo:skill`), com o Poder já final. */
  skillEffects?: Record<string, SkillEffect[]>
  /** Alcance de uma skill (`modelo:skill`); a referência de Poder e custo é recalculada. */
  skillRanges?: Record<string, SkillRange>
  /** Efeitos da passiva de um personagem (`key` do modelo). */
  passiveEffects?: Record<string, Passive['effects']>
}

export function buildCharacters(
  variants: Map<string, Variant>,
  traits: Map<string, Trait>,
  overrides: ContentOverrides = {}
): BuiltCharacter[] {
  const specs = [
    ...CHARACTERS.map((spec) => ({ spec, isStarter: true })),
    ...CHEST_CHARACTERS.map((spec) => ({ spec, isStarter: false })),
  ]

  return specs.map(({ spec, isStarter }) => {
    const template = unwrap(
      CharacterTemplate.create({
        key: spec.key,
        name: spec.name,
        description: spec.description,
        characterClass: spec.characterClass,
        rarity: spec.rarity,
        initialDanger: spec.danger,
        exclusivity: Exclusivity.NONE,
        isStarter,
        variants: spec.variants.map((key, i) => ({
          variant: variants.get(key)!,
          isPrimary: i === 0,
        })),
        familyTrait: spec.familyTrait ? traits.get(spec.familyTrait)! : null,
        stats: {
          ...CLASS_PROFILES[spec.characterClass],
          ...overrides.classProfiles?.[spec.characterClass],
          ...overrides.characterStats?.[spec.key],
        },
        passive: overrides.passiveEffects?.[spec.key]
          ? { ...spec.passive, effects: overrides.passiveEffects[spec.key] }
          : spec.passive,
      }),
      `modelo ${spec.key}`
    )

    return {
      spec,
      template,
      skills: spec.skills.map((s) => buildSkill(s, spec, variants, overrides)),
    }
  })
}
