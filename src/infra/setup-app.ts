import { INestApplication } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { EnvService } from './env/env.service'
import { originCheck } from './http/middlewares/origin-check.middleware'

// O que o app precisa além dos módulos. Fica aqui (e não no main.ts) para os testes e2e usarem o mesmo setup.
export function configureApp(app: INestApplication) {
  const env = app.get(EnvService)

  // cabeçalhos de segurança (nosniff, sem X-Powered-By, HSTS etc.)
  app.use(helmet())
  app.use(cookieParser())

  // só as origens listadas chamam a API pelo navegador; credentials porque a sessão vai em cookie
  app.enableCors({ origin: env.get('CORS_ORIGINS'), credentials: true })

  // CSRF: barra POST/PUT/PATCH/DELETE vindos de origem fora da lista
  app.use(originCheck(env.get('CORS_ORIGINS')))
}
