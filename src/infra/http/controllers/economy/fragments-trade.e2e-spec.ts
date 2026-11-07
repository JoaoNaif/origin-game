import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { giveWallet } from 'test/e2e/economy'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Buy and Sell Fragments (e2e)', () => {
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

  test('[POST] /me/fragments/buy and /me/fragments/sell', async () => {
    const agent = await signUp(app, 'fragmentos_01')
    await giveWallet(prisma, 'fragmentos_01', 1000)

    const bought = await agent
      .post('/me/fragments/buy')
      .send({ type: 'ELEMENTAL', amount: 4 })

    expect(bought.statusCode).toBe(200)
    expect(bought.body.wallet).toMatchObject({
      coins: 200,
      fragments: expect.objectContaining({ ELEMENTAL: 4 }),
    })

    const sold = await agent
      .post('/me/fragments/sell')
      .send({ type: 'ELEMENTAL', amount: 3 })

    expect(sold.statusCode).toBe(200)
    expect(sold.body.wallet).toMatchObject({
      coins: 320,
      fragments: expect.objectContaining({ ELEMENTAL: 1 }),
    })

    // cada mudança fica registrada
    const entries = await prisma.walletEntry.findMany({
      where: { account: { username: 'fragmentos_01' } },
    })
    expect(entries.map((e) => e.reason).sort()).toEqual([
      'FRAGMENT_PURCHASE',
      'FRAGMENT_PURCHASE',
      'FRAGMENT_SALE',
      'FRAGMENT_SALE',
    ])
  })

  test('[POST] /me/fragments/buy without coins or with an invalid body', async () => {
    const agent = await signUp(app, 'fragmentos_02')

    const poor = await agent
      .post('/me/fragments/buy')
      .send({ type: 'ELEMENTAL', amount: 1 })
    const invalid = await agent
      .post('/me/fragments/buy')
      .send({ type: 'FOGO', amount: 1 })

    expect(poor.statusCode).toBe(400)
    expect(invalid.statusCode).toBe(400)
  })
})
