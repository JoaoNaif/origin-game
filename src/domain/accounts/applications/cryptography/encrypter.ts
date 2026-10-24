/** Assina o token de acesso (JWT na infra). */
export abstract class Encrypter {
  abstract encrypt(payload: Record<string, unknown>): Promise<string>
}
