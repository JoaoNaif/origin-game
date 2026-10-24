import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { playerMove, startBattle } from 'test/e2e/battles'
import {
  playMachineTurns,
  playPlayerTurn,
  replayBattle,
} from '@/domain/combat/applications/services/pve-session'
import { Battle } from '@/domain/combat/entities/battle'
import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { configureApp } from '@/infra/setup-app'
import { PrismaBattlesRepository } from './prisma-battles-repository'

describe('Prisma Battles Repository (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let sut: PrismaBattlesRepository

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    configureApp(app)
    prisma = moduleRef.get(PrismaService)
    sut = new PrismaBattlesRepository(prisma)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  /** Uma "requisição": lê o log, joga a vez do jogador e as da máquina. */
  function playTurn(battle: Battle) {
    const engine = replayBattle(battle)
    if (engine.isLeft()) throw engine.value
    const move = playerMove(battle)
    if (playPlayerTurn(battle, engine.value, move).isLeft()) throw new Error()
    if (playMachineTurns(battle, engine.value).isLeft()) throw new Error()
  }

  test('save keeps only the first of two writes from the same read', async () => {
    const { battleId } = await startBattle(app, prisma, 'corrida_01')

    // duas leituras do mesmo log (duas abas, clique duplo)
    const first = (await sut.findById(battleId))!
    const second = (await sut.findById(battleId))!
    const known = first.actions.length
    playTurn(first)
    playTurn(second)

    expect(await sut.save(first, known)).toBe(true)
    expect(await sut.save(second, known)).toBe(false)

    const saved = await prisma.battleAction.count({ where: { battleId } })
    expect(saved).toBe(first.actions.length)
  })

  test('save after reading again works', async () => {
    const { battleId } = await startBattle(app, prisma, 'corrida_02')
    const battle = (await sut.findById(battleId))!
    const known = battle.actions.length
    playTurn(battle)
    await sut.save(battle, known)

    const again = (await sut.findById(battleId))!
    const knownAgain = again.actions.length
    playTurn(again)

    expect(await sut.save(again, knownAgain)).toBe(true)
    expect(await prisma.battleAction.count({ where: { battleId } })).toBe(
      again.actions.length
    )
  })
})
