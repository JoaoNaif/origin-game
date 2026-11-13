import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount, setLevel } from 'test/e2e/accounts'
import { signUpAdmin } from 'test/e2e/admin'
import { coreMembers, createSquad } from 'test/e2e/squads'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Events (e2e)', () => {
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

  test('[GET] /events and /events/:key', async () => {
    const { agent } = await createAccount(app, 'events_list')

    const list = await agent.get('/events')
    expect(list.statusCode).toBe(200)
    const tower = list.body.events.find(
      (e: { key: string }) => e.key === 'torre-do-eco'
    )
    expect(tower).toMatchObject({
      kind: 'TOWER',
      phase: 'OPEN',
      progress: { clearedStages: 0, nextStage: 0, completed: false },
    })

    const one = await agent.get('/events/caca-ao-lobo')
    expect(one.statusCode).toBe(200)
    expect(one.body.event.progress).toMatchObject({
      attemptsLeft: 5,
      captureChance: 0.6,
    })

    expect((await agent.get('/events/nao-existe')).statusCode).toBe(404)
  })

  test('[POST] /events/:key/draft and /battles: the event battle counts the attempt', async () => {
    const { agent, characters } = await createAccount(app, 'events_play')
    await setLevel(prisma, characters, 18)
    const squad = await createSquad(agent, coreMembers(characters))

    const drafted = await agent.post('/events/laboratorio-da-sombra/draft')
    expect(drafted.statusCode).toBe(201)
    expect(drafted.body.draft).toMatchObject({
      event: { key: 'laboratorio-da-sombra', stage: 0, squadMode: 'FIXED' },
      opponent: { key: 'cautious-intermediate' },
      field: { key: 'arena' },
    })

    const started = await agent
      .post('/battles')
      .send({ draftId: drafted.body.draft.id, squadId: squad.id })
    expect(started.statusCode).toBe(201)
    expect(started.body.battle.event).toMatchObject({ stage: 0 })
    // stats nivelados no 30 (D155)
    expect(
      started.body.battle.units
        .filter((u: { side: string }) => u.side === 'PLAYER')
        .every((u: { level: number }) => u.level === 30)
    ).toBe(true)

    const event = await agent.get('/events/laboratorio-da-sombra')
    expect(event.body.event.progress).toMatchObject({
      attemptsLeft: 2,
      attemptsTotal: 1,
    })
    expect(event.body.event.progress.lockedCharacterIds).toHaveLength(4)
  })

  test('[POST] /battles: the unique boss refuses a squad below the required level', async () => {
    const { agent, characters } = await createAccount(app, 'events_boss')
    await setLevel(prisma, characters, 18)
    const squad = await createSquad(agent, coreMembers(characters))

    const drafted = await agent.post('/events/chefe-das-cinzas/draft')
    const started = await agent
      .post('/battles')
      .send({ draftId: drafted.body.draft.id, squadId: squad.id })

    expect(started.statusCode).toBe(400)
    expect(started.body.message).toMatch(/nível 40/)
  })

  test('[GET|POST|DELETE] /me/reward-box', async () => {
    const { agent } = await createAccount(app, 'events_box')
    const account = await prisma.account.findUniqueOrThrow({
      where: { username: 'events_box' },
    })
    const now = new Date()
    const [claimable, discardable] = await Promise.all(
      ['lobo-de-cinzas', 'falcao-de-tempestade'].map((beastKey) =>
        prisma.pendingReward.create({
          data: {
            accountId: account.id,
            reward: { type: 'BEAST', beastKey },
            createdAt: now,
            expiresAt: new Date(now.getTime() + 14 * 24 * 3600 * 1000),
          },
        })
      )
    )

    const box = await agent.get('/me/reward-box')
    expect(box.statusCode).toBe(200)
    expect(box.body.rewards).toHaveLength(2)
    expect(box.body.rewards[0].expiresAt).toBeDefined()

    const claimed = await agent.post(`/me/reward-box/${claimable.id}/claim`)
    expect(claimed.statusCode).toBe(200)
    expect(claimed.body.granted.status).toBe('DELIVERED')
    expect((await agent.get('/me/beasts')).body.beasts).toHaveLength(1)

    const discarded = await agent.delete(`/me/reward-box/${discardable.id}`)
    expect(discarded.statusCode).toBe(204)
    expect((await agent.get('/me/reward-box')).body.rewards).toHaveLength(0)
  })

  test('[POST|PUT|DELETE] /admin/events', async () => {
    const admin = await signUpAdmin(app, prisma, 'events_admin')

    const body = {
      key: 'torre-admin',
      name: 'Torre do Admin',
      kind: 'TOWER',
      announceAt: '2026-10-01T00:00:00.000Z',
      startsAt: '2026-10-10T00:00:00.000Z',
      endsAt: '2027-12-31T00:00:00.000Z',
      squadMode: 'FREE',
      stages: [
        {
          name: 'Piso 1',
          npcSquadKey: 'aggressive-beginner',
          rewards: [{ type: 'COINS', amount: 50 }],
        },
      ],
      completionRewards: [{ type: 'GEAR', gearKey: 'egide-cinzenta' }],
    }

    const created = await admin.post('/admin/events').send(body)
    expect(created.statusCode).toBe(201)
    expect(created.body.entry).toMatchObject({
      key: 'torre-admin',
      kind: 'TOWER',
    })

    const broken = await admin
      .post('/admin/events')
      .send({ ...body, key: 'torre-quebrada', fieldKey: 'nao-existe' })
    expect(broken.statusCode).toBe(400)

    const { key, ...edit } = body
    const updated = await admin
      .put(`/admin/events/${key}`)
      .send({ ...edit, name: 'Torre Renomeada' })
    expect(updated.statusCode).toBe(200)
    expect(updated.body.entry.name).toBe('Torre Renomeada')

    // squad de NPC usado por evento não sai
    expect(
      (await admin.delete('/admin/npc-squads/aggressive-beginner')).statusCode
    ).toBe(409)

    expect((await admin.delete('/admin/events/torre-admin')).statusCode).toBe(
      204
    )
  })
})
