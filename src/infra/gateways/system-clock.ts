import { Injectable } from '@nestjs/common'
import { Clock } from '@/core/gateways/clock'

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}
