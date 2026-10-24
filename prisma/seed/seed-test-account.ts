import { CreateAccountUseCase } from '@/domain/accounts/applications/use-cases/create-account'
import { defaultFreePoints } from '@/domain/characters/services/free-points'
import { xpToNextLevel } from '@/domain/characters/services/level-curve'
import { BcryptHasher } from '@/infra/cryptography/bcrypt-hasher'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaAccountsRepository } from '@/infra/database/prisma/repositories/prisma-accounts-repository'
import { PrismaCatalogRepository } from '@/infra/database/prisma/repositories/prisma-catalog-repository'
import { PrismaCharactersRepository } from '@/infra/database/prisma/repositories/prisma-characters-repository'

/** Conta de teste do MVP: entra com `tester_01` / `origin123`. */
export const TEST_ACCOUNT = {
  username: 'tester_01',
  displayName: 'Tester',
  password: 'origin123',
}

/** Nível da conta de teste: o meio da faixa do Iniciante (D103), para já jogar contra os NPCs mais fracos. */
export const TEST_ACCOUNT_LEVEL = 18

/**
 * Conta de teste do MVP (`data_model.md` 3.5): criada pelo mesmo caso de uso do servidor (12 personagens, D133) e
 * levada ao nível 18 com a distribuição padrão dos pontos livres (a mesma dos NPCs). Se já existe, o progresso
 * fica; só ganha a senha de teste se ainda não tem (contas de antes do login).
 */
export async function seedTestAccount(prisma: PrismaService): Promise<string> {
  const hasher = new BcryptHasher()
  const existing = await prisma.account.findUnique({
    where: { username: TEST_ACCOUNT.username },
  })

  if (existing) {
    if (existing.passwordHash) {
      return `conta ${TEST_ACCOUNT.username} já existe (mantida)`
    }

    await prisma.account.update({
      where: { id: existing.id },
      data: { passwordHash: await hasher.hash(TEST_ACCOUNT.password) },
    })
    return `conta ${TEST_ACCOUNT.username} mantida, com a senha de teste`
  }

  const accounts = new PrismaAccountsRepository(prisma)
  const catalog = new PrismaCatalogRepository(prisma)
  const characters = new PrismaCharactersRepository(prisma, catalog)

  const created = await new CreateAccountUseCase(
    accounts,
    characters,
    catalog,
    hasher
  ).execute(TEST_ACCOUNT)
  if (created.isLeft()) throw created.value

  const content = await catalog.load()
  for (const character of created.value.characters) {
    while (character.level < TEST_ACCOUNT_LEVEL) {
      character.gainXp(xpToNextLevel(character.level))
    }

    const template = content.templates.get(character.templateId.toValue())!
    const allocated = character.allocateFreePoints(
      defaultFreePoints(template.stats, character.level),
      template
    )
    if (allocated.isLeft()) throw allocated.value

    await characters.save(character)
  }

  return `conta ${TEST_ACCOUNT.username}: 12 personagens no nível ${TEST_ACCOUNT_LEVEL} (senha ${TEST_ACCOUNT.password})`
}
