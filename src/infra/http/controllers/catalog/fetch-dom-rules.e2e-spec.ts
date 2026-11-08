import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Dom Rules (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    configureApp(app)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  test('[GET] /dom-rules', async () => {
    const response = await request(app.getHttpServer()).get('/dom-rules')

    expect(response.statusCode).toBe(200)
    const rules = response.body.domRules
    expect(rules.pillars.map((p: { pillar: string }) => p.pillar)).toEqual([
      'MIND',
      'HEART',
      'BODY',
      'AURA',
    ])
    expect(rules.pillars[0].feats).toHaveLength(4)
    expect(rules.pillars[3].uniqueSkill.name).toBe('Rei')
    expect(rules.levels[0]).toEqual({
      level: 'BASIC',
      threshold: 8,
      thresholdWithoutVariant: 6,
      primaryPercent: 3,
      secondaryPercent: 2,
    })
    expect(rules.window).toBe(150)
    expect(rules.pveWeights.BEGINNER).toBe(0.15)
  })
})
