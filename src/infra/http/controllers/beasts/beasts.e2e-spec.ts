import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { signUpAdmin } from 'test/e2e/admin'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Beast Contracts (e2e)', () => {
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

  test('[GET] /beast-rules', async () => {
    const response = await signUp(app, 'beast_rules').then((a) =>
      a.get('/beast-rules')
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.beastRules.fieldCap).toBe(2)
    expect(response.body.beasts.map((b: { key: string }) => b.key)).toEqual([
      'falcao-de-tempestade',
      'fenix',
      'lobo-de-cinzas',
      'serpente-espelho',
    ])
  })

  test('[POST] /admin/accounts/:username/beasts, contract, slot, sheet and release', async () => {
    const admin = await signUpAdmin(app, prisma, 'beast_admin')
    const player = await signUp(app, 'beast_01')

    const granted = await admin
      .post('/admin/accounts/beast_01/beasts')
      .send({ beastKey: 'lobo-de-cinzas' })
    expect(granted.statusCode).toBe(201)
    const beastId = granted.body.beast.id

    const listed = await player.get('/me/beasts')
    expect(listed.body.beasts[0]).toMatchObject({
      id: beastId,
      contract: 'DOMINANCE',
      characterId: null,
      slot: null,
    })
    // a besta ocupa espaço do inventário
    expect((await player.get('/me/gear')).body.inventory.used).toBe(1)

    const characterId = (await player.get('/me/characters')).body.characters[0]
      .id
    const contracted = await player
      .post(`/beasts/${beastId}/contract`)
      .send({ characterId, slot: 4 })
    expect(contracted.statusCode).toBe(200)
    expect(contracted.body.beast).toMatchObject({ characterId, slot: 4 })

    const moved = await player.put(`/beasts/${beastId}/slot`).send({ slot: 3 })
    expect(moved.body.beast.slot).toBe(3)

    const sheet = await player.get(`/characters/${characterId}`)
    expect(sheet.body.character.beasts).toEqual([
      expect.objectContaining({ id: beastId, slot: 3 }),
    ])

    // com contrato não se vende; desfazer perde a besta
    expect((await player.post(`/beasts/${beastId}/sell`)).statusCode).toBe(400)
    expect((await player.delete(`/beasts/${beastId}`)).statusCode).toBe(204)
    expect((await player.get('/me/beasts')).body.beasts).toHaveLength(0)
  })

  test('[GET] /beasts/:id/requirements of the Mestre contract', async () => {
    const admin = await signUpAdmin(app, prisma, 'beast_admin_2')
    const player = await signUp(app, 'beast_02')
    const granted = await admin
      .post('/admin/accounts/beast_02/beasts')
      .send({ beastKey: 'falcao-de-tempestade' })

    const response = await player.get(
      `/beasts/${granted.body.beast.id}/requirements`
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.requirements).toHaveLength(12)
    expect(response.body.requirements[0]).toMatchObject({
      meets: expect.any(Boolean),
      requirements: expect.any(Array),
    })
  })
})
