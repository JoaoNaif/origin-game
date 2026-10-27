import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUpAdmin } from 'test/e2e/admin'
import { startBattle } from 'test/e2e/battles'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Battles By Username (e2e)', () => {
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

  test('[GET] /admin/accounts/:username/battles', async () => {
    const { battleId } = await startBattle(app, prisma, 'jogador_batalhas')
    const agent = await signUpAdmin(app, prisma, 'admin_batalhas')

    const response = await agent
      .get('/admin/accounts/jogador_batalhas/battles')
      .query({ status: 'IN_PROGRESS' })

    expect(response.statusCode).toBe(200)
    expect(response.body.battles).toEqual([
      expect.objectContaining({ id: battleId, status: 'IN_PROGRESS' }),
    ])
  })

  test('[GET] /admin/accounts/:username/battles of an unknown account', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_batalhas_2')

    const response = await agent.get('/admin/accounts/ninguem/battles')

    expect(response.statusCode).toBe(404)
  })
})
