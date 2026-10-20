import { BattleSide } from '@/domain/combat/enums/battle-enums'
import { BattleSnapshot } from '@/domain/combat/value-objects/battle-snapshot'
import { AiSetup, simulateBattle } from './simulate-battle'

export interface MatchupInput {
  /** A foto, ou uma função da seed (ex.: para variar o campo de batalha a cada par de batalhas). */
  snapshot: BattleSnapshot | ((seed: number) => BattleSnapshot)
  a: AiSetup
  b: AiSetup
  /** Quantas batalhas (seeds `firstSeed`, `firstSeed + 1`...). */
  battles: number
  firstSeed?: number
}

export interface MatchupResult {
  battles: number
  winsA: number
  /** Vitórias de A ÷ batalhas. */
  winRateA: number
  /** Batalhas que acabaram por eliminação (o resto foi pelo fim forçado na rodada 30). */
  eliminations: number
  averageRound: number
}

/**
 * Confronto de duas configurações de IA em várias seeds (`engine.md` 3.14). A **troca de lado a cada batalha** (A joga
 * como PLAYER nas seeds pares e como OPPONENT nas ímpares) tira a vantagem de lado da medida.
 */
export function runMatchup(input: MatchupInput): MatchupResult {
  const firstSeed = input.firstSeed ?? 1
  let winsA = 0
  let eliminations = 0
  let rounds = 0

  for (let i = 0; i < input.battles; i++) {
    const aSide = i % 2 === 0 ? BattleSide.PLAYER : BattleSide.OPPONENT
    const setups =
      aSide === BattleSide.PLAYER
        ? { PLAYER: input.a, OPPONENT: input.b }
        : { PLAYER: input.b, OPPONENT: input.a }

    const seed = firstSeed + i
    const snapshot =
      typeof input.snapshot === 'function'
        ? input.snapshot(seed)
        : input.snapshot
    const battle = simulateBattle(snapshot, seed, setups)
    if (battle.winner === aSide) winsA += 1
    if (battle.reason === 'ELIMINATION') eliminations += 1
    rounds += battle.round
  }

  return {
    battles: input.battles,
    winsA,
    winRateA: input.battles > 0 ? winsA / input.battles : 0,
    eliminations,
    averageRound: input.battles > 0 ? rounds / input.battles : 0,
  }
}
