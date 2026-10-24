import { Injectable } from '@nestjs/common'
import { SkillOffersRepository } from '@/domain/characters/applications/repositories/skill-offers-repository'
import { SkillOffer } from '@/domain/characters/entities/skill-offer'
import { PrismaSkillOfferMapper } from '../mappers/prisma-skill-offer-mapper'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaSkillOffersRepository implements SkillOffersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SkillOffer | null> {
    const row = await this.prisma.skillOffer.findUnique({ where: { id } })

    return row ? PrismaSkillOfferMapper.toDomain(row) : null
  }

  async findPendingByCharacterIds(
    characterIds: string[]
  ): Promise<SkillOffer[]> {
    const rows = await this.prisma.skillOffer.findMany({
      where: { characterId: { in: characterIds }, chosenSkillId: null },
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
    })

    return rows.map(PrismaSkillOfferMapper.toDomain)
  }

  /** Bloco do mesmo nível que já existe fica como está (a chave é personagem + nível). */
  async createMany(offers: SkillOffer[]): Promise<void> {
    await this.prisma.skillOffer.createMany({
      data: offers.map(PrismaSkillOfferMapper.toPrisma),
      skipDuplicates: true,
    })
  }

  async save(offer: SkillOffer): Promise<void> {
    await this.prisma.skillOffer.update({
      where: { id: offer.id.toString() },
      data: {
        chosenSkillId: offer.chosenSkillId?.toString() ?? null,
        chosenAt: offer.chosenAt,
      },
    })
  }
}
