import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { signUp, UNKNOWN_ID } from 'test/e2e/accounts'
import { startBattle } from 'test/e2e/battles'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

interface OptionBody {
  payload: { type: string }
  preview: { hits: { ref: string; hitChance: number }[] } | null
}

describe('Get Turn Options (e2e)', () => {
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

  test('[GET] /battles/:id/options', async () => {
    const { agent, battleId, started } = await startBattle(
      app,
      prisma,
      'opcoes_01'
    )

    const response = await agent.get(`/battles/${battleId}/options`)

    expect(response.statusCode).toBe(200)
    expect(response.body.turn).toMatchObject({
      ref: started.battle.turn.ref,
      side: 'PLAYER',
    })

    const options: OptionBody[] = response.body.options
    const skills = options.filter((o) => o.payload.type === 'SKILL')
    expect(skills.length).toBeGreaterThan(0)
    expect(skills.every((o) => o.preview && o.preview.hits.length > 0)).toBe(
      true
    )
    expect(
      options
        .filter((o) => o.payload.type !== 'SKILL')
        .every((o) => o.preview === null)
    ).toBe(true)
  })

  test('[GET] /battles/:id/options gives payloads the server accepts', async () => {
    const { agent, battleId } = await startBattle(app, prisma, 'opcoes_02')
    const response = await agent.get(`/battles/${battleId}/options`)
    const [first] = response.body.options as OptionBody[]

    const played = await agent
      .post(`/battles/${battleId}/actions`)
      .send(first.payload)

    expect(played.statusCode).toBe(200)
  })

  test('[GET] /battles/:id/options of another account fails', async () => {
    const { battleId } = await startBattle(app, prisma, 'opcoes_03')
    const other = await signUp(app, 'opcoes_04')

    const response = await other.get(`/battles/${battleId}/options`)

    expect(response.statusCode).toBe(403)
  })

  test('[GET] /battles/:id/options of an unknown battle fails', async () => {
    const agent = await signUp(app, 'opcoes_05')

    const response = await agent.get(`/battles/${UNKNOWN_ID}/options`)

    expect(response.statusCode).toBe(404)
  })
})
