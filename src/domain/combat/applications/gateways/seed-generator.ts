/**
 * Sorteia a seed de uma batalha nova (0 a `MAX_SEED`). Fica fora do domínio: a aleatoriedade de verdade vem da
 * infra; dali em diante tudo sai da seed (D8).
 */
export abstract class SeedGenerator {
  abstract next(): number
}
