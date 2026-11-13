import { describe, expect, it } from 'vitest'
import { EventSquadMember, eventRequirementError } from './event-requirements'

function member(overrides: Partial<EventSquadMember> = {}): EventSquadMember {
  return {
    name: 'Kael',
    level: 30,
    characterClass: 'VANGUARD',
    lineages: ['ELEMENTAL'],
    traitKeys: ['familia-vaz'],
    rarity: 'C',
    danger: 'CONTINUOUS',
    ...overrides,
  }
}

const squad = [
  member(),
  member({ name: 'Sunna', characterClass: 'SUPPORT', lineages: ['PSYCHIC'] }),
  member({ name: 'Gaia', characterClass: 'SUPPORT', rarity: 'A' }),
  member({ name: 'Lucky', level: 12, danger: 'DISCRETE', traitKeys: [] }),
]

describe('Event Requirements', () => {
  it('should be able to let in a squad with no requirements', () => {
    expect(eventRequirementError([], squad)).toBeNull()
  })

  it('should be able to require a minimum level from everyone', () => {
    expect(
      eventRequirementError([{ type: 'MIN_LEVEL', level: 10 }], squad)
    ).toBeNull()
    expect(
      eventRequirementError([{ type: 'MIN_LEVEL', level: 20 }], squad)
    ).toMatch(/Lucky está no 12/)
  })

  it('should be able to count classes, lineages and families in the squad', () => {
    expect(
      eventRequirementError(
        [{ type: 'CLASS_COUNT', characterClass: 'SUPPORT', min: 2 }],
        squad
      )
    ).toBeNull()
    expect(
      eventRequirementError(
        [{ type: 'CLASS_COUNT', characterClass: 'SUPPORT', min: 4 }],
        squad
      )
    ).toMatch(/o squad tem 2/)
    expect(
      eventRequirementError(
        [{ type: 'LINEAGE', lineage: 'ELEMENTAL', min: 4 }],
        squad
      )
    ).toMatch(/o squad tem 3/)
    expect(
      eventRequirementError(
        [{ type: 'FAMILY', traitKey: 'familia-vaz', min: 3 }],
        squad
      )
    ).toBeNull()
  })

  it('should be able to require a minimum danger and a maximum rarity', () => {
    expect(
      eventRequirementError(
        [{ type: 'MIN_DANGER', level: 'CONTINUOUS' }],
        squad
      )
    ).toMatch(/Lucky é DISCRETE/)
    expect(
      eventRequirementError([{ type: 'MAX_RARITY', rarity: 'B' }], squad)
    ).toMatch(/Gaia é A/)
    expect(
      eventRequirementError([{ type: 'MAX_RARITY', rarity: 'A' }], squad)
    ).toBeNull()
  })
})
