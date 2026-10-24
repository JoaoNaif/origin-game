import { SeedGenerator } from '@/domain/combat/applications/gateways/seed-generator'

/** Seeds de teste em sequência, a partir de um valor fixo. */
export class FakeSeedGenerator implements SeedGenerator {
  constructor(private seed = 42) {}

  next(): number {
    return this.seed++
  }
}
