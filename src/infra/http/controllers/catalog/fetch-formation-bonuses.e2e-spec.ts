import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  ARTILLERY_BACK_DAMAGE_PERCENT,
  EXECUTOR_LONE_ATTACK_PERCENT,
  FORMATION_STAT_AURA,
  SUPPORT_HEAL_AURA_PERCENT,
} from '@/domain/combat/engine/battle-engine'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Formation Bonuses (e2e)', () => {
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

  test('[GET] /formation-bonuses', async () => {
    const response = await request(app.getHttpServer()).get(
      '/formation-bonuses'
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.formationBonuses).toMatchObject({
      supportHealPercent: SUPPORT_HEAL_AURA_PERCENT,
      artilleryBackDamagePercent: ARTILLERY_BACK_DAMAGE_PERCENT,
      executorLoneAttackPercent: EXECUTOR_LONE_ATTACK_PERCENT,
    })
    expect(response.body.formationBonuses.statAuras).toHaveLength(
      Object.keys(FORMATION_STAT_AURA).length
    )
    expect(response.body.formationBonuses.statAuras).toContainEqual({
      characterClass: 'GUARDIAN',
      stat: FORMATION_STAT_AURA.GUARDIAN?.stat,
      percent: FORMATION_STAT_AURA.GUARDIAN?.percent,
    })
  })
})
