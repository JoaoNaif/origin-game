import { EventTemplate } from '@/domain/events/entities/event-template'
import { EventKind } from '@/domain/events/enums/event-kind'
import { EventSquadMode } from '@/domain/events/enums/event-squad-mode'
import { unwrap } from './catalog'

// ---------------------------------------------------------------------------
// Eventos de exemplo (D155, `events_brief.md`): um de cada tipo que já roda, abertos de outubro de 2026 até o fim de
// 2027 para dar para testar. Os squads de NPC são os do PvE. Os eventos de verdade são do admin.
// ---------------------------------------------------------------------------

type EventSpec = Parameters<typeof EventTemplate.create>[0]

const WINDOW = {
  announceAt: new Date('2026-10-01T00:00:00.000Z'),
  startsAt: new Date('2026-10-10T00:00:00.000Z'),
  endsAt: new Date('2027-12-31T23:59:59.000Z'),
}

const EVENTS: EventSpec[] = [
  {
    key: 'torre-do-eco',
    name: 'Torre do Eco',
    description:
      'Cinco pisos, cada um com um esquadrão mais forte. Perder não faz voltar: tente o mesmo piso de novo.',
    kind: EventKind.TOWER,
    ...WINDOW,
    requirements: [],
    attemptLimit: null,
    squadMode: EventSquadMode.FREE,
    fieldKey: null,
    modifiers: [],
    stages: [
      ['Piso 1', 'aggressive-beginner'],
      ['Piso 2', 'cautious-beginner'],
      ['Piso 3', 'finisher-intermediate'],
      ['Piso 4', 'balanced-intermediate'],
      ['Piso 5', 'aggressive-advanced'],
    ].map(([name, npcSquadKey]) => ({
      name,
      npcSquadKey,
      rewards: [{ type: 'COINS', amount: 150 }],
    })),
    completionRewards: [
      { type: 'CHEST', tier: 'B' },
      { type: 'GEAR', gearKey: 'egide-cinzenta' },
    ],
    participationRewards: [{ type: 'FRAGMENTS', lineage: 'NONE', amount: 5 }],
  },
  {
    key: 'caca-ao-lobo',
    name: 'Caça ao Lobo de Cinzas',
    description:
      'O Lobo de Cinzas foi visto nas planícies. Vença a matilha para tentar firmar o contrato.',
    kind: EventKind.HUNT,
    ...WINDOW,
    requirements: [],
    attemptLimit: { count: 5, per: 'DAY' },
    squadMode: EventSquadMode.FREE,
    fieldKey: 'planicie',
    modifiers: [],
    stages: [
      {
        name: 'A matilha',
        npcSquadKey: 'balanced-intermediate',
        rewards: [],
        captureBeastKey: 'lobo-de-cinzas',
      },
    ],
    completionRewards: [],
    participationRewards: [{ type: 'COINS', amount: 100 }],
  },
  {
    key: 'laboratorio-da-sombra',
    name: 'Laboratório da Sombra',
    description:
      'A Sombra testa guerreiros sem cura e com os stats nivelados no 30. O squad é fixo do começo ao fim.',
    kind: EventKind.RESEARCH,
    ...WINDOW,
    requirements: [],
    attemptLimit: { count: 3, per: 'DAY' },
    squadMode: EventSquadMode.FIXED,
    fieldKey: 'arena',
    modifiers: [{ type: 'LEVELED_STATS', level: 30 }, { type: 'NO_HEALING' }],
    stages: [
      {
        name: 'Ensaio 1',
        npcSquadKey: 'cautious-intermediate',
        rewards: [{ type: 'COINS', amount: 200 }],
      },
      {
        name: 'Ensaio 2',
        npcSquadKey: 'finisher-intermediate',
        rewards: [{ type: 'COINS', amount: 200 }],
      },
    ],
    completionRewards: [{ type: 'CHEST', tier: 'C' }],
    participationRewards: [],
  },
  {
    key: 'chefe-das-cinzas',
    name: 'O Guardião das Cinzas',
    description:
      'Um chefe guardado pela IA mais forte. Uma tentativa só: perdeu, acabou. Dá a Fênix e o Relicário de Alpha.',
    kind: EventKind.UNIQUE_BOSS,
    ...WINDOW,
    requirements: [{ type: 'MIN_LEVEL', level: 40 }],
    attemptLimit: { count: 1, per: 'EVENT' },
    squadMode: EventSquadMode.FREE,
    fieldKey: null,
    modifiers: [],
    stages: [
      { name: 'O Guardião', npcSquadKey: 'balanced-grandmaster', rewards: [] },
    ],
    completionRewards: [
      { type: 'BEAST', beastKey: 'fenix' },
      { type: 'GEAR', gearKey: 'relicario-de-alpha' },
    ],
    participationRewards: [],
  },
  {
    key: 'chegada-de-dax',
    name: 'A Chegada de Dax Zarek',
    description:
      'Dax Zarek chega à cidade. Vença os dois desafios para que ele entre no seu Elenco.',
    kind: EventKind.CHARACTER_LAUNCH,
    ...WINDOW,
    requirements: [],
    attemptLimit: null,
    squadMode: EventSquadMode.FREE,
    fieldKey: null,
    modifiers: [],
    stages: [
      {
        name: 'Primeiro desafio',
        npcSquadKey: 'aggressive-beginner',
        rewards: [{ type: 'COINS', amount: 100 }],
      },
      {
        name: 'Segundo desafio',
        npcSquadKey: 'finisher-beginner',
        rewards: [{ type: 'COINS', amount: 100 }],
      },
    ],
    completionRewards: [{ type: 'CHARACTER', templateKey: 'dax-zarek' }],
    participationRewards: [],
  },
]

export function buildEvents(): Map<string, EventTemplate> {
  return new Map(
    EVENTS.map((spec) => [
      spec.key,
      unwrap(EventTemplate.create(spec), `evento ${spec.key}`),
    ])
  )
}
