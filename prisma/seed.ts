import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { seedAdminAccount } from './seed/seed-admin-account'
import { seedDatabase } from './seed/seed-database'
import { seedTestAccount, TEST_ACCOUNT } from './seed/seed-test-account'
import { seedTestWallets } from './seed/seed-test-wallets'

/**
 * Seed do MVP (`npx prisma db seed`): grava o conteúdo de `prisma/seed/content` (variantes, traços, 12 personagens
 * iniciais e 6 de baú, skills, 8 campos e 20 squads de NPC) e as contas de teste `tester_01` (jogador) e `admin`
 * (admin), com saldo para testar baús e aprimoramento. Idempotente: atualiza pela `key`, recria as ligações e mantém
 * as contas de teste (e as carteiras) se elas já existem.
 */
const prisma = new PrismaService()

async function main() {
  console.log(await seedDatabase(prisma))
  console.log(await seedTestAccount(prisma))
  console.log(await seedAdminAccount(prisma))
  console.log(await seedTestWallets(prisma, [TEST_ACCOUNT.username, 'admin']))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
