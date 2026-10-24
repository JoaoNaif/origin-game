import { Prisma } from '@prisma/client'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '@/domain/characters/entities/character'

export const characterInclude = {
  traits: { orderBy: { acquiredAt: 'asc' } },
  skills: { orderBy: [{ acquiredAt: 'asc' }, { skillId: 'asc' }] },
} satisfies Prisma.CharacterInclude

export type PrismaCharacter = Prisma.CharacterGetPayload<{
  include: typeof characterInclude
}>

/** Traços e skills são do catálogo: o mapper recebe o catálogo carregado para ligar as entidades. */
export class PrismaCharacterMapper {
  static toDomain(raw: PrismaCharacter, catalog: GameCatalog): Character {
    return Character.restore(
      {
        accountId: new UniqueEntityId(raw.accountId),
        templateId: new UniqueEntityId(raw.templateId),
        level: raw.level,
        xp: raw.xp,
        danger: raw.danger,
        dangerPoints: raw.dangerPoints,
        awakenedVariantId: raw.awakenedVariantId
          ? new UniqueEntityId(raw.awakenedVariantId)
          : null,
        freePoints: {
          HP: raw.freeHp,
          ATTACK: raw.freeAttack,
          DEFENSE: raw.freeDefense,
          SPEED: raw.freeSpeed,
          PRECISION: raw.freePrecision,
          EVASION: raw.freeEvasion,
          WILL: raw.freeWill,
        },
        traits: raw.traits.map((t) => catalog.traits.get(t.traitId)!),
        skills: raw.skills.map((s) => ({
          skill: catalog.skills.get(s.skillId)!,
          source: s.source,
          isEnhanced: s.isEnhanced,
          buildSlot: s.buildSlot,
        })),
      },
      new UniqueEntityId(raw.id)
    )
  }

  /** A linha do personagem (sem traços e skills, que são ligações). */
  static toPrisma(character: Character): Prisma.CharacterUncheckedCreateInput {
    const free = character.freePoints

    return {
      id: character.id.toString(),
      accountId: character.accountId.toString(),
      templateId: character.templateId.toString(),
      level: character.level,
      xp: character.xp,
      danger: character.danger,
      dangerPoints: character.dangerPoints,
      awakenedVariantId: character.awakenedVariantId?.toString() ?? null,
      freeHp: free.HP,
      freeAttack: free.ATTACK,
      freeDefense: free.DEFENSE,
      freeSpeed: free.SPEED,
      freePrecision: free.PRECISION,
      freeEvasion: free.EVASION,
      freeWill: free.WILL,
    }
  }
}
