import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount } from 'test/e2e/accounts'
import { openSkillOffer } from 'test/e2e/skill-offers'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Pending Skill Offers (e2e)', () => {
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

  test('[GET] /me/skill-offers', async () => {
    const { agent, characters } = await createAccount(app, 'ofertas_01')
    const gaia = characters.find((c) => c.templateKey === 'gaia')!
    const offer = await openSkillOffer(prisma, gaia.id, 5, ['gaia:desafio'])

    const response = await agent.get('/me/skill-offers')

    expect(response.statusCode).toBe(200)
    expect(response.body.offers).toEqual([
      {
        id: offer.id,
        characterId: gaia.id,
        level: 5,
        skills: [
          expect.objectContaining({
            key: 'gaia:desafio',
            name: 'Desafio',
            minLevel: 0,
          }),
        ],
      },
    ])
  })

  test('[GET] /me/skill-offers never shows blocks of another account', async () => {
    const { characters } = await createAccount(app, 'ofertas_02')
    const gaia = characters.find((c) => c.templateKey === 'gaia')!
    await openSkillOffer(prisma, gaia.id, 5, ['gaia:desafio'])
    const other = await createAccount(app, 'ofertas_03')

    const response = await other.agent.get('/me/skill-offers')

    expect(response.body.offers).toEqual([])
  })

  test('[GET] /me/skill-offers without being logged in fails', async () => {
    const response = await request(app.getHttpServer()).get('/me/skill-offers')

    expect(response.statusCode).toBe(401)
  })
})
