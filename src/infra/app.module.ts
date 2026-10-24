import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './auth/auth.module'
import { EnvModule } from './env/env.module'
import { EnvService } from './env/env.service'
import { HttpModule } from './http/http.module'

@Module({
  imports: [
    EnvModule,
    // Limite geral por IP (folgado: só barra inundação). Cadastro e login têm limites mais duros, com @Throttle
    // nos próprios controllers.
    ThrottlerModule.forRootAsync({
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        throttlers: [{ ttl: 60_000, limit: 300 }],
        skipIf: () => !env.get('RATE_LIMIT_ENABLED'),
      }),
    }),
    AuthModule,
    HttpModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
