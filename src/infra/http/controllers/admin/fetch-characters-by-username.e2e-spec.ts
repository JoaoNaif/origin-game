import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { signUpAdmin } from 'test/e2e/admin'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Characters By Username (e2e)', () => {
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

  test('[GET] /admin/accounts/:username/characters', async () => {
    await signUp(app, 'jogador_personagens')
    const agent = await signUpAdmin(app, prisma, 'admin_personagens')

    const response = await agent.get(
      '/admin/accounts/jogador_personagens/characters'
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.characters).toHaveLength(12)
    expect(response.body.characters[0]).toMatchObject({
      templateKey: expect.any(String),
      stats: expect.any(Object),
    })
  })

  test('[GET] /admin/accounts/:username/characters of an unknown account', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_personagens_2')

    const response = await agent.get('/admin/accounts/ninguem/characters')

    expect(response.statusCode).toBe(404)
  })

  test('[GET] /admin/accounts/:username/characters is only for admins', async () => {
    const player = await signUp(app, 'jogador_pers_2')

    const response = await player.get(
      '/admin/accounts/jogador_pers_2/characters'
    )

    expect(response.statusCode).toBe(403)
  })
})
