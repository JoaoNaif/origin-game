import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Lineage } from '@/domain/characters/enums/lineage'
import {
  FRAGMENT_CAP,
  FRAGMENT_PRICE,
  INVENTORY_SLOTS,
  inventoryExpansionPrice,
} from '../economy-values'
import { WalletReason } from '../enums/wallet-reason'
import { InsufficientFundsError } from '../errors/insufficient-funds-error'
import { InvalidEconomyActionError } from '../errors/invalid-economy-action-error'
import {
  FRAGMENT_TYPES,
  Fragments,
  negateFragments,
} from '../value-objects/fragments'

/** Uma linha do registro: quanto mudou e por quê (`coins` e `fragments` com sinal). */
export interface WalletEntry {
  reason: WalletReason
  coins: number
  fragments: Fragments
  /** O que causou (batalha, baú, personagem). */
  refId: string | null
}

export interface WalletProps {
  accountId: UniqueEntityId
  coins: number
  fragments: Fragments
  /** Espaços do inventário (D100): 30 no início, +5 por compra, até 100. */
  inventorySlots: number
  /** Versão lida do banco; 0 = a conta ainda não tem carteira gravada. */
  version: number
  /** Mudanças desta operação, gravadas junto com a carteira. */
  entries: WalletEntry[]
}

export interface WalletChange {
  reason: WalletReason
  refId?: string | null
  coins?: number
  fragments?: Fragments
}

const isCount = (n: number) => Number.isInteger(n) && n >= 0

/**
 * Carteira da conta (D79, D100, D104): uma moeda só e os 7 Fragmentos de Éon, com limite de 500 por tipo. Fragmento
 * que passaria do limite vira moeda pelo preço de venda (D150). Cada mudança vira uma linha do registro.
 */
export class Wallet extends Entity<WalletProps> {
  get accountId() {
    return this.props.accountId
  }

  get coins() {
    return this.props.coins
  }

  /** Os 7 tipos, com zero nos que faltam. */
  get fragments(): Record<Lineage, number> {
    return Object.fromEntries(
      FRAGMENT_TYPES.map((type) => [type, this.props.fragments[type] ?? 0])
    ) as Record<Lineage, number>
  }

  get inventorySlots() {
    return this.props.inventorySlots
  }

  /** Preço da próxima compra de espaços; nulo = já está no máximo. */
  get nextInventoryExpansionPrice(): number | null {
    return inventoryExpansionPrice(this.props.inventorySlots)
  }

  get version() {
    return this.props.version
  }

  get entries(): readonly WalletEntry[] {
    return this.props.entries
  }

  fragmentsOf(type: Lineage): number {
    return this.props.fragments[type] ?? 0
  }

  /** Carteira de quem ainda não ganhou nada (não gravada). */
  static empty(accountId: UniqueEntityId): Wallet {
    return new Wallet(
      {
        accountId,
        coins: 0,
        fragments: {},
        inventorySlots: INVENTORY_SLOTS.initial,
        version: 0,
        entries: [],
      },
      accountId
    )
  }

  static restore(props: Omit<WalletProps, 'entries'>): Wallet {
    return new Wallet({ ...props, entries: [] }, props.accountId)
  }

  /**
   * Credita moeda e fragmentos. O que passaria de 500 num tipo vira moeda (40 M cada). Devolve o que entrou de fato.
   */
  earn(change: WalletChange): { coins: number; fragments: Fragments } {
    const coins = change.coins ?? 0
    const fragments = change.fragments ?? {}
    this.assertCounts(coins, fragments)

    const credited: Fragments = {}
    let overflow = 0
    for (const type of FRAGMENT_TYPES) {
      const amount = fragments[type] ?? 0
      if (amount === 0) continue

      const room = Math.max(0, FRAGMENT_CAP - this.fragmentsOf(type))
      const kept = Math.min(amount, room)
      overflow += amount - kept
      if (kept > 0) {
        credited[type] = kept
        this.props.fragments[type] = this.fragmentsOf(type) + kept
      }
    }

    const totalCoins = coins + overflow * FRAGMENT_PRICE.SELL
    this.props.coins += totalCoins
    this.record(change, totalCoins, credited)

    return { coins: totalCoins, fragments: credited }
  }

  /** Debita moeda e fragmentos, tudo ou nada. */
  spend(change: WalletChange): Either<InsufficientFundsError, void> {
    const coins = change.coins ?? 0
    const fragments = change.fragments ?? {}
    this.assertCounts(coins, fragments)

    if (coins > this.props.coins) {
      return left(
        new InsufficientFundsError(
          `custa ${coins} M e a conta tem ${this.props.coins} M`
        )
      )
    }

    const short = FRAGMENT_TYPES.find(
      (type) => (fragments[type] ?? 0) > this.fragmentsOf(type)
    )
    if (short) {
      return left(
        new InsufficientFundsError(
          `custa ${fragments[short]} fragmentos ${short} e a conta tem ${this.fragmentsOf(short)}`
        )
      )
    }

    this.props.coins -= coins
    for (const type of FRAGMENT_TYPES) {
      const amount = fragments[type] ?? 0
      if (amount > 0)
        this.props.fragments[type] = this.fragmentsOf(type) - amount
    }
    this.record(change, -coins, negateFragments(fragments))

    return right(undefined)
  }

  /** Compra +5 espaços no inventário (D100), com preço crescente, até 100. */
  expandInventory(): Either<
    InvalidEconomyActionError | InsufficientFundsError,
    { price: number }
  > {
    const price = this.nextInventoryExpansionPrice
    if (price === null) {
      return left(
        new InvalidEconomyActionError(
          `o inventário já tem o máximo de ${INVENTORY_SLOTS.max} espaços`
        )
      )
    }

    const spent = this.spend({
      reason: WalletReason.INVENTORY_EXPANSION,
      coins: price,
    })
    if (spent.isLeft()) return left(spent.value)

    this.props.inventorySlots += INVENTORY_SLOTS.step

    return right({ price })
  }

  private record(change: WalletChange, coins: number, fragments: Fragments) {
    this.props.entries.push({
      reason: change.reason,
      coins,
      fragments,
      refId: change.refId ?? null,
    })
  }

  private assertCounts(coins: number, fragments: Fragments) {
    if (!isCount(coins) || !Object.values(fragments).every(isCount)) {
      throw new Error('Wallet: quantias inteiras e não negativas')
    }
  }
}
