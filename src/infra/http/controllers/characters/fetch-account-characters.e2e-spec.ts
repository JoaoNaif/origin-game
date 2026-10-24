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

  test('[GET] /me/characters', async () => {
    const { agent } = await createAccount(app, 'elenco_01')
    const other = await createAccount(app, 'elenco_outro')

    const response = await agent.get('/me/characters')

    expect(response.statusCode).toBe(200)
    expect(response.body.characters).toHaveLength(12)
    // só os da conta logada
    const ids = response.body.characters.map((c: { id: string }) => c.id)
    expect(
      ids.some((id: string) => other.characters.some((c) => c.id === id))
    ).toBe(false)

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

  test('[GET] /me/characters without being logged in fails', async () => {
    const response = await request(app.getHttpServer()).get('/me/characters')

    expect(response.statusCode).toBe(401)
  })
})
