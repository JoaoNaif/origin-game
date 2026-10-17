/**
 * Porta de aleatoriedade. Toda aleatoriedade do jogo entra por aqui, alimentada pela seed
 * (mesma seed + mesmas ações = mesmo resultado). Nunca use Math.random() no domínio.
 */
export abstract class Rng {
  /** Número em [0, 1). */
  abstract next(): number

  /** Inteiro em [min, max], ambos inclusos. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** `true` com probabilidade `p` (0 a 1). */
  chance(p: number): boolean {
    return this.next() < p
  }

  /** Item sorteado de uma lista não vazia. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Rng.pick: lista vazia')
    }

    return items[this.int(0, items.length - 1)]
  }
}
