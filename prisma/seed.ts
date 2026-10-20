import { Prisma, PrismaClient } from '@prisma/client'
import { loadSeedContent } from './seed/content'

/**
 * Seed do MVP (`npx prisma db seed`): grava o conteúdo de `prisma/seed/content` (variantes, traços, 12 personagens,
 * skills, 6 campos e 20 squads de NPC). Idempotente: atualiza pela `key` e recria as ligações.
 */
const prisma = new PrismaClient()

/** Efeitos e passiva são JSON validado no domínio. */
const json = (value: unknown) => value as Prisma.InputJsonValue

async function main() {
  const content = loadSeedContent()
  /** id do domínio → id do banco (numa segunda execução, a linha já existe com outro id). */
  const ids = new Map<string, string>()
  const db = (id: { toValue(): string }) => ids.get(id.toValue())!

  await prisma.$transaction(
    async (tx) => {
      for (const v of content.variants.values()) {
        const data = {
          name: v.name,
          lineage: v.lineage,
          description: v.description,
        }
        const row = await tx.variant.upsert({
          where: { key: v.key },
          create: { id: v.id.toValue(), key: v.key, ...data },
          update: data,
        })
        ids.set(v.id.toValue(), row.id)
      }

      for (const t of content.traits.values()) {
        const data = {
          name: t.name,
          description: t.description,
          category: t.category,
          source: t.source,
          variantId: t.variantId ? db(t.variantId) : null,
          effects: json(t.effects),
        }
        const row = await tx.trait.upsert({
          where: { key: t.key },
          create: { id: t.id.toValue(), key: t.key, ...data },
          update: data,
        })
        ids.set(t.id.toValue(), row.id)
      }

      for (const { template: c, skills } of content.characters) {
        const data = {
          name: c.name,
          description: c.description,
          characterClass: c.characterClass,
          rarity: c.rarity,
          initialDanger: c.initialDanger,
          exclusivity: c.exclusivity,
          familyTraitId: c.familyTraitId ? db(c.familyTraitId) : null,
          hp: c.stats.HP,
          attack: c.stats.ATTACK,
          defense: c.stats.DEFENSE,
          speed: c.stats.SPEED,
          precision: c.stats.PRECISION,
          evasion: c.stats.EVASION,
          will: c.stats.WILL,
          passive: json(c.passive),
        }
        const row = await tx.characterTemplate.upsert({
          where: { key: c.key },
          create: { id: c.id.toValue(), key: c.key, ...data },
          update: data,
        })
        ids.set(c.id.toValue(), row.id)

        await tx.characterTemplateVariant.deleteMany({
          where: { templateId: row.id },
        })
        await tx.characterTemplateVariant.createMany({
          data: c.variants.map((v) => ({
            templateId: row.id,
            variantId: db(v.variantId),
            isPrimary: v.isPrimary,
          })),
        })

        for (const s of skills) {
          const skillData = {
            name: s.name,
            description: s.description,
            variantId: s.variantId ? db(s.variantId) : null,
            tier: s.tier,
            target: s.target,
            range: s.range,
            area: s.area,
            cooldown: s.cooldown,
            desgastePercent: s.desgastePercent,
            baseHitChance: s.baseHitChance,
            minLevel: s.minLevel,
            kitClass: s.kitClass,
            kitSlot: s.kitSlot,
            effects: json(s.effects),
          }
          const skillRow = await tx.skill.upsert({
            where: { key: s.key },
            create: { id: s.id.toValue(), key: s.key, ...skillData },
            update: skillData,
          })
          ids.set(s.id.toValue(), skillRow.id)
        }
      }

      for (const f of content.fields) {
        const data = {
          name: f.name,
          description: f.description,
          primaryStat: f.primaryStat,
          secondaryStat: f.secondaryStat,
          primaryPercent: f.primaryPercent,
          secondaryPercent: f.secondaryPercent,
        }
        const row = await tx.battleField.upsert({
          where: { key: f.key },
          create: { id: f.id.toValue(), key: f.key, ...data },
          update: data,
        })
        await tx.battleFieldTrait.deleteMany({ where: { fieldId: row.id } })
        await tx.battleFieldTrait.createMany({
          data: f.requiredTraitIds.map((traitId) => ({
            fieldId: row.id,
            traitId: db(traitId),
          })),
        })
      }

      for (const squad of content.npcSquads) {
        const data = {
          name: squad.name,
          description: squad.description,
          profile: squad.profile,
          difficulty: squad.difficulty,
        }
        const row = await tx.npcSquad.upsert({
          where: { key: squad.key },
          create: { id: squad.id.toValue(), key: squad.key, ...data },
          update: data,
        })

        // membros recriados (cascata apaga skills e traços deles)
        await tx.npcSquadMember.deleteMany({ where: { npcSquadId: row.id } })
        for (const m of squad.members) {
          await tx.npcSquadMember.create({
            data: {
              npcSquadId: row.id,
              templateId: db(m.templateId),
              level: m.level,
              row: m.row,
              column: m.column,
              awakenedVariantId: m.awakenedVariantId
                ? db(m.awakenedVariantId)
                : null,
              skills: {
                create: m.skillIds.map((skillId, i) => ({
                  skillId: db(skillId),
                  buildSlot: i + 1,
                })),
              },
              traits: {
                create: m.traitIds.map((traitId) => ({ traitId: db(traitId) })),
              },
            },
          })
        }
      }
    },
    { timeout: 120_000 }
  )

  console.log(
    `seed: ${content.variants.size} variantes, ${content.traits.size} traços, ` +
      `${content.characters.length} personagens, ${content.catalog.skills.size} skills, ` +
      `${content.fields.length} campos, ${content.npcSquads.length} squads de NPC`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
