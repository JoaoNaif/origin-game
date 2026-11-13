import { describe, expect, it } from 'vitest'
import { InvalidEventError } from '../errors/invalid-event-error'
import { EventTemplate, EventTemplateProps } from './event-template'

function props(
  overrides: Partial<EventTemplateProps> = {}
): EventTemplateProps {
  return {
    key: 'torre-teste',
    name: 'Torre de Teste',
    kind: 'TOWER',
    announceAt: new Date('2026-11-01T00:00:00Z'),
    startsAt: new Date('2026-11-05T00:00:00Z'),
    endsAt: new Date('2026-11-20T00:00:00Z'),
    requirements: [],
    attemptLimit: null,
    squadMode: 'FREE',
    fieldKey: null,
    modifiers: [],
    stages: [
      {
        name: 'Piso 1',
        npcSquadKey: 'aggressive-beginner',
        rewards: [{ type: 'COINS', amount: 100 }],
      },
    ],
    completionRewards: [{ type: 'CHEST', tier: 'B' }],
    participationRewards: [],
    ...overrides,
  }
}

describe('Event Template', () => {
  it('should be able to create a tower', () => {
    const result = EventTemplate.create(props())

    expect(result.isRight()).toBe(true)
  })

  it('should be able to tell the phase by the dates', () => {
    const event = EventTemplate.create(props()).value as EventTemplate

    expect(event.phaseAt(new Date('2026-10-30T00:00:00Z'))).toBe('HIDDEN')
    expect(event.phaseAt(new Date('2026-11-02T00:00:00Z'))).toBe('ANNOUNCED')
    expect(event.phaseAt(new Date('2026-11-10T00:00:00Z'))).toBe('OPEN')
    expect(event.phaseAt(new Date('2026-11-20T00:00:00Z'))).toBe('ENDED')
  })

  it('should not be able to create an event without an end after the start', () => {
    const result = EventTemplate.create(
      props({ endsAt: new Date('2026-11-05T00:00:00Z') })
    )

    expect(result.value).toBeInstanceOf(InvalidEventError)
  })

  it('should not be able to announce after the start', () => {
    const result = EventTemplate.create(
      props({ announceAt: new Date('2026-11-06T00:00:00Z') })
    )

    expect(result.value).toBeInstanceOf(InvalidEventError)
  })

  it('should not be able to create a unique boss with more than one attempt', () => {
    const result = EventTemplate.create(
      props({ kind: 'UNIQUE_BOSS', attemptLimit: { count: 2, per: 'EVENT' } })
    )

    expect(result.value).toBeInstanceOf(InvalidEventError)
    expect(
      EventTemplate.create(
        props({ kind: 'UNIQUE_BOSS', attemptLimit: { count: 1, per: 'EVENT' } })
      ).isRight()
    ).toBe(true)
  })

  it('should not be able to create a hunt without the beast on every stage', () => {
    const result = EventTemplate.create(props({ kind: 'HUNT' }))

    expect(result.value).toBeInstanceOf(InvalidEventError)
  })

  it('should not be able to capture a beast outside a hunt', () => {
    const result = EventTemplate.create(
      props({
        stages: [
          {
            name: 'Piso 1',
            npcSquadKey: 'aggressive-beginner',
            rewards: [],
            captureBeastKey: 'lobo-de-cinzas',
          },
        ],
      })
    )

    expect(result.value).toBeInstanceOf(InvalidEventError)
  })

  it('should not be able to launch a character without the character reward', () => {
    const result = EventTemplate.create(props({ kind: 'CHARACTER_LAUNCH' }))

    expect(result.value).toBeInstanceOf(InvalidEventError)
  })

  it('should not be able to create a research without a modifier or a fixed field', () => {
    expect(EventTemplate.create(props({ kind: 'RESEARCH' })).isLeft()).toBe(
      true
    )
    expect(
      EventTemplate.create(
        props({ kind: 'RESEARCH', modifiers: [{ type: 'NO_HEALING' }] })
      ).isRight()
    ).toBe(true)
  })

  it('should not be able to exhaust later than the normal round', () => {
    const result = EventTemplate.create(
      props({ modifiers: [{ type: 'EARLY_EXHAUSTION', afterRound: 3 }] })
    )

    expect(result.value).toBeInstanceOf(InvalidEventError)
  })

  it('should not be able to ask for more characters than the squad has', () => {
    const result = EventTemplate.create(
      props({
        requirements: [
          { type: 'CLASS_COUNT', characterClass: 'SUPPORT', min: 5 },
        ],
      })
    )

    expect(result.value).toBeInstanceOf(InvalidEventError)
  })
})
