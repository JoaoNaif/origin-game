import { Controller, Get } from '@nestjs/common'
import { Public } from '@/infra/auth/public'

@Controller('health')
@Public()
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' }
  }
}
