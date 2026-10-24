import { describe, expect, it } from 'vitest'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { InvalidSkillOfferError } from '../errors/invalid-skill-offer-error'
import { SkillOffer } from './skill-offer'

const NOW = new Date('2026-10-24T12:00:00.000Z')
const options = [new UniqueEntityId(), new UniqueEntityId()]

function makeOffer() {
  const created = SkillOffer.create({
    characterId: new UniqueEntityId(),
    level: 20,
    skillIds: options,
    createdAt: NOW,
  })
  if (created.isLeft()) throw created.value

  return created.value
}

describe('Skill Offer', () => {
  it('should be able to choose one of the skills of the block', () => {
    const offer = makeOffer()

    const result = offer.choose(options[1], NOW)

    expect(result.isRight()).toBe(true)
    expect(offer.isPending).toBe(false)
    expect(offer.chosenSkillId?.equals(options[1])).toBe(true)
    expect(offer.chosenAt).toEqual(NOW)
  })

  it('should not be able to choose a skill outside the block', () => {
    const offer = makeOffer()

    const result = offer.choose(new UniqueEntityId(), NOW)

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidSkillOfferError)
    expect(offer.isPending).toBe(true)
  })

  it('should not be able to choose twice', () => {
    const offer = makeOffer()
    offer.choose(options[0], NOW)

    const result = offer.choose(options[1], NOW)

    expect(result.isLeft()).toBe(true)
    expect(offer.chosenSkillId?.equals(options[0])).toBe(true)
  })

  it('should not be able to create an empty block', () => {
    const result = SkillOffer.create({
      characterId: new UniqueEntityId(),
      level: 5,
      skillIds: [],
      createdAt: NOW,
    })

    expect(result.isLeft()).toBe(true)
  })
})
