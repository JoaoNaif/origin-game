/** Nível máximo (D46). */
export const MAX_LEVEL = 100

/**
 * XP para subir do nível `level` para o seguinte (D92): `70 × (1 + n/25)²`.
 * No nível máximo não há próximo nível (0).
 */
export function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0

  return Math.round(70 * (1 + level / 25) ** 2)
}
