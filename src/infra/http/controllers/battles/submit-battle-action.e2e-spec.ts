import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp, UNKNOWN_ID } from 'test/e2e/accounts'
import { playerMove, startBattle } from 'test/e2e/battles'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaBattlesRepository } from '@/infra/database/prisma/repositories/prisma-battles-repository'
import { configureApp } from '@/infra/setup-app'

describe('Submit Battle Action (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let battles: PrismaBattlesRepository

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    configureApp(app)
    prisma = moduleRef.get(PrismaService)
    battles = new PrismaBattlesRepository(prisma)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  const move = async (battleId: string) =>
    playerMove((await battles.findById(battleId))!)

  test('[POST] /battles/:id/actions', async () => {
    const { agent, battleId } = await startBattle(app, prisma, 'jogada_01')
    const before = await prisma.battleAction.count({ where: { battleId } })

    const response = await agent
      .post(`/battles/${battleId}/actions`)
      .send(await move(battleId))

    expect(response.statusCode).toBe(200)
    expect(response.body.events.length).toBeGreaterThan(0)

    // a jogada do jogador e as respostas da máquina ficam no log, em ordem
    const recorded = await prisma.battleAction.findMany({
      where: { battleId, sequence: { gte: before } },
      orderBy: { sequence: 'asc' },
    })
    expect(recorded[0].side).toBe('PLAYER')
    expect(recorded.slice(1).every((a) => a.side === 'OPPONENT')).toBe(true)
  })

  test('[POST] /battles/:id/actions with an illegal action changes nothing', async () => {
    const { agent, battleId } = await startBattle(app, prisma, 'jogada_02')
    const before = await prisma.battleAction.count({ where: { battleId } })

    const response = await agent.post(`/battles/${battleId}/actions`).send({
      type: 'SKILL',
      skillKey: 'nao-existe',
      targetSide: 'OPPONENT',
      target: { row: 0, column: 0 },
    })

    expect(response.statusCode).toBe(400)
    expect(await prisma.battleAction.count({ where: { battleId } })).toBe(
      before
    )
  })

  test('[POST] /battles/:id/actions with an action out of format fails', async () => {
    const { agent, battleId } = await startBattle(app, prisma, 'jogada_03')

    const response = await agent
      .post(`/battles/${battleId}/actions`)
      .send({ type: 'ATACAR' })

    expect(response.statusCode).toBe(400)
  })

  test('[POST] /battles/:id/actions in the battle of another account fails', async () => {
    const { battleId } = await startBattle(app, prisma, 'jogada_04')
    const before = await prisma.battleAction.count({ where: { battleId } })
    const other = await signUp(app, 'jogada_05')

    const response = await other
      .post(`/battles/${battleId}/actions`)
      .send(await move(battleId))

    expect(response.statusCode).toBe(403)
    expect(await prisma.battleAction.count({ where: { battleId } })).toBe(
      before
    )
  })

  test('[POST] /battles/:id/actions of an unknown battle fails', async () => {
    const agent = await signUp(app, 'jogada_06')

    const response = await agent
      .post(`/battles/${UNKNOWN_ID}/actions`)
      .send({ type: 'DEFEND' })

    expect(response.statusCode).toBe(404)
  })

  test('[POST] /battles/:id/actions until the end gives XP', async () => {
    const { agent, battleId, started, squadCharacterIds } = await startBattle(
      app,
      prisma,
      'jogada_07'
    )

    let last = started
    for (let i = 0; i < 400 && last.battle.status !== 'FINISHED'; i++) {
      const response = await agent
        .post(`/battles/${battleId}/actions`)
        .send(await move(battleId))
      expect(response.statusCode).toBe(200)
      last = response.body
    }

    expect(last.battle.status).toBe('FINISHED')
    expect(last.battle.result).toMatchObject({
      winner: expect.stringMatching(/PLAYER|OPPONENT/),
      endReason: expect.stringMatching(/ELIMINATION|ROUND_LIMIT/),
    })
    expect(last.battle.turn).toBeNull()
    expect(last.rewards).toHaveLength(4)
    expect(last.rewards.every((r: { xp: number }) => r.xp > 0)).toBe(true)

    const saved = await prisma.character.findMany({
      where: { id: { in: squadCharacterIds } },
    })
    expect(saved.every((c) => c.xp > 0 || c.level > 18)).toBe(true)
    expect(
      await prisma.battle.findUnique({ where: { id: battleId } })
    ).toMatchObject({ status: 'FINISHED', winner: last.battle.result.winner })

    // batalha encerrada não aceita jogada
    const after = await agent
      .post(`/battles/${battleId}/actions`)
      .send({ type: 'DEFEND' })
    expect(after.statusCode).toBe(409)
  }, 120_000)
})
