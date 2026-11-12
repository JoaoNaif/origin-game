import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Beast } from '../../entities/beast'
import { InvalidBeastError } from '../../errors/invalid-beast-error'
import { BeastsRepository } from '../repositories/beasts-repository'
import { findOwnedBeast } from '../services/owned-beast'

interface MoveBeastSlotUseCaseRequest {
  accountId: string
  beastId: string
  slot: number
}

type MoveBeastSlotUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError | InvalidBeastError,
  { beast: Beast }
>

/** Troca o slot da build que a invocação ocupa (só fora da batalha; o contrato continua o mesmo). */
export class MoveBeastSlotUseCase {
  constructor(private beastsRepository: BeastsRepository) {}

  async execute({
    accountId,
    beastId,
    slot,
  }: MoveBeastSlotUseCaseRequest): Promise<MoveBeastSlotUseCaseResponse> {
    const beast = await findOwnedBeast(
      this.beastsRepository,
      beastId,
      accountId
    )
    if (beast.isLeft()) return left(beast.value)
    if (!beast.value.characterId) {
      return left(new InvalidBeastError('a besta ainda não tem contrato'))
    }

    const others = await this.beastsRepository.findManyByCharacterIds([
      beast.value.characterId.toString(),
    ])
    if (others.some((b) => !b.equals(beast.value) && b.slot === slot)) {
      return left(
        new InvalidBeastError(`o slot ${slot} já tem outra invocação`)
      )
    }

    const moved = beast.value.moveToSlot(slot)
    if (moved.isLeft()) return left(moved.value)

    await this.beastsRepository.save(beast.value)

    return right({ beast: beast.value })
  }
}
