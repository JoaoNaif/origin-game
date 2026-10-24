import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { aiDecisionRng, MachineAi } from '@/domain/ai/machine-ai'
import { replayBattle } from '@/domain/combat/applications/services/pve-session'
import { Battle } from '@/domain/combat/entities/battle'
import { BattleSide } from '@/domain/combat/enums/battle-enums'
import { BattleActionPayload } from '@/domain/combat/value-objects/battle-action'
import { createAccount, setLevel } from './accounts'
import { CORE_SQUAD, coreMembers, createSquad } from './squads'

/**
 * Conta com os personagens no nível 18 (faixa do Iniciante), o squad CORE salvo e uma pré-batalha contra o
 * Iniciante equilibrado.
 */
export async function prepareBattle(
  app: INestApplication,
  prisma: PrismaClient,
  username: string
) {
  const characters = await createAccount(app, username)
  await setLevel(prisma, characters, 18)
  const squad = await createSquad(app, username, coreMembers(characters))

  const draft = await request(app.getHttpServer())
    .post(`/accounts/${username}/battle-drafts`)
    .send({ npcSquadKey: 'balanced-beginner' })

  return {
    characters,
    squadId: squad.id,
    draft: draft.body.draft as {
      id: string
      field: { key: string; requiredTraitKeys: string[] } | null
    },
    squadCharacterIds: CORE_SQUAD.map(
      ({ key }) => characters.find((c) => c.templateKey === key)!.id
    ),
  }
}

/** `prepareBattle` + `POST /battles`: devolve a resposta do início. */
export async function startBattle(
  app: INestApplication,
  prisma: PrismaClient,
  username: string
) {
  const prepared = await prepareBattle(app, prisma, username)
  const response = await request(app.getHttpServer())
    .post('/battles')
    .send({ draftId: prepared.draft.id, squadId: prepared.squadId })

  return {
    ...prepared,
    battleId: response.body.battle.id as string,
    started: response.body,
  }
}

/** Jogada válida para o lado do jogador: a IA iniciante decide em cima da batalha gravada. */
export function playerMove(battle: Battle): BattleActionPayload {
  const engine = replayBattle(battle)
  if (engine.isLeft()) throw engine.value
  const turn = engine.value.nextTurn()!

  return new MachineAi(
    {
      side: BattleSide.PLAYER,
      profile: 'BALANCED',
      difficulty: 'BEGINNER',
      planning: false,
    },
    aiDecisionRng(battle.seed, BattleSide.PLAYER, battle.actions.length)
  ).decide(engine.value, turn.ref).payload
}
