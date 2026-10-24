import { HashCompare } from '@/domain/accounts/applications/cryptography/hash-compare'
import { HashGenerator } from '@/domain/accounts/applications/cryptography/hash-generator'

/** Hash de teste: a senha com `-hashed` no fim (dá para conferir sem bcrypt). */
export class FakeHasher implements HashGenerator, HashCompare {
  async hash(plain: string): Promise<string> {
    return plain.concat('-hashed')
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return plain.concat('-hashed') === hash
  }
}
