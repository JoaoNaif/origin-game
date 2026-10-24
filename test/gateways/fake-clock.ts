import { Clock } from '@/core/gateways/clock'

/** Relógio de teste: começa numa data fixa e anda 1 segundo a cada leitura. */
export class FakeClock implements Clock {
  private current = new Date('2026-10-24T12:00:00.000Z').getTime()

  now(): Date {
    const date = new Date(this.current)
    this.current += 1000

    return date
  }
}
