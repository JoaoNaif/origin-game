import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
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
    const created = await request(app.getHttpServer())
      .post('/accounts')
      .send({ username: 'tester_01', displayName: 'Tester' })

    const response = await request(app.getHttpServer()).get(
      '/accounts/Tester_01'
    )

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      account: {
        id: created.body.account.id,
        username: 'tester_01',
        displayName: 'Tester',
      },
    })
  })

  test('[GET] /accounts/:username with an unknown username fails', async () => {
    const response = await request(app.getHttpServer()).get('/accounts/ninguem')

    expect(response.statusCode).toBe(404)
  })
})
