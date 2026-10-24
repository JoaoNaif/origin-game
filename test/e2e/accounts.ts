import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'

export interface CharacterBody {
  id: string
  templateKey: string
  level: number
  skills: { key: string; buildSlot: number | null }[]
}

/** Cria a conta (que já vem com os 12 personagens, D133) e devolve os personagens dela. */
export async function createAccount(
  app: INestApplication,
  username: string
): Promise<CharacterBody[]> {
  await request(app.getHttpServer())
    .post('/accounts')
    .send({ username, displayName: 'Jogador' })

  const response = await request(app.getHttpServer()).get(
    `/accounts/${username}/characters`
  )

  return response.body.characters
}

/** Sobe os personagens direto no banco (o XP de verdade vem das batalhas). */
export async function setLevel(
  prisma: PrismaClient,
  characters: { id: string }[],
  level: number
) {
  await prisma.character.updateMany({
    where: { id: { in: characters.map((c) => c.id) } },
    data: { level },
  })
}

/** Skills da build, na ordem dos slots. */
export function buildKeys(character: CharacterBody): string[] {
  return character.skills
    .filter((s) => s.buildSlot !== null)
    .sort((a, b) => a.buildSlot! - b.buildSlot!)
    .map((s) => s.key)
}

export const UNKNOWN_ID = '8f1c2b4e-0000-4000-8000-000000000000'
