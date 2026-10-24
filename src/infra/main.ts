import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { EnvService } from './env/env.service'
import { configureApp } from './setup-app'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  configureApp(app)

  await app.listen(app.get(EnvService).get('PORT'))
}

void bootstrap()
