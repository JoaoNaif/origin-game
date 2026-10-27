import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp } from 'test/e2e/accounts'
import { signUpAdmin } from 'test/e2e/admin'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Admin Options (e2e)', () => {
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

  test('[GET] /admin/options', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_opcoes')

    const response = await agent.get('/admin/options')

    expect(response.statusCode).toBe(200)
    const { options } = response.body
    expect(options.characterClasses).toHaveLength(8)
    expect(options.lineages).toContain('NONE')
    expect(options.effectTypes.skill).toContain('DAMAGE')
    expect(options.effectTypes.passiveTrigger).toContain('ON_DEFEATED')
    expect(options.rules.npcLevelRange.BEGINNER).toEqual({ min: 10, max: 25 })
  })

  test('[GET] /admin/options is only for admins', async () => {
    const player = await signUp(app, 'jogador_opcoes')

    expect((await player.get('/admin/options')).statusCode).toBe(403)
  })
})
