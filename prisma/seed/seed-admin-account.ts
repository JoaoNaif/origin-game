import { CreateAccountUseCase } from '@/domain/accounts/applications/use-cases/create-account'
import { AccountRole } from '@/domain/accounts/enums/account-role'
import { BcryptHasher } from '@/infra/cryptography/bcrypt-hasher'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaAccountsRepository } from '@/infra/database/prisma/repositories/prisma-accounts-repository'
import { PrismaCatalogRepository } from '@/infra/database/prisma/repositories/prisma-catalog-repository'
import { PrismaCharactersRepository } from '@/infra/database/prisma/repositories/prisma-characters-repository'

/** Conta admin de teste: entra com `admin` / `origin123`. */
export const ADMIN_ACCOUNT = {
  username: 'admin',
  displayName: 'Admin',
  password: 'origin123',
}

/**
 * Conta admin do MVP: uma conta normal (mesmo cadastro, com os 12 personagens) com o papel de admin. Se já existe,
 * só garante o papel.
 */
export async function seedAdminAccount(prisma: PrismaService): Promise<string> {
  const existing = await prisma.account.findUnique({
    where: { username: ADMIN_ACCOUNT.username },
  })

  if (!existing) {
    const catalog = new PrismaCatalogRepository(prisma)
    const created = await new CreateAccountUseCase(
      new PrismaAccountsRepository(prisma),
      new PrismaCharactersRepository(prisma, catalog),
      catalog,
      new BcryptHasher()
    ).execute(ADMIN_ACCOUNT)
    if (created.isLeft()) throw created.value
  }

  await prisma.account.update({
    where: { username: ADMIN_ACCOUNT.username },
    data: { role: AccountRole.ADMIN },
  })

  return existing
    ? `conta ${ADMIN_ACCOUNT.username} mantida (admin)`
    : `conta ${ADMIN_ACCOUNT.username}: admin (senha ${ADMIN_ACCOUNT.password})`
}
