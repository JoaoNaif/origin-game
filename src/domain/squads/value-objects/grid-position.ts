/** A grade é 3x3 por jogador (D11, D20). */
export const GRID_SIZE = 3

/**
 * Célula da grade (D35): `row` é a linha (0 a 2), que vai da frente para o fundo; `column` é a profundidade
 * (0 a 2), com a coluna 0 na frente.
 */
export interface GridPosition {
  row: number
  column: number
}

export function isInsideGrid({ row, column }: GridPosition): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(column) &&
    row >= 0 &&
    row < GRID_SIZE &&
    column >= 0 &&
    column < GRID_SIZE
  )
}

export function positionKey({ row, column }: GridPosition): string {
  return `${row}:${column}`
}
