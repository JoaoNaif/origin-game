import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Account } from '@/domain/accounts/entities/account'
import { Prisma, Account as PrismaAccount } from '@prisma/client'

export class PrismaAccountMapper {
  static toDomain(raw: PrismaAccount): Account {
    const result = Account.create(
      {
        username: raw.username,
        displayName: raw.displayName,
        passwordHash: raw.passwordHash,
        role: raw.role,
      },
      new UniqueEntityId(raw.id)
    )

    // o banco só guarda contas que já passaram pela validação do domínio
    if (result.isLeft()) throw result.value

    return result.value
  }

  /** Datas ficam com o banco (`@default(now())` e `@updatedAt`). */
  static toPrisma(account: Account): Prisma.AccountUncheckedCreateInput {
    return {
      id: account.id.toString(),
      username: account.username,
      displayName: account.displayName,
      passwordHash: account.passwordHash,
      role: account.role,
    }
  }
}
