import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { makeBattleSnapshot } from 'test/factories/make-battle-snapshot'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { incomingDanger } from './action-scorer'

describe('Action Scorer (Proteger pelo perigo)', () => {
  it('should be able to measure the danger an ally runs until the protector acts again', () => {
    const fragile = makeBattleSnapshot()
    fragile.player.units[3].profile = {
      ...fragile.player.units[3].profile,
      DEFENSE: 20,
    }
    const sut = new BattleEngine(fragile, new FixedRng([0]))
    sut.nextTurn()
    const guard = sut.currentRef!

    const sturdy = new BattleEngine(makeBattleSnapshot(), new FixedRng([0]))
    sturdy.nextTurn()

    const danger = incomingDanger(sut, guard, 'PLAYER:3')
    expect(danger).toBeGreaterThan(0)
    // pouca Defesa: o mesmo inimigo tira mais, então proteger vale mais
    expect(danger).toBeGreaterThan(incomingDanger(sturdy, guard, 'PLAYER:3'))
  })
})
