import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
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

  test('[PUT] /characters/:id/build', async () => {
    const [first] = await createAccount(app, 'build_01')
    const reversed = buildKeys(first).reverse()

    const response = await request(app.getHttpServer())
      .put(`/characters/${first.id}/build`)
      .send({ skillKeys: reversed })

    expect(response.statusCode).toBe(200)

    const saved = await prisma.characterSkill.findMany({
      where: { characterId: first.id, buildSlot: { not: null } },
      include: { skill: true },
      orderBy: { buildSlot: 'asc' },
    })
    expect(saved.map((s) => s.skill.key)).toEqual(reversed)
  })

  test('[PUT] /characters/:id/build with 3 skills fails', async () => {
    const [first] = await createAccount(app, 'build_02')

    const response = await request(app.getHttpServer())
      .put(`/characters/${first.id}/build`)
      .send({ skillKeys: buildKeys(first).slice(0, 3) })

    expect(response.statusCode).toBe(400)
  })

  test('[PUT] /characters/:id/build with a skill not learned fails', async () => {
    const [first] = await createAccount(app, 'build_03')
    const keys = buildKeys(first)
    keys[0] = 'kael-vaz:nao-aprendida'

    const response = await request(app.getHttpServer())
      .put(`/characters/${first.id}/build`)
      .send({ skillKeys: keys })

    expect(response.statusCode).toBe(400)

    // a build anterior continua
    const saved = await prisma.characterSkill.count({
      where: { characterId: first.id, buildSlot: { not: null } },
    })
    expect(saved).toBe(4)
  })

  test('[PUT] /characters/:id/build of an unknown character fails', async () => {
    const response = await request(app.getHttpServer())
      .put(`/characters/${UNKNOWN_ID}/build`)
      .send({ skillKeys: ['a', 'b', 'c', 'd'] })

    expect(response.statusCode).toBe(404)
  })
})
