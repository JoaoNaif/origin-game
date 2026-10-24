import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { TEST_PASSWORD } from 'test/e2e/accounts'
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

  const signUp = (body: object) =>
    request(app.getHttpServer()).post('/accounts').send(body)

  test('[POST] /accounts', async () => {
    const response = await signUp({
      username: '  Joao_Naif ',
      displayName: 'João',
      password: TEST_PASSWORD,
    })

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
    // só o hash da senha fica no banco, e ele nunca sai na resposta
    expect(saved?.passwordHash).not.toBe(TEST_PASSWORD)
    expect(JSON.stringify(response.body)).not.toContain(saved!.passwordHash)
  })

  test('[POST] /accounts starts with the 12 characters of the catalog', async () => {
    const response = await signUp({
      username: 'com_elenco',
      displayName: 'Elenco',
      password: TEST_PASSWORD,
    })

    const characters = await prisma.character.findMany({
      where: { accountId: response.body.account.id },
      include: { skills: true },
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
    await signUp({
      username: 'repetido',
      displayName: 'Primeiro',
      password: TEST_PASSWORD,
    })

    const response = await signUp({
      username: 'REPETIDO',
      displayName: 'Segundo',
      password: TEST_PASSWORD,
    })

    expect(response.statusCode).toBe(409)
  })

  test('[POST] /accounts with an invalid username fails', async () => {
    const response = await signUp({
      username: 'Joao Naif!',
      displayName: 'João',
      password: TEST_PASSWORD,
    })

    expect(response.statusCode).toBe(400)
  })

  test('[POST] /accounts with a short password fails', async () => {
    const response = await signUp({
      username: 'senha_curta',
      displayName: 'João',
      password: '1234567',
    })

    expect(response.statusCode).toBe(400)
  })

  test('[POST] /accounts without a password fails', async () => {
    const response = await signUp({
      username: 'sem_senha',
      displayName: 'João',
    })

    expect(response.statusCode).toBe(400)
  })
})
