/**
 * Gera o refresh token e o hash usado para buscá-lo no banco. O hash precisa ser determinístico (SHA-256, não
 * bcrypt): é por ele que a sessão é achada.
 */
export abstract class RefreshTokenGenerator {
  abstract generate(): string
  abstract hash(token: string): string
}
