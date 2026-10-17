import { beforeEach, describe, expect, it } from 'vitest'
import { Entity } from './entity'
import { UniqueEntityId } from './unique-entity-id'

class FakeEntity extends Entity<{ name: string }> {
  static create(props: { name: string }, id?: UniqueEntityId) {
    return new FakeEntity(props, id)
  }
}

describe('Entity', () => {
  let sut: FakeEntity

  beforeEach(() => {
    sut = FakeEntity.create({ name: 'a' }, new UniqueEntityId('same-id'))
  })

  it('should be able to compare entities by id', () => {
    const other = FakeEntity.create({ name: 'b' }, new UniqueEntityId('same-id'))

    expect(sut.equals(other)).toBe(true)
  })

  it('should not be equal when ids differ', () => {
    const other = FakeEntity.create({ name: 'a' }, new UniqueEntityId('other-id'))

    expect(sut.equals(other)).toBe(false)
  })
})
