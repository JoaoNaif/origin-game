import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { adminCatalog, signUpAdmin } from 'test/e2e/admin'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Admin Catalog (e2e)', () => {
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

  test('[GET] /admin/catalog', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_catalogo')

    const response = await agent.get('/admin/catalog')

    expect(response.statusCode).toBe(200)
    const catalog = response.body.catalog
    expect(catalog.version).toEqual(expect.any(String))
    expect(catalog.templates).toHaveLength(12)
    expect(catalog.traits).toHaveLength(9)
    expect(catalog.fields).toHaveLength(6)
    expect(catalog.npcSquads).toHaveLength(20)
    // o admin vê a formação e as skills dos NPCs (o jogador não)
    expect(catalog.npcSquads[0].members).toHaveLength(4)
    expect(catalog.npcSquads[0].members[0].skillKeys).toHaveLength(4)
    expect(catalog.templates[0].skillKeys.length).toBeGreaterThanOrEqual(4)
    expect(catalog.skills[0].reference).toMatchObject({
      power: expect.any(Number),
    })
  })

  test('[GET] /admin/catalog keys link to items of the catalog', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_catalogo_2')
    const catalog = await adminCatalog(agent)
    const skills = new Set(catalog.skills.map((s) => s.key))

    for (const squad of catalog.npcSquads) {
      for (const member of squad.members) {
        expect(member.skillKeys.every((k) => skills.has(k))).toBe(true)
      }
    }
  })

  test('[GET] /admin/catalog is only for admins', async () => {
    const player = await signUp(app, 'jogador_catalogo')

    expect((await player.get('/admin/catalog')).statusCode).toBe(403)
    expect(
      (await request(app.getHttpServer()).get('/admin/catalog')).statusCode
    ).toBe(401)
  })
})
