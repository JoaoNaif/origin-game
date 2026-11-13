import { describe, expect, it } from 'vitest'
import { EventTemplate } from '@/domain/events/entities/event-template'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { catalogIntegrityError } from './catalog-integrity'

describe('Catalog Integrity', () => {
  it('should be able to accept the seed catalog with its events', () => {
    const catalog = seedCatalog()

    expect(catalog.events.size).toBe(5)
    expect(catalogIntegrityError(catalog)).toBeNull()
  })

  it('should not be able to accept an event pointing to what does not exist', () => {
    const catalog = seedCatalog()
    const tower = [...catalog.events.values()].find(
      (e) => e.key === 'torre-do-eco'
    )!
    const broken = EventTemplate.create(
      {
        key: tower.key,
        name: tower.name,
        kind: tower.kind,
        announceAt: tower.announceAt,
        startsAt: tower.startsAt,
        endsAt: tower.endsAt,
        requirements: [],
        attemptLimit: null,
        squadMode: tower.squadMode,
        fieldKey: null,
        modifiers: [],
        stages: [{ name: 'Piso', npcSquadKey: 'nao-existe', rewards: [] }],
        completionRewards: [],
        participationRewards: [],
      },
      tower.id
    ).value as EventTemplate
    const events = new Map(catalog.events)
    events.set(tower.id.toString(), broken)

    expect(catalogIntegrityError({ ...catalog, events })).toMatch(
      /squad de NPC nao-existe/
    )
  })

  it('should not be able to hunt a sacred beast', () => {
    const catalog = seedCatalog()
    const hunt = [...catalog.events.values()].find(
      (e) => e.key === 'caca-ao-lobo'
    )!
    const sacred = EventTemplate.create(
      {
        key: hunt.key,
        name: hunt.name,
        kind: hunt.kind,
        announceAt: hunt.announceAt,
        startsAt: hunt.startsAt,
        endsAt: hunt.endsAt,
        requirements: [],
        attemptLimit: null,
        squadMode: hunt.squadMode,
        fieldKey: null,
        modifiers: [],
        stages: [
          {
            name: 'Fênix',
            npcSquadKey: 'balanced-intermediate',
            rewards: [],
            captureBeastKey: 'fenix',
          },
        ],
        completionRewards: [],
        participationRewards: [],
      },
      hunt.id
    ).value as EventTemplate
    const events = new Map(catalog.events)
    events.set(hunt.id.toString(), sacred)

    expect(catalogIntegrityError({ ...catalog, events })).toMatch(/sagrada/)
  })
})
