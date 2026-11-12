import { BeastTemplate } from '@/domain/beasts/entities/beast-template'
import { Stat } from '@/domain/characters/enums/stat'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { StatusType } from '@/domain/skills/enums/status-type'
import { unwrap } from './catalog'

// ---------------------------------------------------------------------------
// Bestas (D64, D95, D154): no MVP, uma por contrato (`beast_contracts_brief.md` 9.6) e a Fênix sagrada (só por evento,
// com cura ativa no lugar de ressurreição, 4). As skills seguem a referência do tipo (Poder 0,8 / 1,0 / 1,3).
// ---------------------------------------------------------------------------

type BeastSpec = Parameters<typeof BeastTemplate.create>[0]

const BEASTS: BeastSpec[] = [
  {
    key: 'lobo-de-cinzas',
    name: 'Lobo de Cinzas',
    description:
      'Obedece à força: morde o que o dono aponta e deixa brasa na ferida.',
    contract: 'DOMINANCE',
    grade: 'KNIGHT',
    lineage: 'ELEMENTAL',
    skills: [
      {
        name: 'Mordida',
        tier: SkillTier.BASIC,
        target: SkillTarget.ENEMY,
        range: SkillRange.MELEE,
        area: SkillArea.SINGLE,
        cooldown: 0,
        baseHitChance: 0.9,
        effects: [{ type: 'DAMAGE', power: 0.8 }],
      },
      {
        name: 'Investida em Brasa',
        tier: SkillTier.STANDARD,
        target: SkillTarget.ENEMY,
        range: SkillRange.MELEE,
        area: SkillArea.SINGLE,
        cooldown: 1,
        baseHitChance: 0.85,
        effects: [
          { type: 'DAMAGE', power: 1 },
          {
            type: 'APPLY_STATUS',
            status: StatusType.DOT,
            duration: 2,
            baseChance: 0.5,
          },
        ],
      },
    ],
    requirements: [],
    titles: [],
  },
  {
    key: 'falcao-de-tempestade',
    name: 'Falcão de Tempestade',
    description:
      'Só segue quem é mais rápido que ele. Ataca de longe e nunca no mesmo lugar.',
    contract: 'MASTER',
    grade: 'MASTER',
    lineage: 'VECTORIAL',
    skills: [
      {
        name: 'Rasante',
        tier: SkillTier.BASIC,
        target: SkillTarget.ENEMY,
        range: SkillRange.RANGED,
        area: SkillArea.SINGLE,
        cooldown: 0,
        baseHitChance: 0.95,
        effects: [{ type: 'DAMAGE', power: 0.8 }],
      },
      {
        name: 'Garras do Vento',
        tier: SkillTier.STANDARD,
        target: SkillTarget.ENEMY,
        range: SkillRange.RANGED,
        area: SkillArea.SINGLE,
        cooldown: 1,
        baseHitChance: 0.9,
        effects: [
          { type: 'DAMAGE', power: 1 },
          { type: 'TURN_SHIFT', percent: -20 },
        ],
      },
    ],
    requirements: [
      { stat: Stat.SPEED, level: 'HIGH' },
      { stat: Stat.PRECISION, level: 'HIGH' },
      { stat: Stat.HP, level: 'LOW' },
    ],
    titles: ['Vidente', 'Rei'],
  },
  {
    key: 'serpente-espelho',
    name: 'Serpente Espelho',
    description:
      'Enrola-se no dono e vê pelos olhos dele: a dor de um é a do outro.',
    contract: 'EQUALITY',
    grade: 'KING',
    lineage: 'PSYCHIC',
    skills: [],
    requirements: [],
    titles: [],
  },
  {
    key: 'fenix',
    name: 'Fênix',
    description:
      'Sagrada. Não renasce em batalha: queima e cura com o mesmo fogo.',
    contract: 'MASTER',
    grade: 'SACRED',
    lineage: 'ELEMENTAL',
    skills: [
      {
        name: 'Chama Renascida',
        tier: SkillTier.STANDARD,
        target: SkillTarget.ALLY,
        area: SkillArea.SINGLE,
        cooldown: 2,
        effects: [{ type: 'HEAL', power: 1 }],
      },
      {
        name: 'Mergulho Ígneo',
        tier: SkillTier.REINFORCED,
        target: SkillTarget.ENEMY,
        range: SkillRange.RANGED,
        area: SkillArea.SINGLE,
        cooldown: 2,
        baseHitChance: 0.85,
        effects: [{ type: 'DAMAGE', power: 1.3 }],
      },
    ],
    requirements: [
      { stat: Stat.ATTACK, level: 'HIGH' },
      { stat: Stat.WILL, level: 'HIGH' },
      { stat: Stat.DEFENSE, level: 'LOW' },
      { stat: Stat.EVASION, level: 'LOW' },
    ],
    titles: ['Resiliente', 'Rei'],
  },
]

/** Bestas do catálogo pela `key`. */
export function buildBeasts(): Map<string, BeastTemplate> {
  return new Map(
    BEASTS.map((spec) => [
      spec.key,
      unwrap(BeastTemplate.create(spec), `besta ${spec.key}`),
    ])
  )
}
