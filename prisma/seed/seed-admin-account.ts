import { CreateAccountUseCase } from '@/domain/accounts/applications/use-cases/create-account'
import { AccountRole } from '@/domain/accounts/enums/account-role'
import { BcryptHasher } from '@/infra/cryptography/bcrypt-hasher'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaAccountsRepository } from '@/infra/database/prisma/repositories/prisma-accounts-repository'
import { PrismaCatalogRepository } from '@/infra/database/prisma/repositories/prisma-catalog-repository'
import { PrismaCharactersRepository } from '@/infra/database/prisma/repositories/prisma-characters-repository'
import { SEED_CHARACTER_LEVEL, raiseToSeedLevel } from './seed-character-level'

/** Conta admin de teste: entra com `admin` / `origin123`. */
export const ADMIN_ACCOUNT = {
  username: 'admin',
  displayName: 'Admin',
  password: 'origin123',
}

/** Sorte fixa dos blocos da conta admin: o mesmo seed dá os mesmos blocos. */
const ADMIN_OFFERS_SEED = 18

/**
 * Conta admin do MVP: uma conta normal (mesmo cadastro, com os 12 personagens) com o papel de admin, e os
 * personagens levados ao nível 18 como os da conta de teste. Se já existe, garante o papel e sobe só quem ainda está
 * abaixo do 18.
 */
export async function seedAdminAccount(prisma: PrismaService): Promise<string> {
  const catalog = new PrismaCatalogRepository(prisma)
  const characters = new PrismaCharactersRepository(prisma, catalog)
  const existing = await prisma.account.findUnique({
    where: { username: ADMIN_ACCOUNT.username },
  })

  if (!existing) {
    const created = await new CreateAccountUseCase(
      new PrismaAccountsRepository(prisma),
      characters,
      catalog,
      new BcryptHasher()
    ).execute(ADMIN_ACCOUNT)
    if (created.isLeft()) throw created.value
  }

  const account = await prisma.account.update({
    where: { username: ADMIN_ACCOUNT.username },
    data: { role: AccountRole.ADMIN },
  })

  const { raised, offers } = await raiseToSeedLevel(
    prisma,
    await characters.findManyByAccountId(account.id),
    ADMIN_OFFERS_SEED
  )
  const levels = raised
    ? `, ${raised} personagens levados ao nível ${SEED_CHARACTER_LEVEL}, ${offers} blocos de skill`
    : ''

  return existing
    ? `conta ${ADMIN_ACCOUNT.username} mantida (admin)${levels}`
    : `conta ${ADMIN_ACCOUNT.username}: admin${levels} (senha ${ADMIN_ACCOUNT.password})`
}
