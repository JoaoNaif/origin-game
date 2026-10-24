import { PrismaClient } from '@prisma/client'

/** Abre um bloco de skills direto no banco (na vida real ele nasce ao subir de nível no fim da batalha). */
export async function openSkillOffer(
  prisma: PrismaClient,
  characterId: string,
  level: number,
  skillKeys: string[]
) {
  const skills = await prisma.skill.findMany({
    where: { key: { in: skillKeys } },
  })

  return prisma.skillOffer.create({
    data: { characterId, level, skillIds: skills.map((s) => s.id) },
  })
}
