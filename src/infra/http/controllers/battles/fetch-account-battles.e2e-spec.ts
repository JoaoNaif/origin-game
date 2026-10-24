import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { startBattle } from 'test/e2e/battles'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Account Battles (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    configureApp(app)
    prisma = moduleRef.get(PrismaService)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  test('[GET] /me/battles', async () => {
    const { agent, battleId, squadId } = await startBattle(
      app,
      prisma,
      'historico_01'
    )

    const response = await agent.get('/me/battles')

    expect(response.statusCode).toBe(200)
    expect(response.body.battles).toEqual([
      {
        id: battleId,
        mode: 'PVE',
        status: 'IN_PROGRESS',
        squadId,
        npcSquadId: expect.any(String),
        opponent: {
          name: expect.any(String),
          profile: 'BALANCED',
          difficulty: 'BEGINNER',
        },
        winner: null,
        endReason: null,
        rounds: null,
        startedAt: expect.any(String),
        finishedAt: null,
      },
    ])
  })

  test('[GET] /me/battles?status=IN_PROGRESS finds the battle to resume', async () => {
    const { agent, battleId } = await startBattle(app, prisma, 'historico_02')

    const inProgress = await agent.get('/me/battles?status=IN_PROGRESS')
    const finished = await agent.get('/me/battles?status=FINISHED')

    expect(inProgress.body.battles.map((b: { id: string }) => b.id)).toEqual([
      battleId,
    ])
    expect(finished.body.battles).toEqual([])
  })

  test('[GET] /me/battles never lists battles of another account', async () => {
    await startBattle(app, prisma, 'historico_03')
    const other = await signUp(app, 'historico_04')

    const response = await other.get('/me/battles')

    expect(response.body.battles).toEqual([])
  })

  test('[GET] /me/battles with an unknown status fails', async () => {
    const agent = await signUp(app, 'historico_05')

    const response = await agent.get('/me/battles?status=PAUSED')

    expect(response.statusCode).toBe(400)
  })

  test('[GET] /me/battles without being logged in fails', async () => {
    const response = await request(app.getHttpServer()).get('/me/battles')

    expect(response.statusCode).toBe(401)
  })
})
