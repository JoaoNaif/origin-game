import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common'
import { beforeEach, describe, expect, it } from 'vitest'
import { AccountRole } from '@/domain/accounts/enums/account-role'
import { makeAccount } from 'test/factories/make-account'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { AdminGuard } from './admin.guard'

let accountsRepository: InMemoryAccountsRepository
let sut: AdminGuard

/** Requisição com a conta que o guard global (JWT) já colocou em `user`. */
const contextFor = (sub?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user: sub ? { sub } : undefined }),
    }),
  }) as unknown as ExecutionContext

describe('Admin Guard', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository()
    sut = new AdminGuard(accountsRepository)
  })

  it('should be able to let an admin through', async () => {
    const admin = makeAccount({ username: 'admin', role: AccountRole.ADMIN })
    await accountsRepository.create(admin)

    expect(await sut.canActivate(contextFor(admin.id.toString()))).toBe(true)
  })

  it('should not be able to let a player through', async () => {
    const player = makeAccount({ username: 'jogador' })
    await accountsRepository.create(player)

    await expect(
      sut.canActivate(contextFor(player.id.toString()))
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('should not be able to let a deleted account through', async () => {
    await expect(sut.canActivate(contextFor('apagada'))).rejects.toBeInstanceOf(
      ForbiddenException
    )
  })

  it('should not be able to let a request without login through', async () => {
    await expect(sut.canActivate(contextFor())).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })
})
