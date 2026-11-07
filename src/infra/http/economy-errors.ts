import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { WalletConflictError } from '@/domain/economy/errors/wallet-conflict-error'

/**
 * Erro da economia → HTTP: saldo insuficiente, limite e operação fora da regra são 400; a carteira mudada por outra
 * requisição no meio (nada foi gasto) é 409.
 */
export function economyHttpError(error: Error) {
  switch (error.constructor) {
    case ResourceNotFoundError:
      return new NotFoundException(error.message)
    case NotAllowedError:
      return new ForbiddenException(error.message)
    case WalletConflictError:
      return new ConflictException(error.message)
    default:
      return new BadRequestException(error.message)
  }
}
