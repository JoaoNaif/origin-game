import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createAccount, UNKNOWN_ID } from 'test/e2e/accounts'
import { createSquad, membersOf } from 'test/e2e/squads'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Delete Squad (e2e)', () => {
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

  test('[DELETE] /squads/:id', async () => {
    const { agent, characters } = await createAccount(app, 'apagar_01')
    const squad = await createSquad(agent, membersOf(characters))

    const response = await agent.delete(`/squads/${squad.id}`)

    expect(response.statusCode).toBe(204)
    expect(
      await prisma.squad.findUnique({ where: { id: squad.id } })
    ).toBeNull()
    // os personagens continuam na conta
    expect(
      await prisma.character.count({
        where: { id: { in: squad.members.map((m) => m.characterId) } },
      })
    ).toBe(4)
  })

  test('[DELETE] /squads/:id of another account fails', async () => {
    const { agent, characters } = await createAccount(app, 'apagar_02')
    const squad = await createSquad(agent, membersOf(characters))
    const { agent: other } = await createAccount(app, 'apagar_03')

    const response = await other.delete(`/squads/${squad.id}`)

    expect(response.statusCode).toBe(403)
    expect(
      await prisma.squad.findUnique({ where: { id: squad.id } })
    ).not.toBeNull()
  })

  test('[DELETE] /squads/:id of an unknown squad fails', async () => {
    const { agent } = await createAccount(app, 'apagar_04')

    const response = await agent.delete(`/squads/${UNKNOWN_ID}`)

    expect(response.statusCode).toBe(404)
  })
})
