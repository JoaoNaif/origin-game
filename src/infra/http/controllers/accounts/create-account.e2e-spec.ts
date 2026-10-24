import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Create Account (e2e)', () => {
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

  test('[POST] /accounts', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({ username: '  Joao_Naif ', displayName: 'João' })

    expect(response.statusCode).toBe(201)
    expect(response.body).toEqual({
      account: {
        id: expect.any(String),
        username: 'joao_naif',
        displayName: 'João',
      },
    })

    const saved = await prisma.account.findUnique({
      where: { username: 'joao_naif' },
    })
    expect(saved?.id).toBe(response.body.account.id)
  })

  test('[POST] /accounts starts with the 12 characters of the catalog', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({ username: 'com_elenco', displayName: 'Elenco' })

    const characters = await prisma.character.findMany({
      where: { accountId: response.body.account.id },
      include: { skills: true, traits: true },
    })
    expect(characters).toHaveLength(12)
    expect(new Set(characters.map((c) => c.templateId)).size).toBe(12)
    expect(
      characters.every(
        (c) =>
          c.level === 0 &&
          c.skills.filter((s) => s.buildSlot !== null).length === 4
      )
    ).toBe(true)
  })

  test('[POST] /accounts with a taken username fails', async () => {
    await request(app.getHttpServer())
      .post('/accounts')
      .send({ username: 'repetido', displayName: 'Primeiro' })

    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({ username: 'REPETIDO', displayName: 'Segundo' })

    expect(response.statusCode).toBe(409)
  })

  test('[POST] /accounts with an invalid username fails', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({ username: 'Joao Naif!', displayName: 'João' })

    expect(response.statusCode).toBe(400)
  })

  test('[POST] /accounts without a display name fails', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({ username: 'sem_nome' })

    expect(response.statusCode).toBe(400)
  })
})
