import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll } from 'vitest'
import { seedDatabase } from '../prisma/seed/seed-database'

config({ path: '.env', override: false })

// Os e2e fazem dezenas de cadastros e logins seguidos do mesmo IP: com o limite de requisições ligado, quase tudo
// daria 429.
process.env.RATE_LIMIT_ENABLED = 'false'

// Cada arquivo e2e roda num schema próprio do Postgres, criado pelas migrations e apagado no fim.
const schemaId = randomUUID()

// Pool pequeno por arquivo: vários arquivos rodam ao mesmo tempo contra o mesmo Postgres.
const CONNECTION_LIMIT = '5'

function buildDatabaseURL(schema?: string) {
  if (!process.env.DATABASE_URL) {
    throw new Error('Defina a variável de ambiente DATABASE_URL.')
  }

  const url = new URL(process.env.DATABASE_URL)
  if (schema) url.searchParams.set('schema', schema)
  url.searchParams.set('connection_limit', CONNECTION_LIMIT)
  return url.toString()
}

// Cliente só para apagar o schema do arquivo; uma conexão basta.
const adminPrisma = new PrismaClient({
  datasourceUrl: buildDatabaseURL().replace(
    `connection_limit=${CONNECTION_LIMIT}`,
    'connection_limit=1'
  ),
})

beforeAll(async () => {
  process.env.DATABASE_URL = buildDatabaseURL(schemaId)

  // node direto no CLI do Prisma (sem npx, que soma segundos por arquivo)
  execFileSync(
    process.execPath,
    [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
    { stdio: 'pipe', timeout: 50_000 }
  )

  // o conteúdo do MVP (catálogo) entra em todo schema: personagens, squads e batalhas dependem dele
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
  await seedDatabase(prisma)
  await prisma.$disconnect()
})

afterAll(async () => {
  await adminPrisma.$executeRawUnsafe(
    `DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`
  )
  await adminPrisma.$disconnect()
})
