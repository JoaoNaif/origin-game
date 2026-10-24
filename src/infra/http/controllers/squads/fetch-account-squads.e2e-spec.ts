import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
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

  test('[GET] /accounts/:username/squads', async () => {
    const characters = await createAccount(app, 'lista_01')
    await createSquad(app, 'lista_01', membersOf(characters), 'Muralha')
    await createSquad(app, 'lista_01', membersOf(characters.slice(4)), 'Caçada')

    const response = await request(app.getHttpServer()).get(
      '/accounts/lista_01/squads'
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.squads.map((s: { name: string }) => s.name)).toEqual([
      'Muralha',
      'Caçada',
    ])
    expect(response.body.squads[0].members).toHaveLength(4)
  })

  test('[GET] /accounts/:username/squads of an account without squads', async () => {
    await createAccount(app, 'lista_02')

    const response = await request(app.getHttpServer()).get(
      '/accounts/lista_02/squads'
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.squads).toEqual([])
  })

  test('[GET] /accounts/:username/squads of an unknown account fails', async () => {
    const response = await request(app.getHttpServer()).get(
      '/accounts/ninguem/squads'
    )

    expect(response.statusCode).toBe(404)
  })
})
