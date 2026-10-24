import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Account By Username (e2e)', () => {
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

  test('[GET] /accounts/:username', async () => {
    await signUp(app, 'tester_01')
    const searcher = await signUp(app, 'procura_01')

    const response = await searcher.get('/accounts/Tester_01')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      account: {
        id: expect.any(String),
        username: 'tester_01',
        displayName: 'Jogador',
      },
    })
  })

  test('[GET] /accounts/:username never shows the role of another account', async () => {
    await signUp(app, 'papel_01')
    const searcher = await signUp(app, 'procura_03')

    const response = await searcher.get('/accounts/papel_01')

    expect(response.body.account).not.toHaveProperty('role')
  })

  test('[GET] /accounts/:username with an unknown username fails', async () => {
    const searcher = await signUp(app, 'procura_02')

    const response = await searcher.get('/accounts/ninguem')

    expect(response.statusCode).toBe(404)
  })

  test('[GET] /accounts/:username without being logged in fails', async () => {
    const response = await request(app.getHttpServer()).get(
      '/accounts/tester_01'
    )

    expect(response.statusCode).toBe(401)
  })
})
