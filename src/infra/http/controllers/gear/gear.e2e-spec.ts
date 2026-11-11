import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp, UNKNOWN_ID } from 'test/e2e/accounts'
import { signUpAdmin } from 'test/e2e/admin'
import { giveWallet } from 'test/e2e/economy'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Living Gear (e2e)', () => {
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

  test('[GET] /gear-rules', async () => {
    const response = await signUp(app, 'gear_rules').then((a) =>
      a.get('/gear-rules')
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.gearRules.grades).toHaveLength(5)
    expect(response.body.gearRules.grades[3]).toMatchObject({
      grade: 'KING',
      statPercents: { primary: 12, secondary: 8 },
      requirements: 4,
      rarity: 'SS',
      saleValue: 9000,
    })
    expect(response.body.gear.length).toBeGreaterThan(0)
  })

  test('[POST] /admin/accounts/:username/gear, [GET] /me/gear, equip, unequip and sell', async () => {
    const admin = await signUpAdmin(app, prisma, 'gear_admin')
    const player = await signUp(app, 'gear_01')

    const granted = await admin
      .post('/admin/accounts/gear_01/gear')
      .send({ gearKey: 'couraca-de-pedra' })
    expect(granted.statusCode).toBe(201)
    const gearId = granted.body.gear.id

    const inventory = await player.get('/me/gear')
    expect(inventory.statusCode).toBe(200)
    expect(inventory.body.inventory).toEqual({
      used: 1,
      slots: 30,
      nextExpansionPrice: 300,
    })
    expect(inventory.body.gear[0]).toMatchObject({
      id: gearId,
      key: 'couraca-de-pedra',
      grade: 'SQUIRE',
      characterId: null,
      bond: null,
    })

    const bonds = await player.get(`/gear/${gearId}/bonds`)
    expect(bonds.statusCode).toBe(200)
    expect(bonds.body.bonds).toHaveLength(12)

    const characterId = bonds.body.bonds[0].characterId
    const equipped = await player
      .post(`/gear/${gearId}/equip`)
      .send({ characterId })
    expect(equipped.statusCode).toBe(200)
    expect(equipped.body.gear.characterId).toBe(characterId)
    expect(equipped.body.gear.bond.bond).toMatch(/FULL|PARTIAL|NONE/)

    const sheet = await player.get(`/characters/${characterId}`)
    expect(sheet.body.character.gear).toMatchObject({
      id: gearId,
      stats: expect.any(Object),
    })

    // equipado não se vende
    const refused = await player.post(`/gear/${gearId}/sell`)
    expect(refused.statusCode).toBe(400)

    const unequipped = await player.post(`/gear/${gearId}/unequip`)
    expect(unequipped.body.gear.characterId).toBeNull()

    const sold = await player.post(`/gear/${gearId}/sell`)
    expect(sold.statusCode).toBe(200)
    expect(sold.body).toMatchObject({ coins: 40, wallet: { coins: 40 } })
    expect((await player.get('/me/gear')).body.gear).toHaveLength(0)
  })

  test('[POST] /gear/:id/equip of another account or unknown', async () => {
    const admin = await signUpAdmin(app, prisma, 'gear_admin_2')
    const owner = await signUp(app, 'gear_owner')
    const other = await signUp(app, 'gear_other')
    const granted = await admin
      .post('/admin/accounts/gear_owner/gear')
      .send({ gearKey: 'lamina-de-brasa' })
    const otherCharacter = (await other.get('/me/characters')).body
      .characters[0].id

    const foreign = await other
      .post(`/gear/${granted.body.gear.id}/equip`)
      .send({ characterId: otherCharacter })
    const unknown = await owner
      .post(`/gear/${UNKNOWN_ID}/equip`)
      .send({ characterId: otherCharacter })

    expect(foreign.statusCode).toBe(403)
    expect(unknown.statusCode).toBe(404)
  })

  test('[POST] /me/inventory/expand', async () => {
    const agent = await signUp(app, 'gear_slots')
    await giveWallet(prisma, 'gear_slots', 1000)

    const bought = await agent.post('/me/inventory/expand')

    expect(bought.statusCode).toBe(200)
    expect(bought.body).toMatchObject({
      price: 300,
      inventory: { slots: 35, nextExpansionPrice: 600 },
      wallet: { coins: 700 },
    })
  })
})
