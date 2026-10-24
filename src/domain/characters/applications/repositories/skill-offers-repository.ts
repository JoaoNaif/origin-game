import { SkillOffer } from '../../entities/skill-offer'

/** Porta dos blocos de skill a cada 5 níveis (D77). */
export abstract class SkillOffersRepository {
  abstract findById(id: string): Promise<SkillOffer | null>
  /** Blocos ainda sem escolha, do mais antigo para o mais novo (a fila, D135). */
  abstract findPendingByCharacterIds(
    characterIds: string[]
  ): Promise<SkillOffer[]>
  abstract createMany(offers: SkillOffer[]): Promise<void>
  abstract save(offer: SkillOffer): Promise<void>
}
