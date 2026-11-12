import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'

/** Espaços ocupados do inventário (D100): cada equipamento e cada besta ocupam 1, com contrato ou não. */
export async function inventoryUsage(
  gearRepository: GearRepository,
  beastsRepository: BeastsRepository,
  accountId: string
): Promise<number> {
  const [gear, beasts] = await Promise.all([
    gearRepository.countByAccountId(accountId),
    beastsRepository.countByAccountId(accountId),
  ])

  return gear + beasts
}
