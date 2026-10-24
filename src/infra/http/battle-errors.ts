import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { InvalidBattleError } from '@/domain/combat/errors/invalid-battle-error'

/**
 * Erro da batalha → HTTP: jogada fora da regra (o motor recusou) é 400; batalha que não aceita a jogada agora (já
 * acabou, não é a vez do jogador) é 409.
 */
export function battleHttpError(error: Error) {
  switch (error.constructor) {
    case ResourceNotFoundError:
      return new NotFoundException(error.message)
    case NotAllowedError:
      return new ForbiddenException(error.message)
    case InvalidBattleError:
      return new ConflictException(error.message)
    default:
      return new BadRequestException(error.message)
  }
}
