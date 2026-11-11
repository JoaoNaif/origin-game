import { Stat } from '@/domain/characters/enums/stat'
import {
  CreateGearTemplateInput,
  GearRequirement,
  GearTemplate,
} from '@/domain/gear/entities/gear-template'
import { GearGrade } from '@/domain/gear/enums/gear-grade'
import { GearKind } from '@/domain/gear/enums/gear-kind'
import { unwrap } from './catalog'

// ---------------------------------------------------------------------------
// Equipamento vivo (D62, D94): catálogo de exemplo do MVP, 3 de cada grau baixo e médio, 3 Reis e 1 Divino. O bônus é
// o padrão do grau. Os títulos são os do DOM avançado (os únicos que existem por ora).
// ---------------------------------------------------------------------------

const high = (stat: Stat): GearRequirement => ({ stat, level: 'HIGH' })
const low = (stat: Stat): GearRequirement => ({ stat, level: 'LOW' })

const GEAR: CreateGearTemplateInput[] = [
  // Escudeiro (≈ E): 2 requisitos
  {
    key: 'lamina-de-brasa',
    name: 'Lâmina de Brasa',
    description: 'Ferro com um fio de fogo preso dentro: aquece a cada golpe.',
    kind: GearKind.WEAPON,
    grade: GearGrade.SQUIRE,
    lineage: 'ELEMENTAL',
    primaryStat: Stat.ATTACK,
    secondaryStat: Stat.SPEED,
    requirements: [high(Stat.ATTACK), low(Stat.DEFENSE)],
    titles: ['Rei', 'Indestrutível'],
  },
  {
    key: 'couraca-de-pedra',
    name: 'Couraça de Pedra',
    description:
      'Placas de rocha que se fecham sozinhas onde o golpe vai cair.',
    kind: GearKind.ARMOR,
    grade: GearGrade.SQUIRE,
    lineage: 'MATERIAL',
    primaryStat: Stat.DEFENSE,
    secondaryStat: Stat.HP,
    requirements: [high(Stat.DEFENSE), high(Stat.HP)],
    titles: ['Resiliente', 'Indestrutível'],
  },
  {
    key: 'manto-de-seiva',
    name: 'Manto de Seiva',
    description:
      'Fibra viva que fecha cortes pequenos enquanto o portador luta.',
    kind: GearKind.ARMOR,
    grade: GearGrade.SQUIRE,
    lineage: 'BIOLOGICAL',
    primaryStat: Stat.HP,
    secondaryStat: Stat.WILL,
    requirements: [high(Stat.HP), low(Stat.SPEED)],
    titles: ['Resiliente', 'Vidente'],
  },

  // Cavaleiro (≈ C): 2 requisitos
  {
    key: 'arco-do-vento-cortante',
    name: 'Arco do Vento Cortante',
    description:
      'A corda vibra no ritmo do ar: a flecha corrige a rota no voo.',
    kind: GearKind.WEAPON,
    grade: GearGrade.KNIGHT,
    lineage: 'VECTORIAL',
    primaryStat: Stat.PRECISION,
    secondaryStat: Stat.ATTACK,
    requirements: [high(Stat.PRECISION), high(Stat.SPEED)],
    titles: ['Vidente', 'Rei'],
  },
  {
    key: 'tiara-do-eco',
    name: 'Tiara do Eco',
    description:
      'Repete os pensamentos de quem tenta entrar na cabeça do portador.',
    kind: GearKind.ARMOR,
    grade: GearGrade.KNIGHT,
    lineage: 'PSYCHIC',
    primaryStat: Stat.WILL,
    secondaryStat: Stat.EVASION,
    requirements: [high(Stat.WILL), low(Stat.ATTACK)],
    titles: ['Vidente', 'Rei'],
  },
  {
    key: 'egide-cinzenta',
    name: 'Égide Cinzenta',
    description: 'Escudo de um metal sem cor que guarda a primeira pancada.',
    kind: GearKind.ARMOR,
    grade: GearGrade.KNIGHT,
    lineage: 'FUNDAMENTAL',
    primaryStat: Stat.HP,
    secondaryStat: Stat.DEFENSE,
    requirements: [high(Stat.HP), low(Stat.EVASION)],
    titles: ['Indestrutível', 'Resiliente'],
  },

  // Mestre (≈ A): 3 requisitos, ao menos 1 baixo
  {
    key: 'presa-da-fera-ancia',
    name: 'Presa da Fera Anciã',
    description:
      'Osso de uma fera morta de velhice: ainda cicatriza o que toca.',
    kind: GearKind.WEAPON,
    grade: GearGrade.MASTER,
    lineage: 'BIOLOGICAL',
    primaryStat: Stat.ATTACK,
    secondaryStat: Stat.HP,
    requirements: [high(Stat.ATTACK), high(Stat.HP), low(Stat.PRECISION)],
    titles: ['Indestrutível', 'Rei'],
  },
  {
    key: 'cota-de-metal-saturado',
    name: 'Cota de Metal Saturado',
    description: 'Elos que endurecem sob o golpe e cedem no resto do tempo.',
    kind: GearKind.ARMOR,
    grade: GearGrade.MASTER,
    lineage: 'MATERIAL',
    primaryStat: Stat.DEFENSE,
    secondaryStat: Stat.WILL,
    requirements: [high(Stat.DEFENSE), high(Stat.WILL), low(Stat.SPEED)],
    titles: ['Resiliente', 'Indestrutível'],
  },
  {
    key: 'lanca-gravitacional',
    name: 'Lança Gravitacional',
    description: 'Pesa nada na mão e uma tonelada na ponta.',
    kind: GearKind.WEAPON,
    grade: GearGrade.MASTER,
    lineage: 'VECTORIAL',
    primaryStat: Stat.SPEED,
    secondaryStat: Stat.PRECISION,
    requirements: [high(Stat.SPEED), high(Stat.PRECISION), low(Stat.HP)],
    titles: ['Vidente', 'Indestrutível'],
  },

  // Rei (≈ SS): 4 requisitos (2 altos e 2 baixos)
  {
    key: 'espada-flamejante',
    name: 'Espada Flamejante',
    description:
      'Metal saturado de fogo: com o portador certo, a lâmina queima.',
    kind: GearKind.WEAPON,
    grade: GearGrade.KING,
    lineage: 'ELEMENTAL',
    primaryStat: Stat.ATTACK,
    secondaryStat: Stat.PRECISION,
    requirements: [
      high(Stat.ATTACK),
      high(Stat.PRECISION),
      low(Stat.DEFENSE),
      low(Stat.HP),
    ],
    titles: ['Rei', 'Vidente', 'Indestrutível'],
  },
  {
    key: 'armadura-do-colosso',
    name: 'Armadura do Colosso',
    description: 'Reage no corpo todo: absorve o primeiro impacto da batalha.',
    kind: GearKind.ARMOR,
    grade: GearGrade.KING,
    lineage: 'FUNDAMENTAL',
    primaryStat: Stat.HP,
    secondaryStat: Stat.DEFENSE,
    requirements: [
      high(Stat.HP),
      high(Stat.DEFENSE),
      low(Stat.SPEED),
      low(Stat.EVASION),
    ],
    titles: ['Resiliente', 'Indestrutível', 'Rei'],
  },
  {
    key: 'coroa-da-mente-quieta',
    name: 'Coroa da Mente Quieta',
    description:
      'Silencia tudo em volta do portador, menos o que ele quer ouvir.',
    kind: GearKind.ARMOR,
    grade: GearGrade.KING,
    lineage: 'PSYCHIC',
    primaryStat: Stat.WILL,
    secondaryStat: Stat.PRECISION,
    requirements: [
      high(Stat.WILL),
      high(Stat.PRECISION),
      low(Stat.ATTACK),
      low(Stat.HP),
    ],
    titles: ['Vidente', 'Rei'],
  },

  // Divino: só por evento único, fora dos baús e não se vende (9.6)
  {
    key: 'relicario-de-alpha',
    name: 'Relicário de Alpha',
    description:
      'Um fragmento do Éon que não existe mais. Ninguém sabe por que ainda pulsa.',
    kind: GearKind.WEAPON,
    grade: GearGrade.DIVINE,
    lineage: 'FUNDAMENTAL',
    primaryStat: Stat.ATTACK,
    secondaryStat: Stat.WILL,
    requirements: [
      high(Stat.ATTACK),
      high(Stat.WILL),
      low(Stat.DEFENSE),
      low(Stat.EVASION),
    ],
    titles: ['Rei', 'Vidente', 'Resiliente', 'Indestrutível'],
  },
]

/** Modelos de equipamento pela `key`. */
export function buildGear(): Map<string, GearTemplate> {
  return new Map(
    GEAR.map((spec) => [
      spec.key,
      unwrap(GearTemplate.create(spec), `equipamento ${spec.key}`),
    ])
  )
}
