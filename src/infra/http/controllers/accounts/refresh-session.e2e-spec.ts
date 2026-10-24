import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { TEST_PASSWORD } from 'test/e2e/accounts'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Refresh Session (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    configureApp(app)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  /** Cadastra, entra e devolve o cookie `refresh_token=...`. */
  async function login(username: string) {
    await request(app.getHttpServer())
      .post('/accounts')
      .send({ username, displayName: 'Jogador', password: TEST_PASSWORD })
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .send({ username, password: TEST_PASSWORD })

    return refreshCookie(response.get('Set-Cookie'))
  }

  const refreshCookie = (cookies: string[] | undefined) =>
    (cookies ?? []).find((c) => c.startsWith('refresh_token='))!.split(';')[0]

  test('[POST] /sessions/refresh', async () => {
    const cookie = await login('renova_01')

    const response = await request(app.getHttpServer())
      .post('/sessions/refresh')
      .set('Cookie', cookie)

    expect(response.statusCode).toBe(204)
    const renewed = refreshCookie(response.get('Set-Cookie'))
    expect(renewed).not.toBe(cookie)
  })

  test('[POST] /sessions/refresh with a used token revokes the session', async () => {
    const cookie = await login('renova_02')
    const first = await request(app.getHttpServer())
      .post('/sessions/refresh')
      .set('Cookie', cookie)
    const renewed = refreshCookie(first.get('Set-Cookie'))

    // o token antigo apareceu de novo: alguém o copiou
    const reused = await request(app.getHttpServer())
      .post('/sessions/refresh')
      .set('Cookie', cookie)
    expect(reused.statusCode).toBe(401)

    // e o novo, emitido antes do roubo ser percebido, também caiu
    const afterTheft = await request(app.getHttpServer())
      .post('/sessions/refresh')
      .set('Cookie', renewed)
    expect(afterTheft.statusCode).toBe(401)
  })

  test('[POST] /sessions/refresh without the cookie fails', async () => {
    const response = await request(app.getHttpServer()).post(
      '/sessions/refresh'
    )

    expect(response.statusCode).toBe(401)
  })
})
