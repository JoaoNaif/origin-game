import { Injectable } from '@nestjs/common'
import { Account } from '@/domain/accounts/entities/account'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { PrismaService } from '../prisma.service'
import { PrismaAccountMapper } from '../mappers/prisma-account-mapper'

@Injectable()
export class PrismaAccountsRepository implements AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Account | null> {
    const account = await this.prisma.account.findUnique({ where: { id } })

    return account ? PrismaAccountMapper.toDomain(account) : null
  }

  async findByUsername(username: string): Promise<Account | null> {
    const account = await this.prisma.account.findUnique({
      where: { username },
    })

    return account ? PrismaAccountMapper.toDomain(account) : null
  }

  async create(account: Account): Promise<void> {
    await this.prisma.account.create({
      data: PrismaAccountMapper.toPrisma(account),
    })
  }
}
