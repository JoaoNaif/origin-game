import { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { originCheck } from './origin-check.middleware'

const sut = originCheck(['http://localhost:5173'])

function call(method: string, origin?: string) {
  const req = { method, headers: origin ? { origin } : {} } as Request
  const json = vi.fn()
  const res = { status: vi.fn(() => ({ json })) } as unknown as Response
  const next = vi.fn()

  sut(req, res, next)

  return { res, next }
}

describe('Origin Check Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be able to let reads through from any origin', () => {
    expect(call('GET', 'https://outro.site').next).toHaveBeenCalled()
  })

  it('should be able to let writes through from an allowed origin', () => {
    expect(call('POST', 'http://localhost:5173').next).toHaveBeenCalled()
  })

  it('should be able to let writes through without an origin (no browser)', () => {
    expect(call('POST').next).toHaveBeenCalled()
  })

  it('should not be able to write from another origin', () => {
    const { res, next } = call('POST', 'https://outro.site')

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
