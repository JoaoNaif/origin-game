import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Account, AccountProps } from '@/domain/accounts/entities/account'

export function makeAccount(
  override: Partial<AccountProps> = {},
  id?: UniqueEntityId
): Account {
  const result = Account.create(
    {
      username: 'tester_01',
      displayName: 'Tester',
      passwordHash: '12345678-hashed',
      ...override,
    },
    id
  )

  if (result.isLeft()) throw result.value

  return result.value
}
