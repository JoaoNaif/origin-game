import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { TEST_PASSWORD } from 'test/e2e/accounts'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Authenticate (e2e)', () => {
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

    await request(app.getHttpServer()).post('/accounts').send({
      username: 'login_01',
      displayName: 'Login',
      password: TEST_PASSWORD,
    })
  })

  afterAll(async () => {
    await app.close()
  })

  test('[POST] /sessions', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('User-Agent', 'Chrome no Windows')
      .send({ username: 'Login_01', password: TEST_PASSWORD })

    expect(response.statusCode).toBe(204)
    expect(response.body).toEqual({})

    // os tokens saem só em cookies httpOnly; o refresh só vai às rotas de sessão
    const cookies = response.get('Set-Cookie') ?? []
    const access = cookies.find((c) => c.startsWith('access_token='))
    const refresh = cookies.find((c) => c.startsWith('refresh_token='))
    expect(access).toMatch(/HttpOnly/)
    expect(access).toMatch(/SameSite=Strict/)
    expect(refresh).toMatch(/Path=\/sessions/)

    const sessions = await prisma.session.findMany({
      where: { account: { username: 'login_01' } },
    })
    expect(sessions.at(-1)?.userAgent).toBe('Chrome no Windows')
  })

  test('[POST] /sessions with a wrong password fails', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .send({ username: 'login_01', password: 'errada123' })

    expect(response.statusCode).toBe(401)
    expect(response.get('Set-Cookie')).toBeUndefined()
  })

  test('[POST] /sessions with an unknown username fails the same way', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .send({ username: 'ninguem', password: TEST_PASSWORD })

    expect(response.statusCode).toBe(401)
  })

  test('[POST] /sessions without the password fails', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .send({ username: 'login_01' })

    expect(response.statusCode).toBe(400)
  })
})
