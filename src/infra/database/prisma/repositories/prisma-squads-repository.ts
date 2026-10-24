import { Injectable } from '@nestjs/common'
import { SquadsRepository } from '@/domain/squads/applications/repositories/squads-repository'
import { Squad } from '@/domain/squads/entities/squad'
import { PrismaSquadMapper, squadInclude } from '../mappers/prisma-squad-mapper'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaSquadsRepository implements SquadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Squad | null> {
    const row = await this.prisma.squad.findUnique({
      where: { id },
      include: squadInclude,
    })

    return row ? PrismaSquadMapper.toDomain(row) : null
  }

  async findManyByAccountId(accountId: string): Promise<Squad[]> {
    const rows = await this.prisma.squad.findMany({
      where: { accountId },
      include: squadInclude,
      orderBy: { createdAt: 'asc' },
    })

    return rows.map(PrismaSquadMapper.toDomain)
  }

  async create(squad: Squad): Promise<void> {
    await this.prisma.squad.create({
      data: {
        id: squad.id.toString(),
        accountId: squad.accountId.toString(),
        name: squad.name,
        members: { create: PrismaSquadMapper.toPrismaMembers(squad) },
      },
    })
  }

  /** A formação é trocada inteira (D48): apaga os membros e grava os novos. */
  async save(squad: Squad): Promise<void> {
    const id = squad.id.toString()

    await this.prisma.$transaction([
      this.prisma.squadMember.deleteMany({ where: { squadId: id } }),
      this.prisma.squad.update({
        where: { id },
        data: {
          name: squad.name,
          members: { create: PrismaSquadMapper.toPrismaMembers(squad) },
        },
      }),
    ])
  }

  async delete(squad: Squad): Promise<void> {
    await this.prisma.squad.delete({ where: { id: squad.id.toString() } })
  }
}
