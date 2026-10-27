import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { ResourceAlreadyExistsError } from '@/core/errors/err/resource-already-exists-error'
import { ResourceInUseError } from '@/core/errors/err/resource-in-use-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'

/**
 * Erro do admin no catálogo → HTTP: item ou ligação (`key`) que não existe é 404; `key` repetida ou item em uso é 409;
 * regra do domínio (do item ou do catálogo inteiro) é 400.
 */
export function catalogHttpError(error: Error) {
  switch (error.constructor) {
    case ResourceNotFoundError:
      return new NotFoundException(error.message)
    case ResourceAlreadyExistsError:
    case ResourceInUseError:
      return new ConflictException(error.message)
    default:
      return new BadRequestException(error.message)
  }
}
