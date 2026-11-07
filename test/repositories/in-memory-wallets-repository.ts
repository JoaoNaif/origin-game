import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { Wallet, WalletEntry } from '@/domain/economy/entities/wallet'
import { Fragments } from '@/domain/economy/value-objects/fragments'

interface StoredWallet {
  accountId: string
  coins: number
  fragments: Fragments
  version: number
}

/** Guarda como o banco: cada leitura é uma cópia, e a gravação confere a versão (duas requisições ao mesmo tempo). */
export class InMemoryWalletsRepository implements WalletsRepository {
  public items: StoredWallet[] = []
  public entries: (WalletEntry & { accountId: string })[] = []

  async findByAccountId(accountId: string): Promise<Wallet> {
    const stored = this.items.find((item) => item.accountId === accountId)
    if (!stored) return Wallet.empty(new UniqueEntityId(accountId))

    return Wallet.restore({
      accountId: new UniqueEntityId(accountId),
      coins: stored.coins,
      fragments: { ...stored.fragments },
      version: stored.version,
    })
  }

  async save(wallet: Wallet): Promise<boolean> {
    const accountId = wallet.accountId.toString()
    const index = this.items.findIndex((item) => item.accountId === accountId)
    const currentVersion = index < 0 ? 0 : this.items[index].version
    if (currentVersion !== wallet.version) return false

    const stored: StoredWallet = {
      accountId,
      coins: wallet.coins,
      fragments: { ...wallet.fragments },
      version: currentVersion + 1,
    }
    if (index < 0) this.items.push(stored)
    else this.items[index] = stored
    this.entries.push(...wallet.entries.map((e) => ({ ...e, accountId })))

    return true
  }

  /** Atalho de teste: põe saldo direto na conta. */
  async give(accountId: string, coins: number, fragments: Fragments = {}) {
    const wallet = await this.findByAccountId(accountId)
    wallet.earn({ reason: 'BATTLE_LOOT', coins, fragments })
    await this.save(wallet)
  }
}
