import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount, UNKNOWN_ID } from 'test/e2e/accounts'
import { prepareBattle } from 'test/e2e/battles'
import { createSquad, membersOf } from 'test/e2e/squads'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

interface UnitBody {
  side: string
  stats: object | null
  skills: unknown[]
  characterId: string | null
}

describe('Start Pve Battle (e2e)', () => {
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

  test('[POST] /battles', async () => {
    const { agent, draft, squadId, squadCharacterIds } = await prepareBattle(
      app,
      prisma,
      'inicio_01'
    )

    const response = await agent
      .post('/battles')
      .send({ draftId: draft.id, squadId })

    expect(response.statusCode).toBe(201)
    const { battle, events, rewards } = response.body
    expect(battle).toMatchObject({
      status: 'IN_PROGRESS',
      mode: 'PVE',
      opponent: { profile: 'BALANCED', difficulty: 'BEGINNER' },
      turn: { side: 'PLAYER' },
      field: { key: draft.field!.key, isInitial: true },
      result: null,
    })
    expect(battle.units).toHaveLength(8)
    expect(battle.timeline.length).toBeGreaterThan(0)
    expect(events[0]).toMatchObject({
      type: 'FIELD',
      fieldKey: draft.field!.key,
    })
    expect(rewards).toEqual([])

    const saved = await prisma.battle.findUnique({ where: { id: battle.id } })
    expect(saved).toMatchObject({ status: 'IN_PROGRESS', squadId })
    // as unidades seguem a formação gravada (linha, coluna), não a ordem do pedido
    const mine = battle.units.filter((u: UnitBody) => u.side === 'PLAYER')
    expect(mine.map((u: UnitBody) => u.characterId).sort()).toEqual(
      [...squadCharacterIds].sort()
    )
  })

  test('[POST] /battles shows only what the player may know of the enemy', async () => {
    const { agent, draft, squadId } = await prepareBattle(
      app,
      prisma,
      'inicio_02'
    )

    const response = await agent
      .post('/battles')
      .send({ draftId: draft.id, squadId })

    const { battle } = response.body
    expect(JSON.stringify(battle)).not.toMatch(/seed/i)

    // classe, nível e traços; sem stats e só as skills já usadas (pvp_brief.md 3)
    for (const unit of battle.units as UnitBody[]) {
      if (unit.side === 'PLAYER') {
        expect(unit.stats).not.toBeNull()
        expect(unit.skills).toHaveLength(4)
      } else {
        expect(unit.stats).toBeNull()
        expect(unit.characterId).toBeNull()
        expect(unit.skills.length).toBeLessThan(4)
      }
    }
  })

  test('[POST] /battles uses the draft only once', async () => {
    const { agent, draft, squadId } = await prepareBattle(
      app,
      prisma,
      'inicio_03'
    )
    await agent.post('/battles').send({ draftId: draft.id, squadId })

    const again = await agent
      .post('/battles')
      .send({ draftId: draft.id, squadId })

    expect(again.statusCode).toBe(404)
  })

  test('[POST] /battles with the draft of another account fails', async () => {
    const { draft } = await prepareBattle(app, prisma, 'inicio_04')
    const other = await createAccount(app, 'inicio_05')
    const squad = await createSquad(other.agent, membersOf(other.characters))

    const response = await other.agent
      .post('/battles')
      .send({ draftId: draft.id, squadId: squad.id })

    expect(response.statusCode).toBe(403)
  })

  test('[POST] /battles with a squad of another account fails', async () => {
    const { agent, draft } = await prepareBattle(app, prisma, 'inicio_06')
    const other = await createAccount(app, 'inicio_07')
    const squad = await createSquad(other.agent, membersOf(other.characters))

    const response = await agent
      .post('/battles')
      .send({ draftId: draft.id, squadId: squad.id })

    expect(response.statusCode).toBe(403)
  })

  test('[POST] /battles with an unknown squad fails', async () => {
    const { agent, draft } = await prepareBattle(app, prisma, 'inicio_08')

    const response = await agent
      .post('/battles')
      .send({ draftId: draft.id, squadId: UNKNOWN_ID })

    expect(response.statusCode).toBe(404)
  })

  test('[POST] /battles with an id out of format fails', async () => {
    const { agent } = await prepareBattle(app, prisma, 'inicio_09')

    const response = await agent
      .post('/battles')
      .send({ draftId: 'qualquer', squadId: 'qualquer' })

    expect(response.statusCode).toBe(400)
  })
})
