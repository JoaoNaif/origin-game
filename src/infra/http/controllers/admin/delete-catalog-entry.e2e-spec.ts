import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount, signUp } from 'test/e2e/accounts'
import { adminCatalog, signUpAdmin } from 'test/e2e/admin'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

const newTrait = (key: string) => ({
  key,
  name: 'Veterano',
  category: 'COMBAT',
  source: 'CONQUERED',
  effects: [{ type: 'STAT_MODIFIER', stat: 'WILL', percent: 3 }],
})

describe('Delete Catalog Entry (e2e)', () => {
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

  test('[DELETE] /admin/npc-squads/:key', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_apaga')
    const [squad] = (await adminCatalog(agent)).npcSquads

    const response = await agent.delete(`/admin/npc-squads/${squad.key}`)

    expect(response.statusCode).toBe(204)
    const listed = await request(app.getHttpServer()).get('/npc-squads')
    expect(
      listed.body.npcSquads.map((s: { key: string }) => s.key)
    ).not.toContain(squad.key)
  })

  test('[DELETE] /admin/templates/:key used by the catalog', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_apaga_2')

    const response = await agent.delete('/admin/templates/kael-vaz')

    expect(response.statusCode).toBe(409)
    expect(response.body.message).toContain('kael-vaz:')
  })

  test('[DELETE] /admin/traits/:key used by a player', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_apaga_3')
    await agent.post('/admin/traits').send(newTrait('veterano'))
    const { characters } = await createAccount(app, 'jogador_apaga')
    const trait = await prisma.trait.findUniqueOrThrow({
      where: { key: 'veterano' },
    })
    await prisma.characterTrait.create({
      data: { characterId: characters[0].id, traitId: trait.id },
    })

    const response = await agent.delete('/admin/traits/veterano')

    expect(response.statusCode).toBe(409)
    expect(response.body.message).toContain('jogadores')
  })

  test('[DELETE] /admin/traits/:key unused', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_apaga_4')
    await agent.post('/admin/traits').send(newTrait('novato'))

    const response = await agent.delete('/admin/traits/novato')

    expect(response.statusCode).toBe(204)
    const catalog = await adminCatalog(agent)
    expect(catalog.traits.map((t) => t.key)).not.toContain('novato')
  })

  test('[DELETE] /admin/fields/:key unknown', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_apaga_5')

    const response = await agent.delete('/admin/fields/nao-existe')

    expect(response.statusCode).toBe(404)
  })

  test('[DELETE] /admin/fields/:key is only for admins', async () => {
    const player = await signUp(app, 'jogador_apaga_2')

    expect((await player.delete('/admin/fields/arena')).statusCode).toBe(403)
  })
})
