import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Clock } from '@/core/gateways/clock'
import { SeededRng } from '@/core/rng/seeded-rng'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { templateKit } from '@/domain/catalog/services/template-skills'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Character } from '@/domain/characters/entities/character'
import { InvalidCharacterError } from '@/domain/characters/errors/invalid-character-error'
import { SeedGenerator } from '@/domain/combat/applications/gateways/seed-generator'
import { Chest } from '../../entities/chest'
import { Wallet } from '../../entities/wallet'
import { WalletReason } from '../../enums/wallet-reason'
import { InvalidEconomyActionError } from '../../errors/invalid-economy-action-error'
import { drawChest } from '../../services/chest-draw'
import { ChestsRepository } from '../repositories/chests-repository'
import { WalletsRepository } from '../repositories/wallets-repository'
import { creditWallet } from '../services/credit-wallet'

interface OpenChestUseCaseRequest {
  chestId: string
  accountId: string
}

type OpenChestUseCaseResponse = Either<
  | ResourceNotFoundError
  | NotAllowedError
  | InvalidEconomyActionError
  | InvalidCharacterError,
  { chest: Chest; character: Character | null; wallet: Wallet }
>

/**
 * Abre um baú da conta (D150): sorteia 1 item e os fragmentos (`drawChest`). Personagem novo entra no Elenco como no
 * cadastro (nível 0, kit básico, traço de família); repetido ou raridade sem personagem vira moeda.
 */
export class OpenChestUseCase {
  constructor(
    private chestsRepository: ChestsRepository,
    private walletsRepository: WalletsRepository,
    private charactersRepository: CharactersRepository,
    private accountsRepository: AccountsRepository,
    private catalogRepository: CatalogRepository,
    private seedGenerator: SeedGenerator,
    private clock: Clock
  ) {}

  async execute({
    chestId,
    accountId,
  }: OpenChestUseCaseRequest): Promise<OpenChestUseCaseResponse> {
    const chest = await this.chestsRepository.findById(chestId)
    if (!chest) return left(new ResourceNotFoundError('baú'))
    if (chest.accountId.toString() !== accountId) {
      return left(new NotAllowedError())
    }
    if (chest.isOpened) {
      return left(new InvalidEconomyActionError('o baú já foi aberto'))
    }

    const [catalog, owned, account] = await Promise.all([
      this.catalogRepository.load(),
      this.charactersRepository.findManyByAccountId(accountId),
      this.accountsRepository.findById(accountId),
    ])
    if (!account) return left(new ResourceNotFoundError('conta'))

    const draw = drawChest({
      tier: chest.tier,
      templates: catalog.templates.values(),
      ownedTemplateIds: new Set(owned.map((c) => c.templateId.toValue())),
      rng: new SeededRng(this.seedGenerator.next()),
    })

    let character: Character | null = null
    if (draw.template) {
      const created = Character.create({
        account,
        template: draw.template,
        familyTrait: draw.template.familyTraitId
          ? catalog.traits.get(draw.template.familyTraitId.toValue())
          : null,
        kitSkills: templateKit(catalog, draw.template),
      })
      if (created.isLeft()) return left(created.value)
      character = created.value
    }

    const opened = chest.open(
      {
        rarity: draw.rarity,
        character:
          character && draw.template
            ? {
                templateKey: draw.template.key,
                characterId: character.id.toString(),
              }
            : null,
        convertedTemplateKey: draw.convertedTemplate?.key ?? null,
        coins: draw.coins,
        fragments: draw.fragments,
      },
      this.clock.now()
    )
    if (opened.isLeft()) return left(opened.value)

    // aberto duas vezes ao mesmo tempo: só a primeira entrega o conteúdo
    if (!(await this.chestsRepository.saveOpened(chest))) {
      return left(new InvalidEconomyActionError('o baú já foi aberto'))
    }

    if (character) await this.charactersRepository.createMany([character])
    const wallet = await creditWallet(this.walletsRepository, accountId, {
      reason: WalletReason.CHEST_OPEN,
      refId: chest.id.toString(),
      coins: draw.coins,
      fragments: draw.fragments,
    })

    return right({ chest, character, wallet })
  }
}
