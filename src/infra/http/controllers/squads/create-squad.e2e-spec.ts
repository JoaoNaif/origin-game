import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount, UNKNOWN_ID } from 'test/e2e/accounts'
import { membersOf } from 'test/e2e/squads'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Create Squad (e2e)', () => {
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

  test('[POST] /me/squads', async () => {
    const { agent, characters } = await createAccount(app, 'squad_01')
    const members = membersOf(characters)

    const response = await agent
      .post('/me/squads')
      .send({ name: '  Muralha ', members })

    expect(response.statusCode).toBe(201)
    expect(response.body.squad).toMatchObject({
      id: expect.any(String),
      name: 'Muralha',
    })

    const saved = await prisma.squadMember.findMany({
      where: { squadId: response.body.squad.id },
    })
    expect(
      saved.map(({ characterId, row, column }) => ({
        characterId,
        row,
        column,
      }))
    ).toEqual(expect.arrayContaining(members))
    expect(saved).toHaveLength(4)
  })

  test('[POST] /me/squads with characters of another account fails', async () => {
    const { agent } = await createAccount(app, 'squad_02')
    const others = await createAccount(app, 'squad_03')

    const response = await agent
      .post('/me/squads')
      .send({ name: 'Emprestado', members: membersOf(others.characters) })

    expect(response.statusCode).toBe(400)
  })

  test('[POST] /me/squads with two characters in one cell fails', async () => {
    const { agent, characters } = await createAccount(app, 'squad_04')
    const members = membersOf(characters)
    members[1] = { ...members[1], row: 0, column: 0 }

    const response = await agent
      .post('/me/squads')
      .send({ name: 'Empilhado', members })

    expect(response.statusCode).toBe(400)
  })

  test('[POST] /me/squads with 3 characters fails', async () => {
    const { agent, characters } = await createAccount(app, 'squad_05')

    const response = await agent
      .post('/me/squads')
      .send({ name: 'Incompleto', members: membersOf(characters).slice(0, 3) })

    expect(response.statusCode).toBe(400)
  })

  test('[POST] /me/squads with an unknown character fails', async () => {
    const { agent, characters } = await createAccount(app, 'squad_06')
    const members = membersOf(characters)
    members[0] = { ...members[0], characterId: UNKNOWN_ID }

    const response = await agent
      .post('/me/squads')
      .send({ name: 'Fantasma', members })

    expect(response.statusCode).toBe(404)
  })

  test('[POST] /me/squads without being logged in fails', async () => {
    const response = await request(app.getHttpServer())
      .post('/me/squads')
      .send({ name: 'Sem dono', members: [] })

    expect(response.statusCode).toBe(401)
  })
})
