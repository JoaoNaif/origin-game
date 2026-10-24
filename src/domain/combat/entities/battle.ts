import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Account } from '@/domain/accounts/entities/account'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { BUILD_SIZE } from '@/domain/characters/services/basic-kit'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import { SQUAD_SIZE } from '@/domain/squads/entities/squad'
import {
  isInsideGrid,
  positionKey,
} from '@/domain/squads/value-objects/grid-position'
import {
  BattleEndReason,
  BattleMode,
  BattleSide,
  BattleStatus,
  MAX_ROUNDS,
} from '../enums/battle-enums'
import { InvalidBattleError } from '../errors/invalid-battle-error'
import {
  BattleActionPayload,
  BattleActionRecord,
} from '../value-objects/battle-action'
import { BattleReward } from '../value-objects/battle-reward'
import { BattleSnapshot, SnapshotSide } from '../value-objects/battle-snapshot'

/** Maior seed aceita (cabe num inteiro de 32 bits com sinal do Postgres). */
export const MAX_SEED = 2_147_483_647

export interface BattleProps {
  accountId: UniqueEntityId
  mode: BattleMode
  status: BattleStatus
  /** Squad do jogador usado (referência; o que vale é o snapshot). */
  squadId: UniqueEntityId | null
  npcSquadId: UniqueEntityId | null
  aiProfile: AiProfile | null
  aiDifficulty: AiDifficulty | null
  /** Só no servidor, nunca enviada ao cliente (D33). */
  seed: number
  engineVersion: string
  contentVersion: string
  snapshot: BattleSnapshot
  actions: BattleActionRecord[]
  winner: BattleSide | null
  endReason: BattleEndReason | null
  rounds: number | null
  startedAt: Date
  finishedAt: Date | null
  /** O XP entregue no fim (vazio até lá, e na desistência). */
  rewards: BattleReward[]
}

export interface StartPveBattleInput {
  account: Account
  squadId?: UniqueEntityId | null
  npcSquad: NpcSquad
  seed: number
  engineVersion: string
  contentVersion: string
  snapshot: BattleSnapshot
  /** Data vinda de fora (o domínio não lê o relógio). */
  startedAt: Date
}

export interface FinishBattleInput {
  winner: BattleSide
  reason: BattleEndReason
  rounds: number
  finishedAt: Date
}

/**
 * Batalha (D8, D9, D33): guarda a seed, a foto dos dois lados no início e o log de decisões, não o estado.
 * O motor é determinístico, então seed + snapshot + ações reproduzem a batalha inteira (replay).
 */
export class Battle extends Entity<BattleProps> {
  get accountId() {
    return this.props.accountId
  }

  get mode() {
    return this.props.mode
  }

  get status() {
    return this.props.status
  }

  get squadId() {
    return this.props.squadId
  }

  get npcSquadId() {
    return this.props.npcSquadId
  }

  get aiProfile() {
    return this.props.aiProfile
  }

  get aiDifficulty() {
    return this.props.aiDifficulty
  }

  get seed() {
    return this.props.seed
  }

  get engineVersion() {
    return this.props.engineVersion
  }

  get contentVersion() {
    return this.props.contentVersion
  }

  get snapshot(): Readonly<BattleSnapshot> {
    return this.props.snapshot
  }

  get actions(): readonly BattleActionRecord[] {
    return this.props.actions
  }

  get winner() {
    return this.props.winner
  }

  get endReason() {
    return this.props.endReason
  }

  get rounds() {
    return this.props.rounds
  }

  get startedAt() {
    return this.props.startedAt
  }

  get finishedAt() {
    return this.props.finishedAt
  }

  get rewards(): readonly BattleReward[] {
    return this.props.rewards
  }

  get isFinished() {
    return this.props.status === BattleStatus.FINISHED
  }

  /** Começa uma batalha contra a máquina (o único modo do MVP, D75). */
  static startPve(
    input: StartPveBattleInput,
    id?: UniqueEntityId
  ): Either<InvalidBattleError, Battle> {
    if (
      !Number.isInteger(input.seed) ||
      input.seed < 0 ||
      input.seed > MAX_SEED
    ) {
      return left(new InvalidBattleError(`seed inteira de 0 a ${MAX_SEED}`))
    }

    if (!input.engineVersion || !input.contentVersion) {
      return left(
        new InvalidBattleError('versão do motor e do conteúdo são obrigatórias')
      )
    }

    const snapshotError = validateSnapshot(input.snapshot)
    if (snapshotError) return left(new InvalidBattleError(snapshotError))

    return right(
      new Battle(
        {
          accountId: input.account.id,
          mode: BattleMode.PVE,
          status: BattleStatus.IN_PROGRESS,
          squadId: input.squadId ?? null,
          npcSquadId: input.npcSquad.id,
          aiProfile: input.npcSquad.profile,
          aiDifficulty: input.npcSquad.difficulty,
          seed: input.seed,
          engineVersion: input.engineVersion,
          contentVersion: input.contentVersion,
          snapshot: input.snapshot,
          actions: [],
          winner: null,
          endReason: null,
          rounds: null,
          startedAt: input.startedAt,
          finishedAt: null,
          rewards: [],
        },
        id
      )
    )
  }

  /** Recompõe uma batalha já existente (ex.: vinda do banco), sem as regras de início. */
  static restore(props: BattleProps, id: UniqueEntityId): Battle {
    return new Battle(props, id)
  }

  /** Registra a próxima decisão no log (a sequência é atribuída aqui, em ordem). */
  recordAction(action: {
    round: number
    side: BattleSide
    actorRef: string
    payload: BattleActionPayload
  }): Either<InvalidBattleError, BattleActionRecord> {
    if (this.isFinished) {
      return left(new InvalidBattleError('a batalha já terminou'))
    }

    if (!isValidRound(action.round)) {
      return left(new InvalidBattleError(`rodada de 1 a ${MAX_ROUNDS}`))
    }

    const lastRound = this.props.actions.at(-1)?.round ?? 1
    if (action.round < lastRound) {
      return left(new InvalidBattleError('rodada não pode voltar'))
    }

    const side = this.sideOf(action.side)
    if (!side.units.some((u) => u.ref === action.actorRef)) {
      return left(
        new InvalidBattleError(`unidade ${action.actorRef} não está nesse lado`)
      )
    }

    const payloadError = this.validatePayload(action.side, action.payload)
    if (payloadError) return left(new InvalidBattleError(payloadError))

    const record: BattleActionRecord = {
      sequence: this.props.actions.length,
      round: action.round,
      side: action.side,
      actorRef: action.actorRef,
      payload: action.payload,
    }

    this.props.actions.push(record)

    return right(record)
  }

  /** Encerra a batalha com o vencedor (sempre há um: o empate é desfeito pelo Desgaste e pela seed, D72). */
  finish(input: FinishBattleInput): Either<InvalidBattleError, void> {
    if (this.isFinished) {
      return left(new InvalidBattleError('a batalha já terminou'))
    }

    if (!isValidRound(input.rounds)) {
      return left(new InvalidBattleError(`rodadas de 1 a ${MAX_ROUNDS}`))
    }

    if (
      input.reason === BattleEndReason.ROUND_LIMIT &&
      input.rounds !== MAX_ROUNDS
    ) {
      return left(
        new InvalidBattleError(`fim forçado só na rodada ${MAX_ROUNDS}`)
      )
    }

    if (input.finishedAt.getTime() < this.props.startedAt.getTime()) {
      return left(new InvalidBattleError('fim antes do início'))
    }

    this.props.status = BattleStatus.FINISHED
    this.props.winner = input.winner
    this.props.endReason = input.reason
    this.props.rounds = input.rounds
    this.props.finishedAt = input.finishedAt

    return right(undefined)
  }

  /**
   * Desistir (W.O.): a batalha acaba na rodada em que está, com vitória do adversário (`ABANDON`). Sem XP no PvE
   * (D136, a confirmar): desistir logo depois de começar não pode render nada.
   */
  forfeit(finishedAt: Date): Either<InvalidBattleError, void> {
    return this.finish({
      winner: BattleSide.OPPONENT,
      reason: BattleEndReason.ABANDON,
      rounds: this.props.actions.at(-1)?.round ?? 1,
      finishedAt,
    })
  }

  /** Guarda o XP entregue no fim (só numa batalha encerrada, uma vez). */
  recordRewards(rewards: BattleReward[]): Either<InvalidBattleError, void> {
    if (!this.isFinished) {
      return left(new InvalidBattleError('a batalha ainda não terminou'))
    }

    if (this.props.rewards.length > 0) {
      return left(new InvalidBattleError('as recompensas já foram entregues'))
    }

    this.props.rewards = [...rewards]

    return right(undefined)
  }

  private sideOf(side: BattleSide): SnapshotSide {
    return side === BattleSide.PLAYER
      ? this.props.snapshot.player
      : this.props.snapshot.opponent
  }

  private validatePayload(
    actorSide: BattleSide,
    payload: BattleActionPayload
  ): string | null {
    switch (payload.type) {
      case 'SKILL':
        return isInsideGrid(payload.target) ? null : 'alvo fora da grade'
      case 'MOVE':
        return isInsideGrid(payload.to) ? null : 'destino fora da grade'
      case 'SWAP':
        return this.sideOf(actorSide).units.some(
          (u) => u.ref === payload.withRef
        )
          ? null
          : 'troca só com aliado'
      case 'DEFEND':
        return null
    }
  }
}

function isValidRound(round: number) {
  return Number.isInteger(round) && round >= 1 && round <= MAX_ROUNDS
}

function validateSnapshot(snapshot: BattleSnapshot): string | null {
  const sides = [snapshot.player, snapshot.opponent]

  if (snapshot.player.side !== BattleSide.PLAYER) {
    return 'lado do jogador inválido'
  }
  if (snapshot.opponent.side !== BattleSide.OPPONENT) {
    return 'lado do adversário inválido'
  }

  const refs = new Set<string>()

  for (const side of sides) {
    if (side.units.length !== SQUAD_SIZE) {
      return `cada lado tem ${SQUAD_SIZE} personagens`
    }

    if (side.units.some((u) => !isInsideGrid(u))) {
      return 'unidade fora da grade'
    }

    if (new Set(side.units.map(positionKey)).size !== side.units.length) {
      return 'duas unidades na mesma célula'
    }

    for (const unit of side.units) {
      if (refs.has(unit.ref)) return `ref repetida: ${unit.ref}`
      refs.add(unit.ref)

      if (unit.skills.length !== BUILD_SIZE) {
        return `${unit.ref}: a build tem ${BUILD_SIZE} skills`
      }
    }
  }

  return null
}
