import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'

/** Cliente HTTP com cookies (como o navegador): depois do login, o `access_token` vai junto. */
export type Agent = ReturnType<typeof request.agent>

export const TEST_PASSWORD = '12345678'

export interface CharacterBody {
  id: string
  templateKey: string
  level: number
  skills: { key: string; buildSlot: number | null }[]
}

/** Cadastra e entra: devolve o cliente já logado. */
export async function signUp(
  app: INestApplication,
  username: string
): Promise<Agent> {
  const agent = request.agent(app.getHttpServer())

  await agent
    .post('/accounts')
    .send({ username, displayName: 'Jogador', password: TEST_PASSWORD })
  await agent.post('/sessions').send({ username, password: TEST_PASSWORD })

  return agent
}

/** Cadastra, entra e lê os personagens (a conta já vem com os 12, D133). */
export async function createAccount(app: INestApplication, username: string) {
  const agent = await signUp(app, username)
  const response = await agent.get('/me/characters')

  return {
    agent,
    characters: response.body.characters as CharacterBody[],
  }
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
