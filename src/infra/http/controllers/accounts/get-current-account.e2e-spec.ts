import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Get Current Account (e2e)', () => {
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

  test('[GET] /me', async () => {
    const agent = await signUp(app, 'eu_mesmo')

    const response = await agent.get('/me')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      account: {
        id: expect.any(String),
        username: 'eu_mesmo',
        displayName: 'Jogador',
      },
    })
  })

  test('[GET] /me without being logged in fails', async () => {
    const response = await request(app.getHttpServer()).get('/me')

    expect(response.statusCode).toBe(401)
  })

  test('[GET] /me with a forged token fails', async () => {
    const response = await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', 'access_token=nao.e.um.jwt')

    expect(response.statusCode).toBe(401)
  })
})
