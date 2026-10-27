import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { adminCatalog, signUpAdmin } from 'test/e2e/admin'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Create Catalog Entry (e2e)', () => {
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

  test('[POST] /admin/variants', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_cria')
    const before = await adminCatalog(agent)

    const response = await agent.post('/admin/variants').send({
      key: 'vento',
      name: 'Vento',
      lineage: 'ELEMENTAL',
      description: 'Ar em movimento.',
    })

    expect(response.statusCode).toBe(201)
    expect(response.body.entry).toEqual({
      key: 'vento',
      name: 'Vento',
      lineage: 'ELEMENTAL',
      description: 'Ar em movimento.',
      awakensFromKey: null,
    })
    // o conteúdo mudou: versão nova e o item já aparece (a memória do catálogo foi limpa)
    expect(response.body.version).not.toBe(before.version)
    const after = await adminCatalog(agent)
    expect(after.variants.map((v) => v.key)).toContain('vento')
  })

  test('[POST] /admin/npc-squads shows up for the players', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_cria_npc')
    const [base] = (await adminCatalog(agent)).npcSquads

    const response = await agent
      .post('/admin/npc-squads')
      .send({ ...base, key: 'npc-novo', name: 'Rival Novo' })

    expect(response.statusCode).toBe(201)
    const listed = await request(app.getHttpServer()).get('/npc-squads')
    expect(listed.body.npcSquads.map((s: { key: string }) => s.key)).toContain(
      'npc-novo'
    )
  })

  test('[POST] /admin/variants with a key already in use', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_cria_2')

    const response = await agent
      .post('/admin/variants')
      .send({ key: 'sombra', name: 'Sombra', lineage: 'MATERIAL' })

    expect(response.statusCode).toBe(409)
  })

  test('[POST] /admin/traits linking an unknown variant', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_cria_3')

    const response = await agent.post('/admin/traits').send({
      key: 'familia-nova',
      name: 'Família nova',
      category: 'ORIGIN',
      source: 'TEMPLATE',
      variantKey: 'nao-existe',
      effects: [{ type: 'LINEAGE_COST_MODIFIER', percent: -10 }],
    })

    expect(response.statusCode).toBe(404)
  })

  test('[POST] /admin/templates without the basic kit', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_cria_4')
    const [template] = (await adminCatalog(agent)).templates

    const response = await agent
      .post('/admin/templates')
      .send({ ...template, key: 'sem-kit' })

    // o catálogo inteiro deixaria de valer: nada é gravado
    expect(response.statusCode).toBe(400)
    expect(response.body.message).toContain('sem-kit')
    expect((await adminCatalog(agent)).templates).toHaveLength(12)
  })

  test('[POST] /admin/:collection with an invalid body or collection', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_cria_5')

    const badEffect = await agent.post('/admin/traits').send({
      key: 'efeito-ruim',
      name: 'Efeito ruim',
      category: 'COMBAT',
      source: 'CONQUERED',
      effects: [{ type: 'NAO_EXISTE' }],
    })
    const badKey = await agent
      .post('/admin/variants')
      .send({ key: 'Com Espaço', name: 'X', lineage: 'ELEMENTAL' })
    const badCollection = await agent.post('/admin/coisas').send({})

    expect(badEffect.statusCode).toBe(400)
    expect(badKey.statusCode).toBe(400)
    expect(badCollection.statusCode).toBe(400)
  })

  test('[POST] /admin/variants is only for admins', async () => {
    const player = await signUp(app, 'jogador_cria')

    const response = await player
      .post('/admin/variants')
      .send({ key: 'vento-2', name: 'Vento', lineage: 'ELEMENTAL' })

    expect(response.statusCode).toBe(403)
  })
})
