import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { InvalidSkillOfferError } from '../errors/invalid-skill-offer-error'

export interface SkillOfferProps {
  characterId: UniqueEntityId
  /** O nível do bloco (5, 10, ..., 100). */
  level: number
  /** As opções sorteadas: 1 a 3 (menos de 3 quando o pool não dá, D135). */
  skillIds: UniqueEntityId[]
  chosenSkillId: UniqueEntityId | null
  createdAt: Date
  chosenAt: Date | null
}

/**
 * Bloco de skills a cada 5 níveis (D77, D135): até 3 sorteadas, o jogador escolhe 1 (não dá para recusar). Fica na
 * fila sem prazo até a escolha; as não escolhidas voltam ao pool.
 */
export class SkillOffer extends Entity<SkillOfferProps> {
  get characterId() {
    return this.props.characterId
  }

  get level() {
    return this.props.level
  }

  get skillIds(): readonly UniqueEntityId[] {
    return this.props.skillIds
  }

  get chosenSkillId() {
    return this.props.chosenSkillId
  }

  get createdAt() {
    return this.props.createdAt
  }

  get chosenAt() {
    return this.props.chosenAt
  }

  get isPending() {
    return this.props.chosenSkillId === null
  }

  /** Registra a escolha (o caso de uso ensina a skill ao personagem). */
  choose(
    skillId: UniqueEntityId,
    now: Date
  ): Either<InvalidSkillOfferError, void> {
    if (!this.isPending) {
      return left(new InvalidSkillOfferError('o bloco já foi escolhido'))
    }

    if (!this.props.skillIds.some((id) => id.equals(skillId))) {
      return left(new InvalidSkillOfferError('a skill não está no bloco'))
    }

    this.props.chosenSkillId = skillId
    this.props.chosenAt = now

    return right(undefined)
  }

  static create(
    props: Omit<SkillOfferProps, 'chosenSkillId' | 'chosenAt'> &
      Partial<Pick<SkillOfferProps, 'chosenSkillId' | 'chosenAt'>>,
    id?: UniqueEntityId
  ): Either<InvalidSkillOfferError, SkillOffer> {
    if (props.skillIds.length === 0) {
      return left(new InvalidSkillOfferError('bloco sem nenhuma skill'))
    }

    return right(
      new SkillOffer(
        {
          ...props,
          chosenSkillId: props.chosenSkillId ?? null,
          chosenAt: props.chosenAt ?? null,
        },
        id
      )
    )
  }
}
