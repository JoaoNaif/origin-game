import { describe, expect, it } from 'vitest'
import { InvalidAccountError } from '../errors/invalid-account-error'
import { Account } from './account'

const passwordHash = 'hash-da-senha'

describe('Create Account', () => {
  it('should be able to create an account', () => {
    const sut = Account.create({
      username: 'joao_naif',
      displayName: 'João',
      passwordHash,
    })

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.username).toBe('joao_naif')
      expect(sut.value.displayName).toBe('João')
      expect(sut.value.passwordHash).toBe(passwordHash)
    }
  })

  it('should be able to normalize the username to lowercase', () => {
    const sut = Account.create({
      username: '  Tester_01 ',
      displayName: 'Tester',
      passwordHash,
    })

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.username).toBe('tester_01')
    }
  })

  it('should not be able to use spaces or symbols in the username', () => {
    const sut = Account.create({
      username: 'Joao Naif!',
      displayName: 'João',
      passwordHash,
    })

    expect(sut.isLeft()).toBe(true)
    expect(sut.value).toBeInstanceOf(InvalidAccountError)
  })

  it('should not be able to use a username shorter than 3 characters', () => {
    const sut = Account.create({
      username: 'jo',
      displayName: 'João',
      passwordHash,
    })

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to use a display name shorter than 2 characters', () => {
    const sut = Account.create({
      username: 'joao_naif',
      displayName: ' J ',
      passwordHash,
    })

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to create an account without a password hash', () => {
    const sut = Account.create({
      username: 'joao_naif',
      displayName: 'João',
      passwordHash: '',
    })

    expect(sut.isLeft()).toBe(true)
  })

  it('should be able to check the plain password length', () => {
    expect(Account.passwordError('12345678')).toBeNull()
    expect(Account.passwordError('1234567')).toBeInstanceOf(InvalidAccountError)
    expect(Account.passwordError('x'.repeat(73))).toBeInstanceOf(
      InvalidAccountError
    )
  })
})
