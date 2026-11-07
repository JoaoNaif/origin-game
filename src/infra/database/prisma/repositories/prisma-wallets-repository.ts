import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { Wallet } from '@/domain/economy/entities/wallet'
import { Fragments } from '@/domain/economy/value-objects/fragments'
import { PrismaService } from '../prisma.service'

const json = (value: unknown) => value as Prisma.InputJsonValue

/** A gravação perdeu a corrida (outra requisição gravou a carteira depois da leitura): desfaz a transação. */
class WalletConflict extends Error {}

@Injectable()
export class PrismaWalletsRepository implements WalletsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAccountId(accountId: string): Promise<Wallet> {
    const row = await this.prisma.wallet.findUnique({ where: { accountId } })
    if (!row) return Wallet.empty(new UniqueEntityId(accountId))

    return Wallet.restore({
      accountId: new UniqueEntityId(accountId),
      coins: row.coins,
      fragments: row.fragments as Fragments,
      version: row.version,
    })
  }

  /**
   * Gravação otimista: a carteira só muda se a versão no banco ainda é a da leitura (a primeira gravação cria a linha,
   * e a chave da conta barra duas criações). As linhas do registro entram na mesma transação.
   */
  async save(wallet: Wallet): Promise<boolean> {
    const accountId = wallet.accountId.toString()
    const data = { coins: wallet.coins, fragments: json(wallet.fragments) }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (wallet.version === 0) {
          await tx.wallet.create({ data: { accountId, ...data, version: 1 } })
        } else {
          const updated = await tx.wallet.updateMany({
            where: { accountId, version: wallet.version },
            data: { ...data, version: { increment: 1 } },
          })
          if (updated.count === 0) throw new WalletConflict()
        }

        if (wallet.entries.length > 0) {
          await tx.walletEntry.createMany({
            data: wallet.entries.map((entry) => ({
              accountId,
              reason: entry.reason,
              coins: entry.coins,
              fragments: json(entry.fragments),
              refId: entry.refId,
            })),
          })
        }
      })
    } catch (error) {
      if (
        error instanceof WalletConflict ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002')
      ) {
        return false
      }
      throw error
    }

    return true
  }
}
