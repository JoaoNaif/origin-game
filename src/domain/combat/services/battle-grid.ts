import { Either, left, right } from '@/core/either'
import {
  GridPosition,
  isInsideGrid,
} from '@/domain/squads/value-objects/grid-position'
import { InvalidTargetError } from '../errors/invalid-target-error'

/**
 * Chance base do reposicionamento forçado (empurrar, puxar, trocar inimigos), D111: 80%, a mesma dos status de controle
 * (Preso, Travado, 12.4). A Vontade resiste com a forma dos status (11.9): `base × 2 × Precisão / (Precisão + Vontade)`.
 */
export const FORCED_MOVE_BASE_CHANCE = 0.8

/** Adjacente = 4 direções, sem diagonal (11.2). */
export function isAdjacent(a: GridPosition, b: GridPosition): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.column - b.column) === 1
}

/** Células adjacentes dentro da grade. */
export function adjacentCells(cell: GridPosition): GridPosition[] {
  return [
    { row: cell.row - 1, column: cell.column },
    { row: cell.row + 1, column: cell.column },
    { row: cell.row, column: cell.column - 1 },
    { row: cell.row, column: cell.column + 1 },
  ].filter(isInsideGrid)
}

export type MoveOutcome = 'MOVED' | 'BLOCKED'

/**
 * Posições de um lado da batalha (D11, D35), com as regras de movimento (D19, D42, D44, 10.4, 11.11). Quem está
 * Preso não se move nem é movido (11.9): o chamador passa `canBeMoved`.
 */
export class BattleGrid {
  private readonly positions = new Map<string, GridPosition>()
  /** Muda a cada mudança de posição (quem guarda vizinhança sabe quando recalcular). */
  private changes = 0

  get version(): number {
    return this.changes
  }

  constructor(units: readonly ({ ref: string } & GridPosition)[]) {
    for (const { ref, row, column } of units)
      this.positions.set(ref, { row, column })
  }

  /** Cópia independente (previsão da IA). */
  clone(): BattleGrid {
    const copy = new BattleGrid([])
    for (const [ref, p] of this.positions) copy.positions.set(ref, { ...p })
    copy.changes = this.changes

    return copy
  }

  positionOf(ref: string): GridPosition {
    const position = this.positions.get(ref)
    if (!position) throw new Error(`BattleGrid: ${ref} não está na grade`)

    return { ...position }
  }

  unitAt(cell: GridPosition): string | undefined {
    for (const [ref, position] of this.positions) {
      if (position.row === cell.row && position.column === cell.column)
        return ref
    }
  }

  isEmpty(cell: GridPosition): boolean {
    return isInsideGrid(cell) && this.unitAt(cell) === undefined
  }

  /** Tira da grade (derrotado deixa de bloquear, D21). */
  remove(ref: string) {
    this.positions.delete(ref)
    this.changes += 1
  }

  /** Unidades vivas com a posição (para o alcance, 3.6). */
  units(): ({ ref: string } & GridPosition)[] {
    return [...this.positions].map(([ref, p]) => ({ ref, ...p }))
  }

  /**
   * Mover por ação (custa o turno, D42) ou por skill (DASH, MOVE_ALLY): só para célula **adjacente e vazia**.
   */
  move(
    ref: string,
    to: GridPosition,
    canBeMoved: boolean
  ): Either<InvalidTargetError, void> {
    if (!canBeMoved) return left(new InvalidTargetError(`${ref} está Preso`))

    if (!isAdjacent(this.positionOf(ref), to)) {
      return left(new InvalidTargetError('só para célula adjacente'))
    }

    if (!this.isEmpty(to)) {
      return left(new InvalidTargetError('célula ocupada ou fora da grade'))
    }

    this.positions.set(ref, { ...to })
    this.changes += 1

    return right(undefined)
  }

  /**
   * Troca dois aliados de lugar. Como ação comum, os dois perdem a ação (D42); pelo Tático, nenhum perde (D102). Quem
   * decide isso é o chamador; aqui só a troca. Nenhum dos dois pode estar Preso.
   */
  swap(
    a: string,
    b: string,
    canMove: { a: boolean; b: boolean }
  ): Either<InvalidTargetError, void> {
    if (!canMove.a || !canMove.b) {
      return left(new InvalidTargetError('quem está Preso não troca de lugar'))
    }

    const positionA = this.positionOf(a)
    const positionB = this.positionOf(b)

    this.positions.set(a, positionB)
    this.positions.set(b, positionA)
    this.changes += 1

    return right(undefined)
  }

  /**
   * Empurrar (para o fundo, coluna +1) ou puxar (para a frente, coluna −1) uma unidade, na mesma linha. Célula ocupada
   * ou fora da grade **barra o movimento**, mas o resto da skill acontece (D44): por isso devolve BLOCKED, não erro.
   */
  forcedMove(
    ref: string,
    kind: 'PUSH' | 'PULL',
    canBeMoved: boolean
  ): MoveOutcome {
    if (!canBeMoved) return 'BLOCKED'

    const from = this.positionOf(ref)
    const to = {
      row: from.row,
      column: from.column + (kind === 'PUSH' ? 1 : -1),
    }

    if (!this.isEmpty(to)) return 'BLOCKED'

    this.positions.set(ref, to)
    this.changes += 1

    return 'MOVED'
  }

  /**
   * Trocar por skill contra inimigo (D111): o alvo troca de lugar com **outro inimigo adjacente a ele**, escolhido por
   * quem usa. Bagunça a formação (ex.: traz um frágil para a frente). Não adjacente ou algum Preso: barrado (o resto da
   * skill acontece, D44).
   */
  forcedSwap(
    ref: string,
    withRef: string,
    canMove: { ref: boolean; withRef: boolean }
  ): MoveOutcome {
    if (ref === withRef || !canMove.ref || !canMove.withRef) return 'BLOCKED'
    if (!isAdjacent(this.positionOf(ref), this.positionOf(withRef))) {
      return 'BLOCKED'
    }

    const a = this.positionOf(ref)
    this.positions.set(ref, this.positionOf(withRef))
    this.positions.set(withRef, a)
    this.changes += 1

    return 'MOVED'
  }
}
