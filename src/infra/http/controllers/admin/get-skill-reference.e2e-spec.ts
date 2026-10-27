import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUpAdmin } from 'test/e2e/admin'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Get Skill Reference (e2e)', () => {
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

  test('[GET] /admin/skills/reference', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_referencia')

    const response = await agent.get('/admin/skills/reference').query({
      tier: 'STRONG',
      target: 'ENEMY',
      range: 'MELEE',
      area: 'SINGLE',
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.reference).toEqual({
      power: 1.6,
      cooldown: 3,
      desgastePercent: 5,
      minLevel: 40,
    })
  })

  test('[GET] /admin/skills/reference with a none skill in a line', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_referencia_2')

    const response = await agent.get('/admin/skills/reference').query({
      tier: 'STANDARD',
      target: 'ENEMY',
      range: 'MELEE',
      area: 'LINE',
      isNone: 'true',
    })

    expect(response.body.reference).toMatchObject({ power: 0.72, cooldown: 0 })
  })

  test('[GET] /admin/skills/reference without the tier', async () => {
    const agent = await signUpAdmin(app, prisma, 'admin_referencia_3')

    const response = await agent
      .get('/admin/skills/reference')
      .query({ target: 'ENEMY', area: 'SINGLE' })

    expect(response.statusCode).toBe(400)
  })
})
