import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { SeededRng } from '@/core/rng/seeded-rng'
import { SeedGenerator } from '@/domain/combat/applications/gateways/seed-generator'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import {
  ENHANCEMENT_BASE_CHANCE,
  ENHANCEMENT_COST,
} from '@/domain/economy/economy-values'
import { Wallet } from '@/domain/economy/entities/wallet'
import { WalletReason } from '@/domain/economy/enums/wallet-reason'
import { InsufficientFundsError } from '@/domain/economy/errors/insufficient-funds-error'
import { WalletConflictError } from '@/domain/economy/errors/wallet-conflict-error'
import { Character } from '../../entities/character'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { CharactersRepository } from '../repositories/characters-repository'
import { findOwnedCharacter } from '../services/owned-character'

interface EnhanceSkillUseCaseRequest {
  characterId: string
  accountId: string
  skillKey: string
}

type EnhanceSkillUseCaseResponse = Either<
  | ResourceNotFoundError
  | NotAllowedError
  | InvalidCharacterError
  | InsufficientFundsError
  | WalletConflictError,
  {
    /** A tentativa deu certo: a skill ficou aprimorada (+15% de Poder ou de efeito). */
    success: boolean
    chance: number
    character: Character
    wallet: Wallet
  }
>

/**
 * Tentativa de aprimorar uma skill aprendida (D80, D100): paga moeda + fragmentos da linhagem dela (Neutro na skill
 * none) e tem 25% de chance, fixa, sem pity. Na falha perde só o custo. Um aprimoramento por skill. Os títulos que
 * aumentam a chance entram com os títulos.
 */
export class EnhanceSkillUseCase {
  constructor(
    private charactersRepository: CharactersRepository,
    private walletsRepository: WalletsRepository,
    private seedGenerator: SeedGenerator
  ) {}

  async execute({
    characterId,
    accountId,
    skillKey,
  }: EnhanceSkillUseCaseRequest): Promise<EnhanceSkillUseCaseResponse> {
    const found = await findOwnedCharacter(
      this.charactersRepository,
      characterId,
      accountId
    )
    if (found.isLeft()) return left(found.value)

    const character = found.value
    const learned = character.skills.find((s) => s.skill.key === skillKey)
    if (!learned) {
      return left(new InvalidCharacterError('skill não aprendida'))
    }
    if (learned.isEnhanced) {
      return left(new InvalidCharacterError('um aprimoramento só por skill'))
    }

    const cost = ENHANCEMENT_COST[learned.skill.tier]
    const wallet = await this.walletsRepository.findByAccountId(accountId)
    const spent = wallet.spend({
      reason: WalletReason.SKILL_ENHANCEMENT,
      refId: character.id.toString(),
      coins: cost.coins,
      fragments: { [learned.skill.lineage]: cost.fragments },
    })
    if (spent.isLeft()) return left(spent.value)

    // paga antes de sortear: no conflito nada foi gasto nem sorteado
    if (!(await this.walletsRepository.save(wallet))) {
      return left(new WalletConflictError())
    }

    const chance = ENHANCEMENT_BASE_CHANCE
    const success = new SeededRng(this.seedGenerator.next()).chance(chance)
    if (success) {
      const enhanced = character.enhanceSkill(learned.skill.id)
      if (enhanced.isLeft()) return left(enhanced.value)
      await this.charactersRepository.save(character)
    }

    return right({ success, chance, character, wallet })
  }
}
