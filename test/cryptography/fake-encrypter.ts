import { Encrypter } from '@/domain/accounts/applications/cryptography/encrypter'

/** Token de teste: o próprio payload em JSON. */
export class FakeEncrypter implements Encrypter {
  async encrypt(payload: Record<string, unknown>): Promise<string> {
    return JSON.stringify(payload)
  }
}
