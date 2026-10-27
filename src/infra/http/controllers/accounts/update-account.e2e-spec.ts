import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp, TEST_PASSWORD } from 'test/e2e/accounts'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Update Account (e2e)', () => {
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

  test('[PATCH] /me changes the display name', async () => {
    const agent = await signUp(app, 'renomeia_01')

    const response = await agent.patch('/me').send({ displayName: 'Novo Nome' })

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      account: {
        id: expect.any(String),
        username: 'renomeia_01',
        displayName: 'Novo Nome',
        role: 'PLAYER',
      },
    })
    expect(response.get('Set-Cookie')).toBeUndefined()
  })

  test('[PATCH] /me changes the password and keeps only this session', async () => {
    const agent = await signUp(app, 'troca_senha')
    const other = request.agent(app.getHttpServer())
    await other
      .post('/sessions')
      .send({ username: 'troca_senha', password: TEST_PASSWORD })

    const response = await agent
      .patch('/me')
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'senha-nova' })

    expect(response.statusCode).toBe(200)
    const cookies = response.get('Set-Cookie') ?? []
    expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true)

    const sessions = await prisma.session.count({
      where: { account: { username: 'troca_senha' } },
    })
    expect(sessions).toBe(1)

    // o outro aparelho não renova mais; este continua logado
    const otherRefresh = await other.post('/sessions/refresh')
    expect(otherRefresh.statusCode).toBe(401)
    expect((await agent.post('/sessions/refresh')).statusCode).toBe(204)

    const login = await request(app.getHttpServer())
      .post('/sessions')
      .send({ username: 'troca_senha', password: 'senha-nova' })
    expect(login.statusCode).toBe(204)
  })

  test('[PATCH] /me with a wrong current password fails', async () => {
    const agent = await signUp(app, 'senha_errada')

    const response = await agent
      .patch('/me')
      .send({ currentPassword: 'errada123', newPassword: 'senha-nova' })

    expect(response.statusCode).toBe(400)
    expect(response.get('Set-Cookie')).toBeUndefined()
  })

  test('[PATCH] /me with a short display name fails', async () => {
    const agent = await signUp(app, 'nome_curto')

    const response = await agent.patch('/me').send({ displayName: 'J' })

    expect(response.statusCode).toBe(400)
  })

  test('[PATCH] /me cannot change the username', async () => {
    const agent = await signUp(app, 'fica_igual')

    const response = await agent.patch('/me').send({ username: 'outro_nome' })

    expect(response.statusCode).toBe(400)
  })

  test('[PATCH] /me without being logged in fails', async () => {
    const response = await request(app.getHttpServer())
      .patch('/me')
      .send({ displayName: 'Novo Nome' })

    expect(response.statusCode).toBe(401)
  })
})
