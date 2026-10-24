import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp, UNKNOWN_ID } from 'test/e2e/accounts'
import { playerMove, startBattle } from 'test/e2e/battles'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaBattlesRepository } from '@/infra/database/prisma/repositories/prisma-battles-repository'
import { configureApp } from '@/infra/setup-app'

interface UnitBody {
  ref: string
  side: string
  skills: { key: string }[]
}

describe('Get Battle (e2e)', () => {
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

  test('[GET] /battles/:id', async () => {
    const { agent, battleId, started } = await startBattle(
      app,
      prisma,
      'ver_01'
    )

    const response = await agent.get(`/battles/${battleId}`)

    expect(response.statusCode).toBe(200)
    // refeita pelo replay, a batalha volta igual ao que o início mostrou
    expect(response.body.battle).toEqual(started.battle)
    expect(response.body.events).toEqual(started.events)
  })

  test('[GET] /battles/:id reveals an enemy skill only after it is used', async () => {
    const { agent, battleId } = await startBattle(app, prisma, 'ver_02')
    for (let i = 0; i < 6; i++) {
      await agent
        .post(`/battles/${battleId}/actions`)
        .send(playerMove((await battles.findById(battleId))!))
    }

    const response = await agent.get(`/battles/${battleId}`)

    const used = new Map<string, Set<string>>()
    for (const event of response.body.events) {
      if (event.type !== 'SKILL' || !event.ref.startsWith('OPPONENT')) continue
      used.set(
        event.ref,
        (used.get(event.ref) ?? new Set()).add(event.skillKey)
      )
    }
    expect(used.size).toBeGreaterThan(0)

    for (const unit of response.body.battle.units as UnitBody[]) {
      if (unit.side !== 'OPPONENT') continue
      expect(unit.skills.map((s) => s.key).sort()).toEqual(
        [...(used.get(unit.ref) ?? [])].sort()
      )
    }
  }, 60_000)

  test('[GET] /battles/:id of another account fails', async () => {
    const { battleId } = await startBattle(app, prisma, 'ver_03')
    const other = await signUp(app, 'ver_04')

    const response = await other.get(`/battles/${battleId}`)

    expect(response.statusCode).toBe(403)
  })

  test('[GET] /battles/:id of an unknown battle fails', async () => {
    const agent = await signUp(app, 'ver_05')

    const response = await agent.get(`/battles/${UNKNOWN_ID}`)

    expect(response.statusCode).toBe(404)
  })
})
