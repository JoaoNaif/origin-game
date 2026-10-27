import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount, signUp } from 'test/e2e/accounts'
import { signUpAdmin } from 'test/e2e/admin'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Grant Character (e2e)', () => {
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

  test('[POST] /admin/accounts/:username/characters', async () => {
    const { agent: player, characters } = await createAccount(
      app,
      'jogador_recebe'
    )
    // a conta fica sem o Kael (como se o modelo tivesse entrado depois do cadastro)
    const kael = characters.find((c) => c.templateKey === 'kael-vaz')!
    await prisma.character.delete({ where: { id: kael.id } })
    const agent = await signUpAdmin(app, prisma, 'admin_da')

    const response = await agent
      .post('/admin/accounts/jogador_recebe/characters')
      .send({ templateKey: 'kael-vaz' })

    expect(response.statusCode).toBe(201)
    expect(response.body.character).toMatchObject({
      templateKey: 'kael-vaz',
      level: 0,
    })
    const owned = await player.get('/me/characters')
    expect(owned.body.characters).toHaveLength(12)
  })

  test('[POST] /admin/accounts/:username/characters of a template already owned', async () => {
    await signUp(app, 'jogador_recebe_2')
    const agent = await signUpAdmin(app, prisma, 'admin_da_2')

    const response = await agent
      .post('/admin/accounts/jogador_recebe_2/characters')
      .send({ templateKey: 'kael-vaz' })

    expect(response.statusCode).toBe(409)
  })

  test('[POST] /admin/accounts/:username/characters with unknown account or template', async () => {
    await signUp(app, 'jogador_recebe_3')
    const agent = await signUpAdmin(app, prisma, 'admin_da_3')

    const noAccount = await agent
      .post('/admin/accounts/ninguem/characters')
      .send({ templateKey: 'kael-vaz' })
    const noTemplate = await agent
      .post('/admin/accounts/jogador_recebe_3/characters')
      .send({ templateKey: 'nao-existe' })

    expect(noAccount.statusCode).toBe(404)
    expect(noTemplate.statusCode).toBe(404)
  })

  test('[POST] /admin/accounts/:username/characters is only for admins', async () => {
    const player = await signUp(app, 'jogador_recebe_4')

    const response = await player
      .post('/admin/accounts/jogador_recebe_4/characters')
      .send({ templateKey: 'kael-vaz' })

    expect(response.statusCode).toBe(403)
  })
})
