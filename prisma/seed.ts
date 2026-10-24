import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { seedDatabase } from './seed/seed-database'
import { seedTestAccount } from './seed/seed-test-account'

/**
 * Seed do MVP (`npx prisma db seed`): grava o conteúdo de `prisma/seed/content` (variantes, traços, 12 personagens,
 * skills, 6 campos e 20 squads de NPC) e a conta de teste `tester_01`. Idempotente: atualiza pela `key`, recria as
 * ligações e mantém a conta de teste se ela já existe.
 */
const prisma = new PrismaService()

async function main() {
  console.log(await seedDatabase(prisma))
  console.log(await seedTestAccount(prisma))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
