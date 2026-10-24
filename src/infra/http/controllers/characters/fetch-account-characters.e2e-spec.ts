import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount } from 'test/e2e/accounts'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Account Characters (e2e)', () => {
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

  test('[GET] /accounts/:username/characters', async () => {
    await createAccount(app, 'elenco_01')
    await createAccount(app, 'elenco_outro')

    const response = await request(app.getHttpServer()).get(
      '/accounts/Elenco_01/characters'
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.characters).toHaveLength(12)

    const kael = response.body.characters.find(
      (c: { templateKey: string }) => c.templateKey === 'kael-vaz'
    )
    expect(kael).toMatchObject({
      name: 'Kael Vaz',
      characterClass: 'VANGUARD',
      level: 0,
      xp: 0,
      xpToNextLevel: expect.any(Number),
      stats: expect.objectContaining({ HP: expect.any(Number) }),
      freePoints: { available: 0 },
    })
  })

  test('[GET] /accounts/:username/characters of an unknown account fails', async () => {
    const response = await request(app.getHttpServer()).get(
      '/accounts/ninguem/characters'
    )

    expect(response.statusCode).toBe(404)
  })
})
