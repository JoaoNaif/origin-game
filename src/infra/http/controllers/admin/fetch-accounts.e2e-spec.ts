import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { signUpAdmin } from 'test/e2e/admin'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Accounts (e2e)', () => {
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

  test('[GET] /admin/accounts', async () => {
    await signUp(app, 'jogador_lista')
    const agent = await signUpAdmin(app, prisma, 'admin_lista')

    const response = await agent.get('/admin/accounts')

    expect(response.statusCode).toBe(200)
    expect(response.body.accounts).toEqual([
      expect.objectContaining({
        username: 'admin_lista',
        role: 'ADMIN',
        characters: 12,
        battles: 0,
      }),
      expect.objectContaining({
        username: 'jogador_lista',
        role: 'PLAYER',
        characters: 12,
      }),
    ])
    expect(response.body.accounts[0]).not.toHaveProperty('passwordHash')
  })

  test('[GET] /admin/accounts is only for admins', async () => {
    const player = await signUp(app, 'jogador_lista_2')

    expect((await player.get('/admin/accounts')).statusCode).toBe(403)
  })
})
