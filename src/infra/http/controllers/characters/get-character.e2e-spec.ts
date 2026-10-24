import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount, UNKNOWN_ID } from 'test/e2e/accounts'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Get Character (e2e)', () => {
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

  test('[GET] /characters/:id', async () => {
    const { agent, characters } = await createAccount(app, 'personagem_01')

    const response = await agent.get(`/characters/${characters[0].id}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.character).toMatchObject({
      id: characters[0].id,
      templateKey: characters[0].templateKey,
      skills: expect.any(Array),
      traitKeys: expect.any(Array),
    })
  })

  test('[GET] /characters/:id of another account fails', async () => {
    const { characters } = await createAccount(app, 'personagem_02')
    const { agent: other } = await createAccount(app, 'personagem_03')

    const response = await other.get(`/characters/${characters[0].id}`)

    expect(response.statusCode).toBe(403)
  })

  test('[GET] /characters/:id with an unknown id fails', async () => {
    const { agent } = await createAccount(app, 'personagem_04')

    const response = await agent.get(`/characters/${UNKNOWN_ID}`)

    expect(response.statusCode).toBe(404)
  })

  test('[GET] /characters/:id with an id out of format fails', async () => {
    const { agent } = await createAccount(app, 'personagem_05')

    const response = await agent.get('/characters/nao-e-um-uuid')

    expect(response.statusCode).toBe(400)
  })
})
