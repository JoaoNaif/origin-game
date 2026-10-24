import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { HealthController } from './controllers/health.controller'

// Controllers e use-cases (providers) de cada contexto entram aqui.
@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [],
})
export class HttpModule {}
