import { RefreshTokenGenerator } from '@/domain/accounts/applications/cryptography/refresh-token-generator'

/** Refresh tokens de teste em sequência; o hash é o token com `hash:` na frente. */
export class FakeRefreshTokenGenerator implements RefreshTokenGenerator {
  private count = 0

  generate(): string {
    this.count += 1

    return `refresh-token-${this.count}`
  }

  hash(token: string): string {
    return `hash:${token}`
  }
}
