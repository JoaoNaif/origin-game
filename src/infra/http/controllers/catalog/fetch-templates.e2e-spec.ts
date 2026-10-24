import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Templates (e2e)', () => {
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

  test('[GET] /templates', async () => {
    const response = await request(app.getHttpServer()).get('/templates')

    expect(response.statusCode).toBe(200)
    expect(response.body.templates).toHaveLength(12)

    const kael = response.body.templates.find(
      (t: { key: string }) => t.key === 'kael-vaz'
    )
    expect(kael).toMatchObject({
      name: 'Kael Vaz',
      characterClass: 'VANGUARD',
      variants: [
        expect.objectContaining({ isPrimary: true }),
        expect.objectContaining({ isPrimary: false }),
      ],
      stats: expect.objectContaining({ HP: expect.any(Number) }),
      passive: expect.objectContaining({ name: expect.any(String) }),
    })
  })

  test('[GET] /templates lists the kit first, in role order', async () => {
    const response = await request(app.getHttpServer()).get('/templates')

    for (const template of response.body.templates) {
      expect(
        template.skills.slice(0, 4).map((s: { kitSlot: string }) => s.kitSlot)
      ).toEqual(['BASIC', 'STANDARD', 'ROLE', 'SIGNATURE'])
    }
  })

  test('[GET] /templates shows the family trait', async () => {
    const response = await request(app.getHttpServer()).get('/templates')

    const ecko = response.body.templates.find(
      (t: { key: string }) => t.key === 'ecko-nocthar'
    )
    const tank = response.body.templates.find(
      (t: { key: string }) => t.key === 'tank-valen'
    )
    expect(ecko.familyTrait).toMatchObject({ key: expect.any(String) })
    expect(tank.familyTrait).toBeNull()
    expect(tank.variants).toEqual([])
  })
})
