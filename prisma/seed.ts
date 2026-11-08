import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { seedAdminAccount } from './seed/seed-admin-account'
import { seedDatabase } from './seed/seed-database'
import {
  seedShowcaseAccount,
  SHOWCASE_ACCOUNT,
} from './seed/seed-showcase-account'
import { seedTestAccount, TEST_ACCOUNT } from './seed/seed-test-account'
import { seedTestWallets } from './seed/seed-test-wallets'

/**
 * Seed do MVP (`npx prisma db seed`): grava o conteúdo de `prisma/seed/content` (variantes, traços, 12 personagens
 * iniciais e 6 de baú, skills, 8 campos e 20 squads de NPC) e as contas de teste `tester_01` (jogador), `admin`
 * (admin) e `veterano` (vitrine do despertar e do DOM, nível 85 a 95), com saldo para testar baús e aprimoramento. Idempotente: atualiza pela `key`, recria as ligações e mantém
 * as contas de teste (e as carteiras) se elas já existem.
 */
const prisma = new PrismaService()

async function main() {
  console.log(await seedDatabase(prisma))
  console.log(await seedTestAccount(prisma))
  console.log(await seedAdminAccount(prisma))
  console.log(await seedShowcaseAccount(prisma))
  console.log(
    await seedTestWallets(prisma, [
      TEST_ACCOUNT.username,
      'admin',
      SHOWCASE_ACCOUNT.username,
    ])
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
