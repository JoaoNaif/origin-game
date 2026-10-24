import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Npc Squads (e2e)', () => {
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

  test('[GET] /npc-squads', async () => {
    const response = await request(app.getHttpServer()).get('/npc-squads')

    expect(response.statusCode).toBe(200)
    expect(response.body.npcSquads).toHaveLength(20)
    expect(response.body.npcSquads[0]).toMatchObject({
      key: expect.any(String),
      name: expect.any(String),
      profile: expect.any(String),
      difficulty: 'BEGINNER',
      level: 18,
    })
    expect(response.body.npcSquads.at(-1).difficulty).toBe('GRANDMASTER')
  })

  test('[GET] /npc-squads never shows the formation or the skills', async () => {
    const response = await request(app.getHttpServer()).get('/npc-squads')

    // a formação do rival só aparece quando a batalha começa, e as skills nem nela (pvp_brief.md 3)
    for (const squad of response.body.npcSquads) {
      expect(squad).not.toHaveProperty('members')
    }
  })

  test('[GET] /npc-squads?difficulty=MASTER', async () => {
    const response = await request(app.getHttpServer()).get(
      '/npc-squads?difficulty=MASTER'
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.npcSquads).toHaveLength(4)
    expect(
      response.body.npcSquads.every(
        (s: { difficulty: string }) => s.difficulty === 'MASTER'
      )
    ).toBe(true)
  })

  test('[GET] /npc-squads with an unknown difficulty fails', async () => {
    const response = await request(app.getHttpServer()).get(
      '/npc-squads?difficulty=EASY'
    )

    expect(response.statusCode).toBe(400)
  })
})
