import { Injectable } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Character } from '@/domain/characters/entities/character'
import {
  characterInclude,
  PrismaCharacterMapper,
} from '../mappers/prisma-character-mapper'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaCharactersRepository implements CharactersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogRepository: CatalogRepository
  ) {}

  async findById(id: string): Promise<Character | null> {
    const [row, catalog] = await Promise.all([
      this.prisma.character.findUnique({
        where: { id },
        include: characterInclude,
      }),
      this.catalogRepository.load(),
    ])

    return row ? PrismaCharacterMapper.toDomain(row, catalog) : null
  }

  async findManyByAccountId(accountId: string): Promise<Character[]> {
    const [rows, catalog] = await Promise.all([
      this.prisma.character.findMany({
        where: { accountId },
        include: characterInclude,
        orderBy: { createdAt: 'asc' },
      }),
      this.catalogRepository.load(),
    ])

    return rows.map((row) => PrismaCharacterMapper.toDomain(row, catalog))
  }

  async findManyByIds(ids: string[]): Promise<Character[]> {
    const [rows, catalog] = await Promise.all([
      this.prisma.character.findMany({
        where: { id: { in: ids } },
        include: characterInclude,
      }),
      this.catalogRepository.load(),
    ])

    return rows.map((row) => PrismaCharacterMapper.toDomain(row, catalog))
  }

  async createMany(characters: Character[]): Promise<void> {
    await this.prisma.$transaction(
      characters.map((character) =>
        this.prisma.character.create({
          data: {
            ...PrismaCharacterMapper.toPrisma(character),
            traits: {
              create: character.traits.map((t) => ({
                traitId: t.id.toString(),
              })),
            },
            skills: {
              create: character.skills.map((s) => ({
                skillId: s.skill.id.toString(),
                source: s.source,
                isEnhanced: s.isEnhanced,
                buildSlot: s.buildSlot,
              })),
            },
          },
        })
      )
    )
  }

  /** Atualiza a linha e acerta as ligações (mantém a data de quem já estava). */
  async save(character: Character): Promise<void> {
    const id = character.id.toString()
    const skillIds = character.skills.map((s) => s.skill.id.toString())
    const traitIds = character.traits.map((t) => t.id.toString())

    await this.prisma.$transaction([
      this.prisma.character.update({
        where: { id },
        data: PrismaCharacterMapper.toPrisma(character),
      }),
      // a build é única por personagem + slot: limpa os slots antes de regravar (senão uma troca de ordem colide)
      this.prisma.characterSkill.updateMany({
        where: { characterId: id },
        data: { buildSlot: null },
      }),
      this.prisma.characterSkill.deleteMany({
        where: { characterId: id, skillId: { notIn: skillIds } },
      }),
      ...character.skills.map((s) =>
        this.prisma.characterSkill.upsert({
          where: {
            characterId_skillId: {
              characterId: id,
              skillId: s.skill.id.toString(),
            },
          },
          create: {
            characterId: id,
            skillId: s.skill.id.toString(),
            source: s.source,
            isEnhanced: s.isEnhanced,
            buildSlot: s.buildSlot,
          },
          update: { isEnhanced: s.isEnhanced, buildSlot: s.buildSlot },
        })
      ),
      this.prisma.characterTrait.deleteMany({
        where: { characterId: id, traitId: { notIn: traitIds } },
      }),
      this.prisma.characterTrait.createMany({
        data: traitIds.map((traitId) => ({ characterId: id, traitId })),
        skipDuplicates: true,
      }),
    ])
  }
}
