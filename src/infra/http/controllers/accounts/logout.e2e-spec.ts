import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Logout (e2e)', () => {
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

  test('[DELETE] /sessions', async () => {
    const agent = await signUp(app, 'sair_01')

    const response = await agent.delete('/sessions')

    expect(response.statusCode).toBe(204)
    const sessions = await prisma.session.findMany({
      where: { account: { username: 'sair_01' } },
    })
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true)

    // os cookies foram apagados: o cliente já não está logado
    expect((await agent.get('/me')).statusCode).toBe(401)
    expect((await agent.post('/sessions/refresh')).statusCode).toBe(401)
  })

  test('[DELETE] /sessions without being logged in also works', async () => {
    const response = await request(app.getHttpServer()).delete('/sessions')

    expect(response.statusCode).toBe(204)
  })
})
