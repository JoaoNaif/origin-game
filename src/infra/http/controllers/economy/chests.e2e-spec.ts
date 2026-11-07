import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp, UNKNOWN_ID } from 'test/e2e/accounts'
import { giveWallet } from 'test/e2e/economy'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Buy, Fetch and Open Chests (e2e)', () => {
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

  test('[POST] /me/chests, [GET] /me/chests and [POST] /chests/:id/open', async () => {
    const agent = await signUp(app, 'bau_01')
    await giveWallet(prisma, 'bau_01', 1000)

    const bought = await agent.post('/me/chests').send({ tier: 'E' })

    expect(bought.statusCode).toBe(201)
    expect(bought.body.chest).toMatchObject({
      tier: 'E',
      source: 'PURCHASE',
      openedAt: null,
      contents: null,
    })
    expect(bought.body.wallet.coins).toBe(700)

    const closed = await agent.get('/me/chests')
    expect(closed.body.chests.map((c: { id: string }) => c.id)).toEqual([
      bought.body.chest.id,
    ])

    const opened = await agent.post(`/chests/${bought.body.chest.id}/open`)

    expect(opened.statusCode).toBe(200)
    const { contents } = opened.body.chest
    expect(contents).toMatchObject({
      rarity: expect.any(String),
      coins: expect.any(Number),
    })
    expect(opened.body.wallet.coins).toBe(700 + contents.coins)
    if (opened.body.character) {
      // personagem de baú no Elenco: 12 iniciais + 1
      expect(opened.body.character.templateKey).toBe(
        contents.character.templateKey
      )
      const owned = await agent.get('/me/characters')
      expect(owned.body.characters).toHaveLength(13)
    }
    expect((await agent.get('/me/chests')).body.chests).toEqual([])

    // abrir de novo não entrega nada
    const again = await agent.post(`/chests/${bought.body.chest.id}/open`)
    expect(again.statusCode).toBe(400)
  })

  test('[POST] /me/chests of a tier that is not sold or without coins', async () => {
    const agent = await signUp(app, 'bau_02')

    const notSold = await agent.post('/me/chests').send({ tier: 'SS' })
    const poor = await agent.post('/me/chests').send({ tier: 'E' })

    expect(notSold.statusCode).toBe(400)
    expect(poor.statusCode).toBe(400)
  })

  test('[POST] /chests/:id/open of another account or unknown', async () => {
    const owner = await signUp(app, 'bau_03')
    await giveWallet(prisma, 'bau_03', 300)
    const bought = await owner.post('/me/chests').send({ tier: 'E' })
    const other = await signUp(app, 'bau_04')

    const forbidden = await other.post(`/chests/${bought.body.chest.id}/open`)
    const unknown = await other.post(`/chests/${UNKNOWN_ID}/open`)

    expect(forbidden.statusCode).toBe(403)
    expect(unknown.statusCode).toBe(404)
  })
})
