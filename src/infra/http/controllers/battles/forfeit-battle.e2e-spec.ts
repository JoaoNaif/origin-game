import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp, UNKNOWN_ID } from 'test/e2e/accounts'
import { startBattle } from 'test/e2e/battles'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Forfeit Battle (e2e)', () => {
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

  test('[POST] /battles/:id/forfeit', async () => {
    const { agent, battleId, squadCharacterIds } = await startBattle(
      app,
      prisma,
      'desistir_01'
    )

    const response = await agent.post(`/battles/${battleId}/forfeit`)

    expect(response.statusCode).toBe(200)
    expect(response.body.battle).toMatchObject({
      status: 'FINISHED',
      turn: null,
      result: { winner: 'OPPONENT', endReason: 'ABANDON', rewards: [] },
    })

    // sem XP e fora da lista em andamento
    const characters = await prisma.character.findMany({
      where: { id: { in: squadCharacterIds } },
    })
    expect(characters.every((c) => c.xp === 0)).toBe(true)
    const inProgress = await agent.get('/me/battles?status=IN_PROGRESS')
    expect(inProgress.body.battles).toEqual([])
  })

  test('[POST] /battles/:id/forfeit twice fails', async () => {
    const { agent, battleId } = await startBattle(app, prisma, 'desistir_02')
    await agent.post(`/battles/${battleId}/forfeit`)

    const again = await agent.post(`/battles/${battleId}/forfeit`)

    expect(again.statusCode).toBe(409)
  })

  test('[POST] /battles/:id/forfeit of another account fails', async () => {
    const { battleId } = await startBattle(app, prisma, 'desistir_03')
    const other = await signUp(app, 'desistir_04')

    const response = await other.post(`/battles/${battleId}/forfeit`)

    expect(response.statusCode).toBe(403)
    const saved = await prisma.battle.findUnique({ where: { id: battleId } })
    expect(saved?.status).toBe('IN_PROGRESS')
  })

  test('[POST] /battles/:id/forfeit of an unknown battle fails', async () => {
    const agent = await signUp(app, 'desistir_05')

    const response = await agent.post(`/battles/${UNKNOWN_ID}/forfeit`)

    expect(response.statusCode).toBe(404)
  })
})
