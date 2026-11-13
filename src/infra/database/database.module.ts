import { Module } from '@nestjs/common'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { SessionsRepository } from '@/domain/accounts/applications/repositories/sessions-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { BattleDraftsRepository } from '@/domain/combat/applications/repositories/battle-drafts-repository'
import { BattlesRepository } from '@/domain/combat/applications/repositories/battles-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SkillOffersRepository } from '@/domain/characters/applications/repositories/skill-offers-repository'
import { ChestsRepository } from '@/domain/economy/applications/repositories/chests-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'
import { SquadsRepository } from '@/domain/squads/applications/repositories/squads-repository'
import { MemoryBattleDraftsRepository } from './memory/memory-battle-drafts-repository'
import { PrismaService } from './prisma/prisma.service'
import { PrismaAccountsRepository } from './prisma/repositories/prisma-accounts-repository'
import { PrismaBattlesRepository } from './prisma/repositories/prisma-battles-repository'
import { PrismaCatalogRepository } from './prisma/repositories/prisma-catalog-repository'
import { PrismaCharactersRepository } from './prisma/repositories/prisma-characters-repository'
import { PrismaSessionsRepository } from './prisma/repositories/prisma-sessions-repository'
import { PrismaSkillOffersRepository } from './prisma/repositories/prisma-skill-offers-repository'
import { PrismaSquadsRepository } from './prisma/repositories/prisma-squads-repository'
import { PrismaChestsRepository } from './prisma/repositories/prisma-chests-repository'
import { PrismaWalletsRepository } from './prisma/repositories/prisma-wallets-repository'
import { PrismaGearRepository } from './prisma/repositories/prisma-gear-repository'
import { PrismaBeastsRepository } from './prisma/repositories/prisma-beasts-repository'
import { PrismaEventEntriesRepository } from './prisma/repositories/prisma-event-entries-repository'
import { PrismaPendingRewardsRepository } from './prisma/repositories/prisma-pending-rewards-repository'
import { EventEntriesRepository } from '@/domain/events/applications/repositories/event-entries-repository'
import { PendingRewardsRepository } from '@/domain/events/applications/repositories/pending-rewards-repository'

@Module({
  providers: [
    PrismaService,
    { provide: AccountsRepository, useClass: PrismaAccountsRepository },
    { provide: SessionsRepository, useClass: PrismaSessionsRepository },
    { provide: CatalogRepository, useClass: PrismaCatalogRepository },
    { provide: CharactersRepository, useClass: PrismaCharactersRepository },
    { provide: SkillOffersRepository, useClass: PrismaSkillOffersRepository },
    { provide: SquadsRepository, useClass: PrismaSquadsRepository },
    { provide: BattlesRepository, useClass: PrismaBattlesRepository },
    { provide: WalletsRepository, useClass: PrismaWalletsRepository },
    { provide: ChestsRepository, useClass: PrismaChestsRepository },
    { provide: GearRepository, useClass: PrismaGearRepository },
    { provide: BeastsRepository, useClass: PrismaBeastsRepository },
    { provide: EventEntriesRepository, useClass: PrismaEventEntriesRepository },
    {
      provide: PendingRewardsRepository,
      useClass: PrismaPendingRewardsRepository,
    },
    // pré-batalha dura minutos: fica em memória no MVP (memory-battle-drafts-repository.ts)
    { provide: BattleDraftsRepository, useClass: MemoryBattleDraftsRepository },
  ],
  exports: [
    PrismaService,
    AccountsRepository,
    SessionsRepository,
    CatalogRepository,
    CharactersRepository,
    SkillOffersRepository,
    SquadsRepository,
    BattlesRepository,
    BattleDraftsRepository,
    WalletsRepository,
    ChestsRepository,
    GearRepository,
    BeastsRepository,
    EventEntriesRepository,
    PendingRewardsRepository,
  ],
})
export class DatabaseModule {}
