import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount, UNKNOWN_ID } from 'test/e2e/accounts'
import { signUpAdmin } from 'test/e2e/admin'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Set Character Dom (e2e)', () => {
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

  test('[PUT] /admin/characters/:characterId/dom', async () => {
    const { agent: player, characters } = await createAccount(app, 'dom_01')
    const agent = await signUpAdmin(app, prisma, 'admin_dom_01')
    const target = characters[0]

    const response = await agent
      .put(`/admin/characters/${target.id}/dom`)
      .send({ pillars: { BODY: 'ADVANCED', MIND: 'BASIC', AURA: null } })

    expect(response.statusCode).toBe(200)
    const own = await player.get(`/characters/${target.id}`)
    const pillars = own.body.character.dom.pillars
    expect(
      pillars.find((p: { pillar: string }) => p.pillar === 'BODY')
    ).toMatchObject({
      level: 'ADVANCED',
      title: 'Indestrutível',
      nextLevel: null,
    })
    expect(
      pillars.find((p: { pillar: string }) => p.pillar === 'MIND')
    ).toMatchObject({
      level: 'BASIC',
      nextLevel: 'INTERMEDIATE',
    })
    expect(
      pillars.find((p: { pillar: string }) => p.pillar === 'AURA').level
    ).toBeNull()
  })

  test('[PUT] /admin/characters/:characterId/dom with an unknown level fails', async () => {
    const { characters } = await createAccount(app, 'dom_02')
    const agent = await signUpAdmin(app, prisma, 'admin_dom_02')

    const response = await agent
      .put(`/admin/characters/${characters[0].id}/dom`)
      .send({ pillars: { BODY: 'MASTER' } })

    expect(response.statusCode).toBe(400)
  })

  test('[PUT] /admin/characters/:characterId/dom of an unknown character fails', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_dom_03')

    const response = await agent
      .put(`/admin/characters/${UNKNOWN_ID}/dom`)
      .send({ pillars: {} })

    expect(response.statusCode).toBe(404)
  })

  test('[PUT] /admin/characters/:characterId/dom as a player fails', async () => {
    const { agent, characters } = await createAccount(app, 'dom_04')

    const response = await agent
      .put(`/admin/characters/${characters[0].id}/dom`)
      .send({ pillars: { BODY: 'ADVANCED' } })

    expect(response.statusCode).toBe(403)
  })
})
