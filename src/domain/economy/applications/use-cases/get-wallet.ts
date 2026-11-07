import { Either, right } from '@/core/either'
import { Wallet } from '../../entities/wallet'
import { WalletsRepository } from '../repositories/wallets-repository'

interface GetWalletUseCaseRequest {
  accountId: string
}

type GetWalletUseCaseResponse = Either<never, { wallet: Wallet }>

/** A carteira da conta logada: moeda e os 7 tipos de fragmento (D100, D104). */
export class GetWalletUseCase {
  constructor(private walletsRepository: WalletsRepository) {}

  async execute({
    accountId,
  }: GetWalletUseCaseRequest): Promise<GetWalletUseCaseResponse> {
    const wallet = await this.walletsRepository.findByAccountId(accountId)

    return right({ wallet })
  }
}
