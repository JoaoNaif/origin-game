import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { AppModule } from '@/infra/app.module'
import { configureApp } from '@/infra/setup-app'

describe('Fetch Traits (e2e)', () => {
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

  test('[GET] /traits', async () => {
    const response = await request(app.getHttpServer()).get('/traits')

    expect(response.statusCode).toBe(200)
    expect(response.body.traits).toHaveLength(9)
    for (const trait of response.body.traits) {
      expect(trait).toMatchObject({
        key: expect.any(String),
        name: expect.any(String),
        category: expect.any(String),
        source: expect.stringMatching(/TEMPLATE|CONQUERED/),
        effects: expect.any(Array),
      })
    }
  })

  test('[GET] /traits includes the family traits of the templates', async () => {
    const [traits, templates] = await Promise.all([
      request(app.getHttpServer()).get('/traits'),
      request(app.getHttpServer()).get('/templates'),
    ])
    const keys = new Set(traits.body.traits.map((t: { key: string }) => t.key))

    for (const template of templates.body.templates) {
      if (template.familyTrait)
        expect(keys.has(template.familyTrait.key)).toBe(true)
    }
  })
})
