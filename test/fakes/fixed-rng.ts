import { Rng } from '@/core/rng/rng'

/** Rng de teste: devolve valores pré-definidos em ciclo (cada um em [0, 1)). */
export class FixedRng extends Rng {
  private index = 0

  constructor(private readonly values: number[] = [0]) {
    super()
  }

  next(): number {
    const value = this.values[this.index % this.values.length]
    this.index += 1

    return value
  }
}
