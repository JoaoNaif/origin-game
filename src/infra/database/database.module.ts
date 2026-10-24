import { Module } from '@nestjs/common'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SquadsRepository } from '@/domain/squads/applications/repositories/squads-repository'
import { PrismaService } from './prisma/prisma.service'
import { PrismaAccountsRepository } from './prisma/repositories/prisma-accounts-repository'
import { PrismaCatalogRepository } from './prisma/repositories/prisma-catalog-repository'
import { PrismaCharactersRepository } from './prisma/repositories/prisma-characters-repository'
import { PrismaSquadsRepository } from './prisma/repositories/prisma-squads-repository'

@Module({
  providers: [
    PrismaService,
    { provide: AccountsRepository, useClass: PrismaAccountsRepository },
    { provide: CatalogRepository, useClass: PrismaCatalogRepository },
    { provide: CharactersRepository, useClass: PrismaCharactersRepository },
    { provide: SquadsRepository, useClass: PrismaSquadsRepository },
  ],
  exports: [
    PrismaService,
    AccountsRepository,
    CatalogRepository,
    CharactersRepository,
    SquadsRepository,
  ],
})
export class DatabaseModule {}
