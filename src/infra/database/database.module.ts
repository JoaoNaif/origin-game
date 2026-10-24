import { Module } from '@nestjs/common'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { SessionsRepository } from '@/domain/accounts/applications/repositories/sessions-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { BattleDraftsRepository } from '@/domain/combat/applications/repositories/battle-drafts-repository'
import { BattlesRepository } from '@/domain/combat/applications/repositories/battles-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SquadsRepository } from '@/domain/squads/applications/repositories/squads-repository'
import { MemoryBattleDraftsRepository } from './memory/memory-battle-drafts-repository'
import { PrismaService } from './prisma/prisma.service'
import { PrismaAccountsRepository } from './prisma/repositories/prisma-accounts-repository'
import { PrismaBattlesRepository } from './prisma/repositories/prisma-battles-repository'
import { PrismaCatalogRepository } from './prisma/repositories/prisma-catalog-repository'
import { PrismaCharactersRepository } from './prisma/repositories/prisma-characters-repository'
import { PrismaSessionsRepository } from './prisma/repositories/prisma-sessions-repository'
import { PrismaSquadsRepository } from './prisma/repositories/prisma-squads-repository'

@Module({
  providers: [
    PrismaService,
    { provide: AccountsRepository, useClass: PrismaAccountsRepository },
    { provide: SessionsRepository, useClass: PrismaSessionsRepository },
    { provide: CatalogRepository, useClass: PrismaCatalogRepository },
    { provide: CharactersRepository, useClass: PrismaCharactersRepository },
    { provide: SquadsRepository, useClass: PrismaSquadsRepository },
    { provide: BattlesRepository, useClass: PrismaBattlesRepository },
    // pré-batalha dura minutos: fica em memória no MVP (memory-battle-drafts-repository.ts)
    { provide: BattleDraftsRepository, useClass: MemoryBattleDraftsRepository },
  ],
  exports: [
    PrismaService,
    AccountsRepository,
    SessionsRepository,
    CatalogRepository,
    CharactersRepository,
    SquadsRepository,
    BattlesRepository,
    BattleDraftsRepository,
  ],
})
export class DatabaseModule {}
