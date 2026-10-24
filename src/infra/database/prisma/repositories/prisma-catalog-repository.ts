import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { Either } from '@/core/either'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import {
  CatalogRepository,
  GameCatalog,
} from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { Passive } from '@/domain/characters/value-objects/passive'
import { TraitEffect } from '@/domain/characters/value-objects/trait-effect'
import { BattleField } from '@/domain/combat/entities/battle-field'
import { Skill } from '@/domain/skills/entities/skill'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import { PrismaService } from '../prisma.service'

/** O banco só guarda conteúdo que já passou pelo domínio (seed): inválido aqui é erro de dado, não de regra. */
function unwrap<T>(result: Either<Error, T>, what: string): T {
  if (result.isLeft()) {
    throw new Error(`catálogo: ${what}: ${result.value.message}`)
  }

  return result.value
}

const id = (value: string) => new UniqueEntityId(value)

/**
 * Lê o catálogo inteiro uma vez e guarda em memória: no MVP o conteúdo só muda pelo seed, então rodar o seed de novo
 * pede reiniciar o servidor. Cada linha volta pelo `create` do domínio, que valida o conteúdo outra vez.
 */
@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  private cached: Promise<GameCatalog> | null = null

  constructor(private readonly prisma: PrismaService) {}

  load(): Promise<GameCatalog> {
    this.cached ??= this.read().catch((error: unknown) => {
      this.cached = null
      throw error
    })

    return this.cached
  }

  private async read(): Promise<GameCatalog> {
    const [
      variantRows,
      traitRows,
      templateRows,
      skillRows,
      fieldRows,
      npcRows,
    ] = await Promise.all([
      this.prisma.variant.findMany({ orderBy: { key: 'asc' } }),
      this.prisma.trait.findMany({ orderBy: { key: 'asc' } }),
      this.prisma.characterTemplate.findMany({
        include: { variants: true },
        orderBy: { key: 'asc' },
      }),
      this.prisma.skill.findMany({ orderBy: { key: 'asc' } }),
      this.prisma.battleField.findMany({
        include: { requiredTraits: true },
        orderBy: { key: 'asc' },
      }),
      this.prisma.npcSquad.findMany({
        include: {
          members: {
            include: {
              skills: { orderBy: { buildSlot: 'asc' } },
              traits: true,
            },
            orderBy: [{ row: 'asc' }, { column: 'asc' }],
          },
        },
        orderBy: { key: 'asc' },
      }),
    ])

    // despertadas dependem da base: as bases entram primeiro
    const variants = new Map<string, Variant>()
    const pending = [...variantRows]
    while (pending.length > 0) {
      const index = pending.findIndex(
        (v) => !v.awakensFromId || variants.has(v.awakensFromId)
      )
      if (index < 0) throw new Error('catálogo: variante despertada sem base')

      const [row] = pending.splice(index, 1)
      variants.set(
        row.id,
        unwrap(
          Variant.create(
            {
              key: row.key,
              name: row.name,
              lineage: row.lineage,
              description: row.description,
              awakensFrom: row.awakensFromId
                ? variants.get(row.awakensFromId)
                : null,
            },
            id(row.id)
          ),
          `variante ${row.key}`
        )
      )
    }

    const traits = new Map<string, Trait>()
    for (const row of traitRows) {
      traits.set(
        row.id,
        unwrap(
          Trait.create(
            {
              key: row.key,
              name: row.name,
              description: row.description,
              category: row.category,
              source: row.source,
              variantId: row.variantId ? id(row.variantId) : null,
              effects: row.effects as unknown as TraitEffect[],
            },
            id(row.id)
          ),
          `traço ${row.key}`
        )
      )
    }

    const templates = new Map<string, CharacterTemplate>()
    for (const row of templateRows) {
      templates.set(
        row.id,
        unwrap(
          CharacterTemplate.create(
            {
              key: row.key,
              name: row.name,
              description: row.description,
              characterClass: row.characterClass,
              rarity: row.rarity,
              initialDanger: row.initialDanger,
              exclusivity: row.exclusivity,
              variants: row.variants.map((v) => ({
                variant: variants.get(v.variantId)!,
                isPrimary: v.isPrimary,
              })),
              familyTrait: row.familyTraitId
                ? traits.get(row.familyTraitId)
                : null,
              stats: {
                HP: row.hp,
                ATTACK: row.attack,
                DEFENSE: row.defense,
                SPEED: row.speed,
                PRECISION: row.precision,
                EVASION: row.evasion,
                WILL: row.will,
              },
              passive: row.passive as unknown as Passive,
            },
            id(row.id)
          ),
          `modelo ${row.key}`
        )
      )
    }

    const skills = new Map<string, Skill>()
    for (const row of skillRows) {
      skills.set(
        row.id,
        unwrap(
          Skill.create(
            {
              key: row.key,
              name: row.name,
              description: row.description,
              variant: row.variantId ? variants.get(row.variantId) : null,
              tier: row.tier,
              target: row.target,
              range: row.range,
              area: row.area,
              cooldown: row.cooldown,
              desgastePercent: row.desgastePercent,
              baseHitChance: row.baseHitChance,
              minLevel: row.minLevel,
              kitClass: row.kitClass,
              kitSlot: row.kitSlot,
              effects: row.effects as unknown as SkillEffect[],
            },
            id(row.id)
          ),
          `skill ${row.key}`
        )
      )
    }

    const fields = fieldRows.map((row) =>
      unwrap(
        BattleField.create(
          {
            key: row.key,
            name: row.name,
            description: row.description,
            primaryStat: row.primaryStat,
            secondaryStat: row.secondaryStat,
            primaryPercent: row.primaryPercent,
            secondaryPercent: row.secondaryPercent,
            requiredTraits: row.requiredTraits.map((t) =>
              traits.get(t.traitId)!
            ),
          },
          id(row.id)
        ),
        `campo ${row.key}`
      )
    )

    const npcSquads = npcRows.map((row) =>
      unwrap(
        NpcSquad.create(
          {
            key: row.key,
            name: row.name,
            description: row.description,
            profile: row.profile,
            difficulty: row.difficulty,
            members: row.members.map((m) => ({
              template: templates.get(m.templateId)!,
              level: m.level,
              row: m.row,
              column: m.column,
              awakenedVariant: m.awakenedVariantId
                ? variants.get(m.awakenedVariantId)
                : null,
              skills: m.skills.map((s) => skills.get(s.skillId)!),
              traits: m.traits.map((t) => traits.get(t.traitId)!),
            })),
          },
          id(row.id)
        ),
        `squad de NPC ${row.key}`
      )
    )

    // muda quando o conteúdo muda (o replay só é garantido com o mesmo conteúdo); rodar o seed de novo com os
    // mesmos dados não muda, por isso as datas ficam de fora
    const version = createHash('sha256')
      .update(
        JSON.stringify(
          [variantRows, traitRows, templateRows, skillRows, fieldRows, npcRows],
          (key, value: unknown) =>
            key === 'createdAt' || key === 'updatedAt' ? undefined : value
        )
      )
      .digest('hex')
      .slice(0, 12)

    return {
      variants,
      traits,
      templates,
      skills,
      fields,
      npcSquads,
      version,
    }
  }
}
