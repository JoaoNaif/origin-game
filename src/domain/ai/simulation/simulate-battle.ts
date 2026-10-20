import { SeededRng } from '@/core/rng/seeded-rng'
import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import {
  BattleEndReason,
  BattleSide,
  MAX_ROUNDS,
} from '@/domain/combat/enums/battle-enums'
import { BattleActionRecord } from '@/domain/combat/value-objects/battle-action'
import { BattleSnapshot } from '@/domain/combat/value-objects/battle-snapshot'
import { AiDifficulty } from '../enums/ai-difficulty'
import { AiProfile } from '../enums/ai-profile'
import { aiRng, MachineAi } from '../machine-ai'

export interface AiSetup {
  profile: AiProfile
  difficulty: AiDifficulty
}

export interface SimulatedBattle {
  winner: BattleSide
  reason: BattleEndReason
  /** Última rodada jogada (até 30). */
  round: number
  actions: BattleActionRecord[]
}

/** Teto de segurança de turnos (uma batalha normal acaba bem antes, na rodada 30). */
const MAX_TURNS = 2000

/**
 * Uma batalha inteira IA contra IA (`engine.md` 3.14). Determinística: mesma seed, mesmo resultado. As ações saem no
 * formato do log (`BattleActionRecord`), então a batalha pode ser reproduzida pelo replay.
 */
export function simulateBattle(
  snapshot: BattleSnapshot,
  seed: number,
  setups: Record<BattleSide, AiSetup>
): SimulatedBattle {
  const engine = new BattleEngine(snapshot, new SeededRng(seed))
  const ais = {
    PLAYER: new MachineAi(
      { side: BattleSide.PLAYER, ...setups.PLAYER },
      aiRng(seed, BattleSide.PLAYER)
    ),
    OPPONENT: new MachineAi(
      { side: BattleSide.OPPONENT, ...setups.OPPONENT },
      aiRng(seed, BattleSide.OPPONENT)
    ),
  }
  const actions: BattleActionRecord[] = []

  for (let turn = engine.nextTurn(); turn; turn = engine.nextTurn()) {
    if (actions.length >= MAX_TURNS) {
      throw new Error('simulateBattle: batalha não terminou')
    }
    const { payload } = ais[turn.side].decide(engine, turn.ref)
    const result = engine.act(payload)
    if (result.isLeft()) throw result.value

    actions.push({
      sequence: actions.length,
      round: turn.round,
      side: turn.side,
      actorRef: turn.ref,
      payload,
    })
  }

  const outcome = engine.outcome!

  return {
    winner: outcome.winner,
    reason: outcome.reason,
    round: Math.min(engine.round, MAX_ROUNDS),
    actions,
  }
}
