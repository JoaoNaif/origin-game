import { Prisma } from '@prisma/client'
import {
  CatalogEntry,
  CatalogKind,
} from '@/domain/catalog/applications/repositories/catalog-repository'

/** Efeitos e passiva são JSON validado no domínio. */
const json = (value: unknown) => value as Prisma.InputJsonValue

type Db = Prisma.TransactionClient

/**
 * Grava um item do catálogo pelo id (cria ou troca), no mesmo formato do `seed-database.ts`. As ligações (variantes do
 * modelo, traços do campo, membros do NPC) são recriadas. Quem chama roda dentro de uma transação.
 */
export async function writeCatalogRow(
  tx: Db,
  { kind, entity }: CatalogEntry
): Promise<void> {
  const id = entity.id.toString()

  switch (kind) {
    case 'VARIANT': {
      const data = {
        key: entity.key,
        name: entity.name,
        lineage: entity.lineage,
        description: entity.description,
        awakensFromId: entity.awakensFromId?.toString() ?? null,
      }
      await tx.variant.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      })
      return
    }

    case 'TRAIT': {
      const data = {
        key: entity.key,
        name: entity.name,
        description: entity.description,
        category: entity.category,
        source: entity.source,
        variantId: entity.variantId?.toString() ?? null,
        effects: json(entity.effects),
      }
      await tx.trait.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      })
      return
    }

    case 'TEMPLATE': {
      const { stats } = entity
      const data = {
        key: entity.key,
        name: entity.name,
        description: entity.description,
        characterClass: entity.characterClass,
        rarity: entity.rarity,
        initialDanger: entity.initialDanger,
        exclusivity: entity.exclusivity,
        familyTraitId: entity.familyTraitId?.toString() ?? null,
        hp: stats.HP,
        attack: stats.ATTACK,
        defense: stats.DEFENSE,
        speed: stats.SPEED,
        precision: stats.PRECISION,
        evasion: stats.EVASION,
        will: stats.WILL,
        passive: json(entity.passive),
      }
      await tx.characterTemplate.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      })
      await tx.characterTemplateVariant.deleteMany({
        where: { templateId: id },
      })
      await tx.characterTemplateVariant.createMany({
        data: entity.variants.map((v) => ({
          templateId: id,
          variantId: v.variantId.toString(),
          isPrimary: v.isPrimary,
        })),
      })
      return
    }

    case 'SKILL': {
      const data = {
        key: entity.key,
        name: entity.name,
        description: entity.description,
        variantId: entity.variantId?.toString() ?? null,
        tier: entity.tier,
        target: entity.target,
        range: entity.range,
        area: entity.area,
        cooldown: entity.cooldown,
        desgastePercent: entity.desgastePercent,
        baseHitChance: entity.baseHitChance,
        minLevel: entity.minLevel,
        kitClass: entity.kitClass,
        kitSlot: entity.kitSlot,
        effects: json(entity.effects),
      }
      await tx.skill.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      })
      return
    }

    case 'FIELD': {
      const data = {
        key: entity.key,
        name: entity.name,
        description: entity.description,
        primaryStat: entity.primaryStat,
        secondaryStat: entity.secondaryStat,
        primaryPercent: entity.primaryPercent,
        secondaryPercent: entity.secondaryPercent,
      }
      await tx.battleField.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      })
      await tx.battleFieldTrait.deleteMany({ where: { fieldId: id } })
      await tx.battleFieldTrait.createMany({
        data: entity.requiredTraitIds.map((traitId) => ({
          fieldId: id,
          traitId: traitId.toString(),
        })),
      })
      return
    }

    case 'NPC_SQUAD': {
      const data = {
        key: entity.key,
        name: entity.name,
        description: entity.description,
        profile: entity.profile,
        difficulty: entity.difficulty,
      }
      await tx.npcSquad.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      })

      // membros recriados (cascata apaga skills e traços deles)
      await tx.npcSquadMember.deleteMany({ where: { npcSquadId: id } })
      for (const m of entity.members) {
        await tx.npcSquadMember.create({
          data: {
            npcSquadId: id,
            templateId: m.templateId.toString(),
            level: m.level,
            row: m.row,
            column: m.column,
            awakenedVariantId: m.awakenedVariantId?.toString() ?? null,
            skills: {
              create: m.skillIds.map((skillId, i) => ({
                skillId: skillId.toString(),
                buildSlot: i + 1,
              })),
            },
            traits: {
              create: m.traitIds.map((traitId) => ({
                traitId: traitId.toString(),
              })),
            },
          },
        })
      }
      return
    }
  }
}

/** Apaga o item. As ligações próprias saem em cascata; quem aponta para ele (Restrict) faz o banco recusar (P2003). */
export async function deleteCatalogRow(
  tx: Db,
  kind: CatalogKind,
  id: string
): Promise<void> {
  const where = { where: { id } }

  switch (kind) {
    case 'VARIANT':
      await tx.variant.delete(where)
      return
    case 'TRAIT':
      await tx.trait.delete(where)
      return
    case 'TEMPLATE':
      await tx.characterTemplate.delete(where)
      return
    case 'SKILL':
      await tx.skill.delete(where)
      return
    case 'FIELD':
      await tx.battleField.delete(where)
      return
    case 'NPC_SQUAD':
      await tx.npcSquad.delete(where)
      return
  }
}
