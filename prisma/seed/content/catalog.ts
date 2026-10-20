import { Either } from '@/core/either'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Stat } from '@/domain/characters/enums/stat'
import { TraitCategory } from '@/domain/characters/enums/trait-category'
import { TraitSource } from '@/domain/characters/enums/trait-source'
import { TraitEffect } from '@/domain/characters/value-objects/trait-effect'
import { BattleField } from '@/domain/combat/entities/battle-field'
import { SkillRange } from '@/domain/skills/enums/skill-range'

/** O seed é infra: conteúdo inválido é erro de programação, então para tudo com a mensagem do domínio. */
export function unwrap<E extends Error, T>(
  result: Either<E, T>,
  what: string
): T {
  if (result.isLeft()) {
    throw new Error(`seed: ${what}: ${result.value.message}`)
  }

  return result.value
}

// ---------------------------------------------------------------------------
// Variantes (uma por poder dos personagens; o Tank Valen não tem variante)
// ---------------------------------------------------------------------------

const VARIANTS: {
  key: string
  name: string
  lineage: Lineage
  description: string
}[] = [
  {
    key: 'antimateria',
    name: 'Antimatéria',
    lineage: Lineage.FUNDAMENTAL,
    description: 'Apaga matéria; a viva custa mais.',
  },
  {
    key: 'explosao',
    name: 'Explosão',
    lineage: Lineage.VECTORIAL,
    description: 'Impacto e onda de choque.',
  },
  {
    key: 'endurecimento',
    name: 'Endurecimento',
    lineage: Lineage.MATERIAL,
    description: 'Densifica o próprio corpo.',
  },
  {
    key: 'regeneracao',
    name: 'Regeneração',
    lineage: Lineage.BIOLOGICAL,
    description: 'Recupera tecido sem parar.',
  },
  {
    key: 'relampago',
    name: 'Relâmpago',
    lineage: Lineage.ELEMENTAL,
    description: 'Descargas elétricas e velocidade.',
  },
  {
    key: 'tempo',
    name: 'Tempo',
    lineage: Lineage.FUNDAMENTAL,
    description: 'Acelera e atrasa o próprio fluxo.',
  },
  {
    key: 'gelo-superionico',
    name: 'Gelo Superiônico',
    lineage: Lineage.ELEMENTAL,
    description: 'Gelo condutor, frio absoluto.',
  },
  {
    key: 'sombra',
    name: 'Sombra',
    lineage: Lineage.PSYCHIC,
    description: 'A sombra como segundo corpo (Hyperion).',
  },
  {
    key: 'terra',
    name: 'Terra',
    lineage: Lineage.MATERIAL,
    description: 'Rocha, muralhas e tremores.',
  },
  {
    key: 'alma',
    name: 'Alma',
    lineage: Lineage.FUNDAMENTAL,
    description: 'Vê e fere a alma do alvo.',
  },
  {
    key: 'ilusao',
    name: 'Ilusão',
    lineage: Lineage.PSYCHIC,
    description: 'Engana os sentidos.',
  },
  {
    key: 'resistencia',
    name: 'Resistência',
    lineage: Lineage.BIOLOGICAL,
    description: 'Corpo e mente que não cedem.',
  },
  {
    key: 'telecinese',
    name: 'Telecinese',
    lineage: Lineage.PSYCHIC,
    description: 'Move e arremessa à distância.',
  },
]

export function buildVariants(): Map<string, Variant> {
  return new Map(
    VARIANTS.map((v) => [v.key, unwrap(Variant.create(v), `variante ${v.key}`)])
  )
}

// ---------------------------------------------------------------------------
// Traços: 2 de família (Origem) e 7 conquistados (Combate e Postura)
// ---------------------------------------------------------------------------

interface TraitSpec {
  key: string
  name: string
  description: string
  category: TraitCategory
  /** Família: variante da família (nula = vale para todas as variantes). */
  family?: { variantKey: string | null }
  effects: TraitEffect[]
}

const TRAITS: TraitSpec[] = [
  {
    key: 'nocthar',
    name: 'Nocthar',
    description: 'Família da variante aleatória e do simbionte Alpha.',
    category: TraitCategory.ORIGIN,
    family: { variantKey: null },
    effects: [
      { type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 3 },
      { type: 'STAT_MODIFIER', stat: Stat.SPEED, percent: 3 },
    ],
  },
  {
    key: 'hyperion',
    name: 'Hyperion',
    description: 'Família da sombra; perde força em campo muito iluminado.',
    category: TraitCategory.ORIGIN,
    family: { variantKey: 'sombra' },
    effects: [{ type: 'STAT_MODIFIER', stat: Stat.EVASION, percent: 5 }],
  },
  {
    key: 'berserker',
    name: 'Berserker',
    description: '+10% de dano corpo a corpo.',
    category: TraitCategory.COMBAT,
    effects: [
      { type: 'SKILL_DAMAGE_MODIFIER', range: SkillRange.MELEE, percent: 10 },
    ],
  },
  {
    key: 'olho-de-aguia',
    name: 'Olho de Águia',
    description: '+10% de dano à distância.',
    category: TraitCategory.COMBAT,
    effects: [
      { type: 'SKILL_DAMAGE_MODIFIER', range: SkillRange.RANGED, percent: 10 },
    ],
  },
  {
    key: 'mira-firme',
    name: 'Mira Firme',
    description: '+5% de Precisão.',
    category: TraitCategory.COMBAT,
    effects: [{ type: 'STAT_MODIFIER', stat: Stat.PRECISION, percent: 5 }],
  },
  {
    key: 'muralha-viva',
    name: 'Muralha Viva',
    description: '+5% de Defesa.',
    category: TraitCategory.POSTURE,
    effects: [{ type: 'STAT_MODIFIER', stat: Stat.DEFENSE, percent: 5 }],
  },
  {
    key: 'sangue-frio',
    name: 'Sangue Frio',
    description: '+5% de Vontade.',
    category: TraitCategory.POSTURE,
    effects: [{ type: 'STAT_MODIFIER', stat: Stat.WILL, percent: 5 }],
  },
  {
    key: 'passo-leve',
    name: 'Passo Leve',
    description: '+5% de Esquiva.',
    category: TraitCategory.POSTURE,
    effects: [{ type: 'STAT_MODIFIER', stat: Stat.EVASION, percent: 5 }],
  },
  {
    key: 'impeto',
    name: 'Ímpeto',
    description: '+5% de Velocidade.',
    category: TraitCategory.POSTURE,
    effects: [{ type: 'STAT_MODIFIER', stat: Stat.SPEED, percent: 5 }],
  },
]

export function buildTraits(
  variants: Map<string, Variant>
): Map<string, Trait> {
  return new Map(
    TRAITS.map((t) => {
      const variantKey = t.family?.variantKey
      const trait = Trait.create({
        key: t.key,
        name: t.name,
        description: t.description,
        category: t.category,
        source: t.family ? TraitSource.TEMPLATE : TraitSource.CONQUERED,
        variantId: variantKey ? variants.get(variantKey)!.id : null,
        effects: t.effects,
      })
      return [t.key, unwrap(trait, `traço ${t.key}`)]
    })
  )
}

// ---------------------------------------------------------------------------
// Campos de batalha (MVP: 6 campos, 3 traços cada, `skills_brief.md` 12.7)
// ---------------------------------------------------------------------------

const FIELDS: {
  key: string
  name: string
  description: string
  traits: string[]
  primary: Stat
  secondary: Stat
}[] = [
  {
    key: 'arena',
    name: 'Arena',
    description: 'Chão batido e plateia: quem ataca primeiro.',
    traits: ['berserker', 'impeto', 'nocthar'],
    primary: Stat.ATTACK,
    secondary: Stat.SPEED,
  },
  {
    key: 'floresta',
    name: 'Floresta',
    description: 'Sombras e galhos: favorece quem some.',
    traits: ['passo-leve', 'olho-de-aguia', 'hyperion'],
    primary: Stat.EVASION,
    secondary: Stat.PRECISION,
  },
  {
    key: 'fortaleza',
    name: 'Fortaleza',
    description: 'Muros e trincheiras.',
    traits: ['muralha-viva', 'sangue-frio', 'berserker'],
    primary: Stat.DEFENSE,
    secondary: Stat.WILL,
  },
  {
    key: 'planicie',
    name: 'Planície Aberta',
    description: 'Linha de visão limpa.',
    traits: ['olho-de-aguia', 'mira-firme', 'impeto'],
    primary: Stat.PRECISION,
    secondary: Stat.ATTACK,
  },
  {
    key: 'ruinas-de-carmesin',
    name: 'Ruínas de Carmesin',
    description: 'A cidade lembra de quem a defendeu.',
    traits: ['sangue-frio', 'nocthar', 'muralha-viva'],
    primary: Stat.WILL,
    secondary: Stat.HP,
  },
  {
    key: 'noite-sem-lua',
    name: 'Noite sem Lua',
    description: 'Escuridão total.',
    traits: ['passo-leve', 'hyperion', 'mira-firme'],
    primary: Stat.SPEED,
    secondary: Stat.EVASION,
  },
]

export function buildFields(traits: Map<string, Trait>): BattleField[] {
  return FIELDS.map((f) =>
    unwrap(
      BattleField.create({
        key: f.key,
        name: f.name,
        description: f.description,
        requiredTraits: f.traits.map((k) => traits.get(k)!),
        primaryStat: f.primary,
        secondaryStat: f.secondary,
      }),
      `campo ${f.key}`
    )
  )
}
