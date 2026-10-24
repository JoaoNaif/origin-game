import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { CharacterBody } from './accounts'

/** Squad "CORE" do seed (equilibrado). */
export const CORE_SQUAD = [
  { key: 'gaia', row: 0, column: 0 },
  { key: 'kael-vaz', row: 2, column: 0 },
  { key: 'lucky', row: 0, column: 2 },
  { key: 'kara', row: 1, column: 2 },
]

export function coreMembers(characters: CharacterBody[]) {
  return CORE_SQUAD.map(({ key, row, column }) => ({
    characterId: characters.find((c) => c.templateKey === key)!.id,
    row,
    column,
  }))
}

const CELLS = [
  { row: 0, column: 0 },
  { row: 2, column: 0 },
  { row: 1, column: 1 },
  { row: 1, column: 2 },
]

/** Os 4 primeiros personagens da lista, em 4 células distintas. */
export function membersOf(characters: CharacterBody[]) {
  return characters
    .slice(0, 4)
    .map((c, i) => ({ characterId: c.id, ...CELLS[i] }))
}

/** Salva um squad e devolve o corpo da resposta (`{ id, name, members }`). */
export async function createSquad(
  app: INestApplication,
  username: string,
  members: { characterId: string; row: number; column: number }[],
  name = 'Muralha'
) {
  const response = await request(app.getHttpServer())
    .post(`/accounts/${username}/squads`)
    .send({ name, members })

  return response.body.squad as {
    id: string
    name: string
    members: { characterId: string; row: number; column: number }[]
  }
}
