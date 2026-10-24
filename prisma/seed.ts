import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { seedDatabase } from './seed/seed-database'

/**
 * Seed do MVP (`npx prisma db seed`): grava o conteúdo de `prisma/seed/content` (variantes, traços, 12 personagens,
 * skills, 6 campos e 20 squads de NPC). Idempotente: atualiza pela `key` e recria as ligações.
 */
const prisma = new PrismaService()

async function main() {
  console.log(await seedDatabase(prisma))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
