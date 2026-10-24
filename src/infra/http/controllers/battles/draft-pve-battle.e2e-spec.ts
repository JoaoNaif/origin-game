import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount } from 'test/e2e/accounts'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Draft Pve Battle (e2e)', () => {
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

  test('[POST] /accounts/:username/battle-drafts', async () => {
    await createAccount(app, 'pre_01')

    const response = await request(app.getHttpServer())
      .post('/accounts/pre_01/battle-drafts')
      .send({ npcSquadKey: 'balanced-beginner' })

    expect(response.statusCode).toBe(201)
    expect(response.body.draft).toMatchObject({
      id: expect.any(String),
      opponent: {
        key: 'balanced-beginner',
        name: expect.any(String),
        profile: 'BALANCED',
        difficulty: 'BEGINNER',
      },
      // o campo aparece antes da escolha do squad (D28, D112), com os traços que dão o bônus
      field: {
        key: expect.any(String),
        name: expect.any(String),
        requiredTraitKeys: expect.any(Array),
        primaryPercent: expect.any(Number),
        secondaryPercent: expect.any(Number),
      },
    })
  })

  test('[POST] /accounts/:username/battle-drafts never sends the seed', async () => {
    await createAccount(app, 'pre_02')

    const response = await request(app.getHttpServer())
      .post('/accounts/pre_02/battle-drafts')
      .send({ npcSquadKey: 'balanced-beginner' })

    expect(JSON.stringify(response.body)).not.toMatch(/seed/i)
  })

  test('[POST] /accounts/:username/battle-drafts against an unknown NPC fails', async () => {
    await createAccount(app, 'pre_03')

    const response = await request(app.getHttpServer())
      .post('/accounts/pre_03/battle-drafts')
      .send({ npcSquadKey: 'ninguem' })

    expect(response.statusCode).toBe(404)
  })

  test('[POST] /accounts/:username/battle-drafts of an unknown account fails', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts/ninguem/battle-drafts')
      .send({ npcSquadKey: 'balanced-beginner' })

    expect(response.statusCode).toBe(404)
  })

  test('[POST] /accounts/:username/battle-drafts without the NPC fails', async () => {
    await createAccount(app, 'pre_04')

    const response = await request(app.getHttpServer())
      .post('/accounts/pre_04/battle-drafts')
      .send({})

    expect(response.statusCode).toBe(400)
  })
})
