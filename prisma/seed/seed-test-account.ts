import { CreateAccountUseCase } from '@/domain/accounts/applications/use-cases/create-account'
import { skillOffersOnLevelUp } from '@/domain/characters/applications/services/skill-offers-on-level-up'
import { Character } from '@/domain/characters/entities/character'
import { SeededRng } from '@/core/rng/seeded-rng'
import { BcryptHasher } from '@/infra/cryptography/bcrypt-hasher'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaAccountsRepository } from '@/infra/database/prisma/repositories/prisma-accounts-repository'
import { PrismaCatalogRepository } from '@/infra/database/prisma/repositories/prisma-catalog-repository'
import { PrismaCharactersRepository } from '@/infra/database/prisma/repositories/prisma-characters-repository'
import { PrismaSkillOffersRepository } from '@/infra/database/prisma/repositories/prisma-skill-offers-repository'
import { SEED_CHARACTER_LEVEL, raiseToSeedLevel } from './seed-character-level'

/** Conta de teste do MVP: entra com `tester_01` / `origin123`. */
export const TEST_ACCOUNT = {
  username: 'tester_01',
  displayName: 'Tester',
  password: 'origin123',
}

/** Sorte fixa dos blocos da conta de teste: o mesmo seed dá os mesmos blocos. */
const TEST_OFFERS_SEED = 18

/**
 * Os blocos de skill dos níveis que a conta de teste pulou ao ser levada ao 18 (5, 10 e 15, D77), para a conta criada
 * antes dos blocos. Só para quem ainda não tem nenhum bloco: rodar o seed de novo não repete.
 */
async function seedSkillOffers(
  prisma: PrismaService,
  characters: Character[],
  catalog: PrismaCatalogRepository
): Promise<number> {
  const existing = await prisma.skillOffer.count({
    where: { characterId: { in: characters.map((c) => c.id.toString()) } },
  })
  if (existing > 0) return 0

  const content = await catalog.load()
  const rng = new SeededRng(TEST_OFFERS_SEED)
  const offers = characters.flatMap((character) =>
    skillOffersOnLevelUp({
      character,
      fromLevel: 0,
      catalog: content,
      pending: [],
      rng,
      now: new Date(),
    })
  )
  await new PrismaSkillOffersRepository(prisma).createMany(offers)

  return offers.length
}

/**
 * Conta de teste do MVP (`data_model.md` 3.5): criada pelo mesmo caso de uso do servidor (12 personagens, D133) e
 * levada ao nível 18 (`raiseToSeedLevel`: distribuição padrão dos pontos livres e os blocos de skill dos níveis
 * atravessados). Se já existe, o progresso fica; ganha a senha de teste se ainda não tem (contas de antes do login) e
 * os blocos se ainda não tem nenhum.
 */
export async function seedTestAccount(prisma: PrismaService): Promise<string> {
  const hasher = new BcryptHasher()
  const catalog = new PrismaCatalogRepository(prisma)
  const characters = new PrismaCharactersRepository(prisma, catalog)
  const existing = await prisma.account.findUnique({
    where: { username: TEST_ACCOUNT.username },
  })

  if (existing) {
    const notes: string[] = []
    if (!existing.passwordHash) {
      await prisma.account.update({
        where: { id: existing.id },
        data: { passwordHash: await hasher.hash(TEST_ACCOUNT.password) },
      })
      notes.push('ganhou a senha de teste')
    }

    const offers = await seedSkillOffers(
      prisma,
      await characters.findManyByAccountId(existing.id),
      catalog
    )
    if (offers > 0) notes.push(`ganhou ${offers} blocos de skill`)

    return `conta ${TEST_ACCOUNT.username} mantida${notes.length ? `: ${notes.join(', ')}` : ''}`
  }

  const created = await new CreateAccountUseCase(
    new PrismaAccountsRepository(prisma),
    characters,
    catalog,
    hasher
  ).execute(TEST_ACCOUNT)
  if (created.isLeft()) throw created.value

  const { offers } = await raiseToSeedLevel(
    prisma,
    created.value.characters,
    TEST_OFFERS_SEED
  )

  return `conta ${TEST_ACCOUNT.username}: 12 personagens no nível ${SEED_CHARACTER_LEVEL}, ${offers} blocos de skill (senha ${TEST_ACCOUNT.password})`
}
