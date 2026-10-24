import { Module } from '@nestjs/common'
import { Clock } from '@/core/gateways/clock'
import { SeedGenerator } from '@/domain/combat/applications/gateways/seed-generator'
import { CryptoSeedGenerator } from './crypto-seed-generator'
import { SystemClock } from './system-clock'

@Module({
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: SeedGenerator, useClass: CryptoSeedGenerator },
  ],
  exports: [Clock, SeedGenerator],
})
export class GatewaysModule {}
