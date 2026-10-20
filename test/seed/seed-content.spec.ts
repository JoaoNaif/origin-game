import { SeededRng } from '@/core/rng/seeded-rng'
import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { buildNpcSide } from '@/domain/combat/services/build-snapshot'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { Lineage } from '@/domain/characters/enums/lineage'
import { StatusType } from '@/domain/skills/enums/status-type'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { describe, expect, it } from 'vitest'
import { loadSeedContent } from '../../prisma/seed/content'

describe('Seed Content', () => {
  const sut = loadSeedContent()
  const skills = sut.characters.flatMap((c) => c.skills)

  it('should be able to load the 12 characters with valid templates and kits', () => {
    expect(sut.characters).toHaveLength(12)
    expect(sut.fields).toHaveLength(6)
    expect(sut.npcSquads).toHaveLength(20)
  })

  it('should be able to cover every class, lineage, range and status', () => {
    const classes = new Set(
      sut.characters.map((c) => c.template.characterClass)
    )
    const lineages = new Set(skills.map((s) => s.lineage))
    const ranges = new Set(skills.map((s) => s.range).filter(Boolean))
    const statuses = new Set(
      skills.flatMap((s) =>
        s.effects.flatMap((e) => (e.type === 'APPLY_STATUS' ? [e.status] : []))
      )
    )

    expect(classes).toEqual(new Set(Object.values(CharacterClass)))
    expect(lineages).toEqual(new Set(Object.values(Lineage)))
    expect(ranges).toEqual(new Set(Object.values(SkillRange)))
    expect(statuses).toEqual(new Set(Object.values(StatusType)))
  })

  it('should be able to build every npc squad into a battle side', () => {
    for (const npcSquad of sut.npcSquads) {
      const side = buildNpcSide({ npcSquad, catalog: sut.catalog })
      expect(side.isRight()).toBe(true)
    }
  })

  it('should be able to play an engine battle between two seed squads', () => {
    const [a, b] = sut.npcSquads.filter((s) => s.difficulty === 'MASTER')
    const opponent = buildNpcSide({ npcSquad: b, catalog: sut.catalog })
    const player = buildNpcSide({ npcSquad: a, catalog: sut.catalog })
    if (opponent.isLeft() || player.isLeft()) throw new Error('lado inválido')

    const engine = new BattleEngine(
      {
        player: {
          ...player.value,
          side: 'PLAYER',
          units: player.value.units.map((u) => ({
            ...u,
            ref: u.ref.replace('OPPONENT', 'PLAYER'),
          })),
        },
        opponent: opponent.value,
        field: { initial: null, catalog: [] },
      },
      new SeededRng(1)
    )

    expect(engine.nextTurn()).not.toBeNull()
  })
})
