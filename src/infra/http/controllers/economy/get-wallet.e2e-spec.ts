import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { giveWallet } from 'test/e2e/economy'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Get Wallet (e2e)', () => {
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

  test('[GET] /me/wallet of a new account', async () => {
    const agent = await signUp(app, 'carteira_01')

    const response = await agent.get('/me/wallet')

    expect(response.statusCode).toBe(200)
    expect(response.body.wallet).toEqual({
      coins: 0,
      fragments: {
        FUNDAMENTAL: 0,
        ELEMENTAL: 0,
        MATERIAL: 0,
        VECTORIAL: 0,
        PSYCHIC: 0,
        BIOLOGICAL: 0,
        NONE: 0,
      },
      fragmentCap: 500,
    })
  })

  test('[GET] /me/wallet with coins and fragments', async () => {
    const agent = await signUp(app, 'carteira_02')
    await giveWallet(prisma, 'carteira_02', 1234, { PSYCHIC: 7 })

    const response = await agent.get('/me/wallet')

    expect(response.body.wallet).toMatchObject({
      coins: 1234,
      fragments: expect.objectContaining({ PSYCHIC: 7, NONE: 0 }),
    })
  })

  test('[GET] /me/wallet without login', async () => {
    const response = await request(app.getHttpServer()).get('/me/wallet')

    expect(response.statusCode).toBe(401)
  })

  test('[GET] /economy is public', async () => {
    const response = await request(app.getHttpServer()).get('/economy')

    expect(response.statusCode).toBe(200)
    expect(response.body.chests[0]).toMatchObject({
      tier: 'E',
      price: 300,
      fragments: 1,
    })
    expect(response.body.fragments).toEqual({
      cap: 500,
      buyPrice: 200,
      sellPrice: 40,
    })
  })
})
