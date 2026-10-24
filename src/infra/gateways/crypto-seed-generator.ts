import { randomInt } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { SeedGenerator } from '@/domain/combat/applications/gateways/seed-generator'
import { MAX_SEED } from '@/domain/combat/entities/battle'

/** Seed com sorte criptográfica: o jogador não consegue prever a batalha (D33). */
@Injectable()
export class CryptoSeedGenerator implements SeedGenerator {
  next(): number {
    return randomInt(0, MAX_SEED + 1)
  }
}
