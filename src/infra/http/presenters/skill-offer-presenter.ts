import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { SkillOffer } from '@/domain/characters/entities/skill-offer'
import { SkillPresenter } from './template-presenter'

/** Bloco de skills pendente: o personagem, o nível do bloco e as opções com os dados de cada skill. */
export class SkillOfferPresenter {
  static toHTTP(offer: SkillOffer, catalog: GameCatalog) {
    return {
      id: offer.id.toString(),
      characterId: offer.characterId.toString(),
      level: offer.level,
      /** `LEVEL_UP` (subida de nível) ou `AWAKENING` (recuperação ao despertar, D151). */
      source: offer.source,
      skills: offer.skillIds.flatMap((id) => {
        const skill = catalog.skills.get(id.toValue())
        return skill ? [SkillPresenter.toHTTP(skill)] : []
      }),
    }
  }
}
