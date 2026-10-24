import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { FetchNpcSquadsController } from './controllers/catalog/fetch-npc-squads.controller'
import { FetchTemplatesController } from './controllers/catalog/fetch-templates.controller'
import { HealthController } from './controllers/health.controller'

// Controllers e use-cases (providers) de cada contexto entram aqui.
@Module({
  imports: [DatabaseModule],
  controllers: [
    HealthController,
    // catálogo (leitura pública, direto do repositório)
    FetchTemplatesController,
    FetchNpcSquadsController,
  ],
  providers: [],
})
export class HttpModule {}
