import { describe, expect, it } from 'vitest'
import { InvalidAccountError } from '../errors/invalid-account-error'
import { Account } from './account'

describe('Create Account', () => {
  it('should be able to create an account', () => {
    const sut = Account.create({ username: 'joao_naif', displayName: 'João' })

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.username).toBe('joao_naif')
      expect(sut.value.displayName).toBe('João')
    }
  })

  it('should be able to normalize the username to lowercase', () => {
    const sut = Account.create({
      username: '  Tester_01 ',
      displayName: 'Tester',
    })

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.username).toBe('tester_01')
    }
  })

  it('should not be able to use spaces or symbols in the username', () => {
    const sut = Account.create({ username: 'Joao Naif!', displayName: 'João' })

    expect(sut.isLeft()).toBe(true)
    expect(sut.value).toBeInstanceOf(InvalidAccountError)
  })

  it('should not be able to use a username shorter than 3 characters', () => {
    const sut = Account.create({ username: 'jo', displayName: 'João' })

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to use a display name shorter than 2 characters', () => {
    const sut = Account.create({ username: 'joao_naif', displayName: ' J ' })

    expect(sut.isLeft()).toBe(true)
  })
})
