import { Injectable } from '@nestjs/common'
import { compare, hash } from 'bcryptjs'
import { HashCompare } from '@/domain/accounts/applications/cryptography/hash-compare'
import { HashGenerator } from '@/domain/accounts/applications/cryptography/hash-generator'

@Injectable()
export class BcryptHasher implements HashGenerator, HashCompare {
  private readonly HASH_SALT_LENGTH = 8

  async hash(plain: string): Promise<string> {
    return hash(plain, this.HASH_SALT_LENGTH)
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed)
  }
}
