import { Module } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { PrismaService } from './prisma/prisma.service'
import { PrismaCatalogRepository } from './prisma/repositories/prisma-catalog-repository'

@Module({
  providers: [
    PrismaService,
    { provide: CatalogRepository, useClass: PrismaCatalogRepository },
  ],
  exports: [PrismaService, CatalogRepository],
})
export class DatabaseModule {}
