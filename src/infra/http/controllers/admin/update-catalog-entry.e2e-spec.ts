import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { adminCatalog, signUpAdmin } from 'test/e2e/admin'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Update Catalog Entry (e2e)', () => {
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

  test('[PUT] /admin/templates/:key', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_edita')
    const kael = (await adminCatalog(agent)).templates.find(
      (t) => t.key === 'kael-vaz'
    )!

    // a tela devolve o mesmo objeto do GET (os campos só de leitura são ignorados)
    const response = await agent
      .put('/admin/templates/kael-vaz')
      .send({ ...kael, name: 'Kael Vaz, o Explosivo' })

    expect(response.statusCode).toBe(200)
    expect(response.body.entry).toMatchObject({
      key: 'kael-vaz',
      name: 'Kael Vaz, o Explosivo',
    })
    const templates = await request(app.getHttpServer()).get('/templates')
    expect(
      templates.body.templates.find(
        (t: { key: string }) => t.key === 'kael-vaz'
      ).name
    ).toBe('Kael Vaz, o Explosivo')
  })

  test('[PUT] /admin/skills/:key that would break an NPC build', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_edita_2')
    const catalog = await adminCatalog(agent)
    // uma skill fora do kit, na build de um NPC abaixo do nível 100
    const { skill } = catalog.npcSquads
      .flatMap((s) => s.members)
      .filter((m) => m.level < 100)
      .flatMap((m) => m.skillKeys)
      .map((key) => ({ skill: catalog.skills.find((s) => s.key === key)! }))
      .find(({ skill }) => skill.kitSlot === null)!

    const response = await agent
      .put(`/admin/skills/${skill.key}`)
      .send({ ...skill, minLevel: 100 })

    // a skill em si é válida, mas o NPC não pode mais usá-la: nada muda
    expect(response.statusCode).toBe(400)
    expect(response.body.message).toContain('squad de NPC')
    const after = (await adminCatalog(agent)).skills.find(
      (s) => s.key === skill.key
    )!
    expect(after.minLevel).toBe(skill.minLevel)
  })

  test('[PUT] /admin/fields/:key of an unknown field', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_edita_3')
    const [field] = (await adminCatalog(agent)).fields

    const response = await agent.put('/admin/fields/nao-existe').send(field)

    expect(response.statusCode).toBe(404)
  })

  test('[PUT] /admin/variants/:key is only for admins', async () => {
    const player = await signUp(app, 'jogador_edita')

    const response = await player
      .put('/admin/variants/sombra')
      .send({ name: 'Sombra', lineage: 'MATERIAL' })

    expect(response.statusCode).toBe(403)
  })
})
