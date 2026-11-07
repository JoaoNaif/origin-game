import { Chest } from '@/domain/economy/entities/chest'

/** Baú da conta; `contents` só depois de aberto. */
export class ChestPresenter {
  static toHTTP(chest: Chest) {
    return {
      id: chest.id.toString(),
      tier: chest.tier,
      source: chest.source,
      battleId: chest.battleId?.toString() ?? null,
      createdAt: chest.createdAt,
      openedAt: chest.openedAt,
      contents: chest.contents,
    }
  }
}
