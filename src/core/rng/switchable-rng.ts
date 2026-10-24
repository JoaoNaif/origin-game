import { Rng } from './rng'

/**
 * Rng que repassa para outra, trocável. Usada pela cópia da batalha (`BattleEngine.fork`): reproduz o passado com a
 * sorte original e, depois, troca para uma sorte nova, para quem simula o futuro não "espiar" os sorteios reais.
 */
export class SwitchableRng extends Rng {
  constructor(public inner: Rng) {
    super()
  }

  next(): number {
    return this.inner.next()
  }

  clone(): Rng {
    return new SwitchableRng(this.inner.clone())
  }
}
