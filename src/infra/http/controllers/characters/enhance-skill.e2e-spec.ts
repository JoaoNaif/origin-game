import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount } from 'test/e2e/accounts'
import { giveWallet } from 'test/e2e/economy'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

/** Básica do Kael (Explosão, Vetorial): 300 M + 3 fragmentos Vetoriais por tentativa. */
const SKILL = 'kael-vaz:soco-explosivo'

describe('Enhance Skill (e2e)', () => {
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

  test('[POST] /characters/:id/enhance until it works', async () => {
    const { agent, characters } = await createAccount(app, 'aprimora_01')
    const kael = characters.find((c) => c.templateKey === 'kael-vaz')!
    await giveWallet(prisma, 'aprimora_01', 30_000, { VECTORIAL: 300 })

    let attempts = 0
    let last = await agent
      .post(`/characters/${kael.id}/enhance`)
      .send({ skillKey: SKILL })
    attempts++
    while (last.body.success === false && attempts < 60) {
      last = await agent
        .post(`/characters/${kael.id}/enhance`)
        .send({ skillKey: SKILL })
      attempts++
    }

    expect(last.statusCode).toBe(200)
    expect(last.body).toMatchObject({ success: true, chance: 0.25 })
    expect(last.body.character.skills).toContainEqual(
      expect.objectContaining({ key: SKILL, isEnhanced: true })
    )
    expect(last.body.wallet).toMatchObject({
      coins: 30_000 - attempts * 300,
      fragments: expect.objectContaining({ VECTORIAL: 300 - attempts * 3 }),
    })

    // um aprimoramento só por skill
    const again = await agent
      .post(`/characters/${kael.id}/enhance`)
      .send({ skillKey: SKILL })
    expect(again.statusCode).toBe(400)
  })

  test('[POST] /characters/:id/enhance without the cost', async () => {
    const { agent, characters } = await createAccount(app, 'aprimora_02')
    const kael = characters.find((c) => c.templateKey === 'kael-vaz')!

    const response = await agent
      .post(`/characters/${kael.id}/enhance`)
      .send({ skillKey: SKILL })

    expect(response.statusCode).toBe(400)
  })

  test('[POST] /characters/:id/enhance of another account', async () => {
    const { characters } = await createAccount(app, 'aprimora_03')
    const { agent: other } = await createAccount(app, 'aprimora_04')
    const kael = characters.find((c) => c.templateKey === 'kael-vaz')!

    const response = await other
      .post(`/characters/${kael.id}/enhance`)
      .send({ skillKey: SKILL })

    expect(response.statusCode).toBe(403)
  })
})
