import { Module } from '@nestjs/common'
import { EnvModule } from './env/env.module'
import { HttpModule } from './http/http.module'

@Module({
  imports: [EnvModule, HttpModule],
})
export class AppModule {}
