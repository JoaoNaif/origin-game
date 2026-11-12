/** Por que a carteira mudou (registro, `WalletEntry`). Espelha o enum `WalletReason` do Prisma. */
export const WalletReason = {
  BATTLE_LOOT: 'BATTLE_LOOT',
  CHEST_PURCHASE: 'CHEST_PURCHASE',
  CHEST_OPEN: 'CHEST_OPEN',
  FRAGMENT_PURCHASE: 'FRAGMENT_PURCHASE',
  FRAGMENT_SALE: 'FRAGMENT_SALE',
  SKILL_ENHANCEMENT: 'SKILL_ENHANCEMENT',
  INVENTORY_EXPANSION: 'INVENTORY_EXPANSION',
  GEAR_SALE: 'GEAR_SALE',
  BEAST_SALE: 'BEAST_SALE',
} as const

export type WalletReason = (typeof WalletReason)[keyof typeof WalletReason]
