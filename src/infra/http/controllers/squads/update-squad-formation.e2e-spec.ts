import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount, UNKNOWN_ID } from 'test/e2e/accounts'
import { createSquad, membersOf } from 'test/e2e/squads'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Update Squad Formation (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    configureApp(app)
    prisma = moduleRef.get(PrismaService)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  const savedCharacters = async (squadId: string) =>
    (await prisma.squadMember.findMany({ where: { squadId } }))
      .map((m) => m.characterId)
      .sort()

  test('[PUT] /squads/:id/formation', async () => {
    const characters = await createAccount(app, 'formacao_01')
    const squad = await createSquad(app, 'formacao_01', membersOf(characters))
    const members = membersOf(characters.slice(4))

    const response = await request(app.getHttpServer())
      .put(`/squads/${squad.id}/formation`)
      .send({ members })

    expect(response.statusCode).toBe(200)
    expect(await savedCharacters(squad.id)).toEqual(
      members.map((m) => m.characterId).sort()
    )
  })

  test('[PUT] /squads/:id/formation invalid keeps the previous formation', async () => {
    const characters = await createAccount(app, 'formacao_02')
    const squad = await createSquad(app, 'formacao_02', membersOf(characters))
    const before = await savedCharacters(squad.id)

    const response = await request(app.getHttpServer())
      .put(`/squads/${squad.id}/formation`)
      .send({ members: membersOf(characters.slice(4)).slice(0, 3) })

    expect(response.statusCode).toBe(400)
    expect(await savedCharacters(squad.id)).toEqual(before)
  })

  test('[PUT] /squads/:id/formation of an unknown squad fails', async () => {
    const characters = await createAccount(app, 'formacao_03')

    const response = await request(app.getHttpServer())
      .put(`/squads/${UNKNOWN_ID}/formation`)
      .send({ members: membersOf(characters) })

    expect(response.statusCode).toBe(404)
  })
})
