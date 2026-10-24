import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { buildKeys, createAccount, UNKNOWN_ID } from 'test/e2e/accounts'
import { openSkillOffer } from 'test/e2e/skill-offers'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Choose Skill Offer (e2e)', () => {
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

  async function gaiaWithOffer(username: string) {
    const { agent, characters } = await createAccount(app, username)
    const gaia = characters.find((c) => c.templateKey === 'gaia')!
    const offer = await openSkillOffer(prisma, gaia.id, 5, ['gaia:desafio'])

    return { agent, gaia, offer }
  }

  test('[POST] /skill-offers/:id/choose', async () => {
    const { agent, gaia, offer } = await gaiaWithOffer('escolha_01')

    const response = await agent
      .post(`/skill-offers/${offer.id}/choose`)
      .send({ skillKey: 'gaia:desafio' })

    expect(response.statusCode).toBe(200)
    // aprendeu e ficou guardada, fora da build
    expect(response.body.character.skills).toContainEqual(
      expect.objectContaining({
        key: 'gaia:desafio',
        source: 'OFFER',
        buildSlot: null,
      })
    )
    expect((await agent.get('/me/skill-offers')).body.offers).toEqual([])

    // e já pode entrar na build
    const build = buildKeys(gaia)
    build[3] = 'gaia:desafio'
    const equipped = await agent
      .put(`/characters/${gaia.id}/build`)
      .send({ skillKeys: build })
    expect(equipped.statusCode).toBe(200)
  })

  test('[POST] /skill-offers/:id/choose twice fails', async () => {
    const { agent, offer } = await gaiaWithOffer('escolha_02')
    await agent
      .post(`/skill-offers/${offer.id}/choose`)
      .send({ skillKey: 'gaia:desafio' })

    const again = await agent
      .post(`/skill-offers/${offer.id}/choose`)
      .send({ skillKey: 'gaia:desafio' })

    expect(again.statusCode).toBe(400)
  })

  test('[POST] /skill-offers/:id/choose with a skill outside the block fails', async () => {
    const { agent, offer } = await gaiaWithOffer('escolha_03')

    const response = await agent
      .post(`/skill-offers/${offer.id}/choose`)
      .send({ skillKey: 'gaia:terremoto' })

    expect(response.statusCode).toBe(400)
    expect(
      (await prisma.skillOffer.findUnique({ where: { id: offer.id } }))
        ?.chosenSkillId
    ).toBeNull()
  })

  test('[POST] /skill-offers/:id/choose in a block of another account fails', async () => {
    const { offer } = await gaiaWithOffer('escolha_04')
    const other = await createAccount(app, 'escolha_05')

    const response = await other.agent
      .post(`/skill-offers/${offer.id}/choose`)
      .send({ skillKey: 'gaia:desafio' })

    expect(response.statusCode).toBe(403)
  })

  test('[POST] /skill-offers/:id/choose of an unknown block fails', async () => {
    const { agent } = await createAccount(app, 'escolha_06')

    const response = await agent
      .post(`/skill-offers/${UNKNOWN_ID}/choose`)
      .send({ skillKey: 'gaia:desafio' })

    expect(response.statusCode).toBe(404)
  })
})
