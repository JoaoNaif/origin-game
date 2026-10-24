import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount } from 'test/e2e/accounts'
import { createSquad, membersOf } from 'test/e2e/squads'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Account Squads (e2e)', () => {
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

  test('[GET] /me/squads', async () => {
    const { agent, characters } = await createAccount(app, 'lista_01')
    await createSquad(agent, membersOf(characters), 'Muralha')
    await createSquad(agent, membersOf(characters.slice(4)), 'Caçada')
    const other = await createAccount(app, 'lista_outra')
    await createSquad(other.agent, membersOf(other.characters), 'Alheio')

    const response = await agent.get('/me/squads')

    expect(response.statusCode).toBe(200)
    expect(response.body.squads.map((s: { name: string }) => s.name)).toEqual([
      'Muralha',
      'Caçada',
    ])
    expect(response.body.squads[0].members).toHaveLength(4)
  })

  test('[GET] /me/squads of an account without squads', async () => {
    const { agent } = await createAccount(app, 'lista_02')

    const response = await agent.get('/me/squads')

    expect(response.statusCode).toBe(200)
    expect(response.body.squads).toEqual([])
  })
})
