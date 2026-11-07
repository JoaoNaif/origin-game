import {
  Awakening,
  AwakeningRequirement,
} from '@/domain/characters/entities/awakening'
import { Variant } from '@/domain/characters/entities/variant'
import {
  AWAKENING_MISSION_KINDS,
  AwakeningMissionKind,
} from '@/domain/characters/enums/awakening-mission-kind'
import { Stat } from '@/domain/characters/enums/stat'
import { unwrap } from './catalog'

// ---------------------------------------------------------------------------
// Despertares (D151): a variante despertada (`catalog.ts`), o perfil do sorteio e o pool de missões. As skills ficam
// com os personagens (`characters.ts`), na variante despertada.
// ---------------------------------------------------------------------------

interface AwakeningSpec {
  key: string
  name: string
  description: string
  variant: string
  requirements: AwakeningRequirement[]
  /** Tipos do pool, com o limiar padrão (`awakening_brief.md` 7.2). */
  missions: AwakeningMissionKind[]
}

const high = (stat: Stat): AwakeningRequirement => ({ stat, level: 'HIGH' })
const low = (stat: Stat): AwakeningRequirement => ({ stat, level: 'LOW' })

const AWAKENINGS: AwakeningSpec[] = [
  {
    key: 'sombra-abissal',
    name: 'Sombra Abissal',
    description: 'Dano: a sombra corta e engole.',
    variant: 'sombra-abissal',
    requirements: [high(Stat.ATTACK), high(Stat.SPEED), low(Stat.DEFENSE)],
    missions: [
      'KILLS',
      'HEAVY_HITS',
      'DAMAGE_SHARE',
      'MULTI_KILL',
      'LAST_ALIVE_WIN',
      'TRIPLE_KILL',
      'ENEMY_HP_SHARE',
      'SOLE_SURVIVOR_WIN',
    ],
  },
  {
    key: 'eclipse',
    name: 'Eclipse',
    description: 'Controle: a sombra cala, prende e faz dormir.',
    variant: 'eclipse',
    requirements: [high(Stat.PRECISION), high(Stat.WILL)],
    missions: [
      'STATUS_APPLIED',
      'HEAVY_HITS',
      'KILLS',
      'DAMAGE_SHARE',
      'LAST_ALIVE_WIN',
      'MULTI_KILL',
      'SOLE_SURVIVOR_WIN',
      'ENEMY_HP_SHARE',
    ],
  },
  {
    key: 'cristal',
    name: 'Cristal',
    description: 'Sustentação: a terra vira cristal que protege e cura.',
    variant: 'cristal',
    requirements: [high(Stat.WILL), high(Stat.HP), low(Stat.ATTACK)],
    missions: [
      'SUPPORT_ACTIONS',
      'STATUS_APPLIED',
      'KILLS',
      'SUPPORT_SHARE',
      'LAST_ALIVE_WIN',
      'MULTI_KILL',
      'SOLE_SURVIVOR_WIN',
    ],
  },
  {
    key: 'plasma',
    name: 'Plasma',
    description: 'Dano em área: a combustão vira plasma.',
    variant: 'plasma',
    requirements: [high(Stat.ATTACK), high(Stat.PRECISION), low(Stat.EVASION)],
    missions: [
      'KILLS',
      'HEAVY_HITS',
      'STATUS_APPLIED',
      'DAMAGE_SHARE',
      'MULTI_KILL',
      'ENEMY_HP_SHARE',
      'TRIPLE_KILL',
      'SOLE_SURVIVOR_WIN',
    ],
  },
]

export function buildAwakenings(
  variants: Map<string, Variant>
): Map<string, Awakening> {
  return new Map(
    AWAKENINGS.map(({ variant, missions, ...spec }) => [
      spec.key,
      unwrap(
        Awakening.create({
          ...spec,
          variant: variants.get(variant)!,
          missions: missions.map((kind) => ({
            kind,
            threshold: AWAKENING_MISSION_KINDS[kind].defaultThreshold,
          })),
        }),
        `despertar ${spec.key}`
      ),
    ])
  )
}
