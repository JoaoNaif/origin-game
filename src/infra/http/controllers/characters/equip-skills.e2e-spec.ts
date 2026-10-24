import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { buildKeys, createAccount, UNKNOWN_ID } from 'test/e2e/accounts'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'

describe('Equip Skills (e2e)', () => {
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

  const savedBuild = async (characterId: string) =>
    (
      await prisma.characterSkill.findMany({
        where: { characterId, buildSlot: { not: null } },
        include: { skill: true },
        orderBy: { buildSlot: 'asc' },
      })
    ).map((s) => s.skill.key)

  test('[PUT] /characters/:id/build', async () => {
    const { agent, characters } = await createAccount(app, 'build_01')
    const reversed = buildKeys(characters[0]).reverse()

    const response = await agent
      .put(`/characters/${characters[0].id}/build`)
      .send({ skillKeys: reversed })

    expect(response.statusCode).toBe(200)
    expect(await savedBuild(characters[0].id)).toEqual(reversed)
  })

  test('[PUT] /characters/:id/build with 3 skills fails', async () => {
    const { agent, characters } = await createAccount(app, 'build_02')

    const response = await agent
      .put(`/characters/${characters[0].id}/build`)
      .send({ skillKeys: buildKeys(characters[0]).slice(0, 3) })

    expect(response.statusCode).toBe(400)
  })

  test('[PUT] /characters/:id/build with a skill not learned keeps the build', async () => {
    const { agent, characters } = await createAccount(app, 'build_03')
    const before = buildKeys(characters[0])
    const keys = [...before]
    keys[0] = 'kael-vaz:nao-aprendida'

    const response = await agent
      .put(`/characters/${characters[0].id}/build`)
      .send({ skillKeys: keys })

    expect(response.statusCode).toBe(400)
    expect(await savedBuild(characters[0].id)).toEqual(before)
  })

  test('[PUT] /characters/:id/build of another account fails', async () => {
    const { characters } = await createAccount(app, 'build_04')
    const { agent: other } = await createAccount(app, 'build_05')

    const response = await other
      .put(`/characters/${characters[0].id}/build`)
      .send({ skillKeys: buildKeys(characters[0]).reverse() })

    expect(response.statusCode).toBe(403)
    expect(await savedBuild(characters[0].id)).toEqual(buildKeys(characters[0]))
  })

  test('[PUT] /characters/:id/build of an unknown character fails', async () => {
    const { agent } = await createAccount(app, 'build_06')

    const response = await agent
      .put(`/characters/${UNKNOWN_ID}/build`)
      .send({ skillKeys: ['a', 'b', 'c', 'd'] })

    expect(response.statusCode).toBe(404)
  })
})
