import { beforeEach, describe, expect, it } from 'vitest'
import { Character } from '@/domain/characters/entities/character'
import { DomLevel } from '@/domain/characters/enums/dom-level'
import { characterOf } from 'test/factories/make-roster'
import { makePveWorld, PveWorld } from 'test/factories/make-pve-world'
import { playPveBattle } from 'test/factories/play-pve-battle'
import { DOM_PVE_WEIGHT } from '../../services/dom-feats'

let world: PveWorld
let gaia: Character

describe('Battle Rewards (DOM)', () => {
  beforeEach(async () => {
    world = await makePveWorld(30)
    gaia = characterOf(world.roster, world.catalog, 'gaia')
  })

  it('should be able to put every battle in the DOM window with the weight of the difficulty', async () => {
    const { battle } = await playPveBattle(world, 'balanced-beginner')

    for (const unit of battle.snapshot.player.units) {
      const saved = await world.characters.findById(unit.characterId!)
      const weight = saved!.dom.history.reduce((sum, e) => sum + e.weight, 0)
      expect(weight).toBeCloseTo(DOM_PVE_WEIGHT.BEGINNER)
      expect(saved!.dom.weightSinceCheck).toBeCloseTo(DOM_PVE_WEIGHT.BEGINNER)
    }
  }, 60_000)

  it('should be able to bring the unique skill to the battle and drop a level without feats', async () => {
    gaia.setDomPillars({ AURA: DomLevel.ADVANCED })
    // quase na conferência da perda: a batalha passa dos 25 de peso
    gaia.recordDomBattle({ weight: 24.9, feats: [], hasVariant: true })

    const { started, rewards } = await playPveBattle(world, 'balanced-beginner')

    const unit = started.snapshot.player.units.find(
      (u) => u.characterId === gaia.id.toString()
    )!
    expect(unit.skills.map((s) => s.key)).toContain('dom:aura')
    expect(unit.dom?.pillars).toEqual({ AURA: 'ADVANCED' })

    const saved = await world.characters.findById(gaia.id.toString())
    expect(saved!.domPillars).toEqual({ AURA: 'INTERMEDIATE' })
    const reward = rewards.find((r) => r.characterId === gaia.id.toString())!
    expect(reward.domChanges).toEqual([
      { pillar: 'AURA', from: 'ADVANCED', to: 'INTERMEDIATE' },
    ])
  }, 60_000)
})
