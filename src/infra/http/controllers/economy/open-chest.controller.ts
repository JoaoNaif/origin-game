import { Controller, HttpCode, Param, Post } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { OpenChestUseCase } from '@/domain/economy/applications/use-cases/open-chest'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { CharacterPresenter } from '../../presenters/character-presenter'
import { ChestPresenter } from '../../presenters/chest-presenter'
import { WalletPresenter } from '../../presenters/wallet-presenter'
import { uuidParamSchema } from '../../schemas/common'

/**
 * POST /chests/:id/open — abre um baú da conta (D150): 1 item da raridade sorteada (personagem novo, ou moeda se for
 * repetido) e os fragmentos do nível do baú. `character` vem preenchido quando entrou um personagem no Elenco.
 */
@Controller('chests')
export class OpenChestController {
  constructor(
    private openChest: OpenChestUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Post(':id/open')
  @HttpCode(200)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) chestId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.openChest.execute({
      chestId,
      accountId: user.sub,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    const { chest, character, wallet } = result.value
    const catalog = await this.catalogRepository.load()

    return {
      chest: ChestPresenter.toHTTP(chest),
      character: character
        ? CharacterPresenter.toHTTP(character, catalog)
        : null,
      wallet: WalletPresenter.toHTTP(wallet),
    }
  }
}
