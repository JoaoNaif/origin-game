import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount, setLevel, UNKNOWN_ID } from 'test/e2e/accounts'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

const points = (values: Record<string, number> = {}) => ({
  HP: 0,
  ATTACK: 0,
  DEFENSE: 0,
  SPEED: 0,
  PRECISION: 0,
  EVASION: 0,
  WILL: 0,
  ...values,
})

describe('Allocate Free Points (e2e)', () => {
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

  test('[PUT] /characters/:id/free-points', async () => {
    const { agent, characters } = await createAccount(app, 'pontos_01')
    // nível 20: 20 pontos livres
    await setLevel(prisma, [characters[0]], 20)

    const response = await agent
      .put(`/characters/${characters[0].id}/free-points`)
      .send(points({ DEFENSE: 10, WILL: 10 }))

    expect(response.statusCode).toBe(200)
    expect(response.body.character.freePoints).toMatchObject({
      allocated: { DEFENSE: 10, WILL: 10 },
      available: 20,
    })

    const saved = await prisma.character.findUnique({
      where: { id: characters[0].id },
    })
    expect(saved).toMatchObject({ freeDefense: 10, freeWill: 10 })
  })

  test('[PUT] /characters/:id/free-points above the level fails', async () => {
    const { agent, characters } = await createAccount(app, 'pontos_02')

    const response = await agent
      .put(`/characters/${characters[0].id}/free-points`)
      .send(points({ ATTACK: 5 }))

    expect(response.statusCode).toBe(400)
  })

  test('[PUT] /characters/:id/free-points without all the stats fails', async () => {
    const { agent, characters } = await createAccount(app, 'pontos_03')

    const response = await agent
      .put(`/characters/${characters[0].id}/free-points`)
      .send({ ATTACK: 0 })

    expect(response.statusCode).toBe(400)
  })

  test('[PUT] /characters/:id/free-points of another account fails', async () => {
    const { characters } = await createAccount(app, 'pontos_04')
    const { agent: other } = await createAccount(app, 'pontos_05')

    const response = await other
      .put(`/characters/${characters[0].id}/free-points`)
      .send(points())

    expect(response.statusCode).toBe(403)
  })

  test('[PUT] /characters/:id/free-points of an unknown character fails', async () => {
    const { agent } = await createAccount(app, 'pontos_06')

    const response = await agent
      .put(`/characters/${UNKNOWN_ID}/free-points`)
      .send(points())

    expect(response.statusCode).toBe(404)
  })
})
