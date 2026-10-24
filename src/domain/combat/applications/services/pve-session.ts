import { Either, left, right } from '@/core/either'
import { Rng } from '@/core/rng/rng'
import { SeededRng } from '@/core/rng/seeded-rng'
import { aiDecisionRng, MachineAi } from '@/domain/ai/machine-ai'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { BattleEngine } from '../../engine/battle-engine'
import { BattleEvent } from '../../engine/battle-events'
import { Battle } from '../../entities/battle'
import { BattleSide, MAX_ROUNDS } from '../../enums/battle-enums'
import { BuildSnapshotError } from '../../errors/build-snapshot-error'
import { InvalidActionError } from '../../errors/invalid-action-error'
import { InvalidBattleError } from '../../errors/invalid-battle-error'
import { toSnapshotField } from '../../services/build-snapshot'
import { drawInitialField } from '../../services/field-draw'
import { BattleActionPayload } from '../../value-objects/battle-action'
import { SnapshotField } from '../../value-objects/battle-snapshot'

/** Versão das regras do motor gravada na batalha: o replay só é garantido com a mesma versão (`data_model.md` 3.10). */
export const ENGINE_VERSION = '0.2.0'

/** Sal da sorte do campo: o sorteio do campo não consome a sorte do motor (o replay começa do zero). */
const FIELD_SEED_SALT = 0x5bd1e995

/** Sorte do sorteio do campo inicial (D28, D112), derivada da seed. */
export function fieldRng(seed: number): Rng {
  return new SeededRng((seed ^ FIELD_SEED_SALT) >>> 0)
}

/** Os campos do catálogo como valor, em ordem fixa pela `key` (o sorteio pela seed depende da ordem). */
export function catalogFields(
  catalog: GameCatalog
): Either<BuildSnapshotError, SnapshotField[]> {
  const fields: SnapshotField[] = []

  for (const field of [...catalog.fields].sort((a, b) =>
    a.key.localeCompare(b.key)
  )) {
    const snapshotField = toSnapshotField(field, catalog.traits)
    if (snapshotField.isLeft()) return left(snapshotField.value)
    fields.push(snapshotField.value)
  }

  return right(fields)
}

/** Campo inicial sorteado pela seed entre todos os do catálogo (D112); catálogo sem campos = sem campo. */
export function drawField(
  fields: readonly SnapshotField[],
  seed: number
): SnapshotField | null {
  return drawInitialField(fields, fieldRng(seed))
}

/** Motor no início da batalha: a foto e a sorte da seed. */
export function startEngine(battle: Battle): BattleEngine {
  return new BattleEngine(battle.snapshot, new SeededRng(battle.seed))
}

/**
 * Reconstrói o motor a partir da foto, da seed e das ações gravadas (D8). O servidor não guarda o estado: cada
 * requisição refaz a batalha (barato, o replay não roda a IA).
 */
export function replayBattle(
  battle: Battle
): Either<InvalidBattleError, BattleEngine> {
  const engine = startEngine(battle)

  for (const action of battle.actions) {
    const turn = engine.nextTurn()
    if (!turn || turn.ref !== action.actorRef) {
      return left(
        new InvalidBattleError(`replay divergiu na ação ${action.sequence}`)
      )
    }

    const acted = engine.act(action.payload)
    if (acted.isLeft()) {
      return left(
        new InvalidBattleError(
          `replay divergiu na ação ${action.sequence}: ${acted.value.message}`
        )
      )
    }
  }

  return right(engine)
}

function record(
  battle: Battle,
  engine: BattleEngine,
  side: BattleSide,
  actorRef: string,
  round: number,
  payload: BattleActionPayload
): Either<InvalidBattleError | InvalidActionError, void> {
  const acted = engine.act(payload)
  if (acted.isLeft()) return left(acted.value)

  const recorded = battle.recordAction({ round, side, actorRef, payload })
  if (recorded.isLeft()) return left(recorded.value)

  return right(undefined)
}

/**
 * Joga as vezes da máquina (D90, D103) até chegar a vez do jogador ou a batalha acabar. Cada decisão monta a IA de
 * novo, com a sorte da posição no log (`aiDecisionRng`); o log do jogador ela relê dos eventos do motor.
 */
export function playMachineTurns(
  battle: Battle,
  engine: BattleEngine
): Either<InvalidBattleError | InvalidActionError, void> {
  if (!battle.aiProfile || !battle.aiDifficulty) {
    return left(new InvalidBattleError('batalha PvE sem perfil da IA'))
  }

  for (
    let turn = engine.nextTurn();
    turn && turn.side === BattleSide.OPPONENT;
    turn = engine.nextTurn()
  ) {
    const ai = new MachineAi(
      {
        side: BattleSide.OPPONENT,
        profile: battle.aiProfile,
        difficulty: battle.aiDifficulty,
      },
      aiDecisionRng(battle.seed, BattleSide.OPPONENT, battle.actions.length)
    )
    const { payload } = ai.decide(engine, turn.ref)

    const done = record(
      battle,
      engine,
      turn.side,
      turn.ref,
      turn.round,
      payload
    )
    if (done.isLeft()) return left(done.value)
  }

  return right(undefined)
}

/** Aplica a jogada do jogador na vez dele. Jogada inválida não muda nada e devolve o erro do motor. */
export function playPlayerTurn(
  battle: Battle,
  engine: BattleEngine,
  payload: BattleActionPayload
): Either<InvalidBattleError | InvalidActionError, void> {
  const turn = engine.nextTurn()
  if (!turn) return left(new InvalidBattleError('a batalha já terminou'))
  if (turn.side !== BattleSide.PLAYER) {
    return left(new InvalidBattleError('não é a vez do jogador'))
  }

  return record(battle, engine, turn.side, turn.ref, turn.round, payload)
}

/** Fecha a batalha quando o motor terminou (eliminação ou rodada 30, D122). */
export function finishIfOver(
  battle: Battle,
  engine: BattleEngine,
  now: Date
): Either<InvalidBattleError, boolean> {
  const outcome = engine.outcome
  if (!outcome || battle.isFinished) return right(false)

  const finished = battle.finish({
    winner: outcome.winner,
    reason: outcome.reason,
    rounds: Math.min(engine.round, MAX_ROUNDS),
    finishedAt: now,
  })
  if (finished.isLeft()) return left(finished.value)

  return right(true)
}

/** Eventos a partir de uma posição do log (o que a última requisição produziu). */
export function eventsSince(
  engine: BattleEngine,
  from: number
): readonly BattleEvent[] {
  return engine.events.slice(from)
}
