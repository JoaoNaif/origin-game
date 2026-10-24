import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { seedAdminAccount } from './seed/seed-admin-account'
import { seedDatabase } from './seed/seed-database'
import { seedTestAccount } from './seed/seed-test-account'

/**
 * Seed do MVP (`npx prisma db seed`): grava o conteúdo de `prisma/seed/content` (variantes, traços, 12 personagens,
 * skills, 6 campos e 20 squads de NPC) e as contas de teste `tester_01` (jogador) e `admin` (admin). Idempotente:
 * atualiza pela `key`, recria as ligações e mantém as contas de teste se elas já existem.
 */
const prisma = new PrismaService()

async function main() {
  console.log(await seedDatabase(prisma))
  console.log(await seedTestAccount(prisma))
  console.log(await seedAdminAccount(prisma))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
