import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule, JwtSignOptions } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { EnvService } from '../env/env.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { JwtStrategy } from './jwt-strategy'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [EnvService],
      global: true,
      useFactory(env: EnvService) {
        return {
          signOptions: {
            algorithm: 'RS256',
            expiresIn: env.get('JWT_EXPIRES_IN') as JwtSignOptions['expiresIn'],
          },
          privateKey: Buffer.from(env.get('JWT_PRIVATE_KEY'), 'base64'),
          publicKey: Buffer.from(env.get('JWT_PUBLIC_KEY'), 'base64'),
        }
      },
    }),
  ],
  providers: [JwtStrategy, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AuthModule {}
