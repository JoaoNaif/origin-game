import { INestApplication } from '@nestjs/common'
import { EnvService } from './env/env.service'

// O que o app precisa além dos módulos. Fica aqui (e não no main.ts) para os testes e2e usarem o mesmo setup.
export function configureApp(app: INestApplication) {
  const env = app.get(EnvService)

  app.enableCors({ origin: env.get('CORS_ORIGINS') })
}
