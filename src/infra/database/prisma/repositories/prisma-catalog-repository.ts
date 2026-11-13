import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Either, left, right } from '@/core/either'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { ResourceInUseError } from '@/core/errors/err/resource-in-use-error'
import {
  CatalogEntry,
  CatalogKind,
  CatalogRepository,
  GameCatalog,
} from '@/domain/catalog/applications/repositories/catalog-repository'
import { InvalidCatalogError } from '@/domain/catalog/errors/invalid-catalog-error'
import { catalogIntegrityError } from '@/domain/catalog/services/catalog-integrity'
import {
  Awakening,
  AwakeningMissionTemplate,
  AwakeningRequirement,
} from '@/domain/characters/entities/awakening'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { Passive } from '@/domain/characters/value-objects/passive'
import { TraitEffect } from '@/domain/characters/value-objects/trait-effect'
import { BattleField } from '@/domain/combat/entities/battle-field'
import {
  GearRequirement,
  GearTemplate,
} from '@/domain/gear/entities/gear-template'
import {
  BeastSkill,
  BeastTemplate,
} from '@/domain/beasts/entities/beast-template'
import {
  EventAttemptLimit,
  EventStage,
  EventTemplate,
} from '@/domain/events/entities/event-template'
import { EventModifier } from '@/domain/events/value-objects/event-modifier'
import { EventRequirement } from '@/domain/events/value-objects/event-requirement'
import { EventReward } from '@/domain/events/value-objects/event-reward'
import { Skill } from '@/domain/skills/entities/skill'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import { PrismaService } from '../prisma.service'
import { deleteCatalogRow, writeCatalogRow } from './prisma-catalog-writes'

/**
 * Conteúdo do banco que não passa pelo domínio. Na leitura é erro de dado (o banco só guarda o que já passou pelo
 * domínio); na escrita do admin, desfaz a mudança.
 */
class CatalogDataError extends Error {}

function unwrap<T>(result: Either<Error, T>, what: string): T {
  if (result.isLeft()) {
    throw new CatalogDataError(`${what}: ${result.value.message}`)
  }

  return result.value
}

const id = (value: string) => new UniqueEntityId(value)

/** O cliente normal ou o da transação (a escrita do admin relê o catálogo dentro dela). */
type Db = Prisma.TransactionClient

/**
 * Lê o catálogo inteiro uma vez e guarda em memória; a escrita do admin limpa a memória (rodar o seed de novo pede
 * reiniciar o servidor). Cada linha volta pelo `create` do domínio, que valida o conteúdo outra vez.
 */
@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  private cached: Promise<GameCatalog> | null = null

  constructor(private readonly prisma: PrismaService) {}

  load(): Promise<GameCatalog> {
    this.cached ??= this.read(this.prisma).catch((error: unknown) => {
      this.cached = null
      throw error
    })

    return this.cached
  }

  async save(entry: CatalogEntry): Promise<Either<InvalidCatalogError, void>> {
    return this.write((tx) => writeCatalogRow(tx, entry))
  }

  async delete(
    kind: CatalogKind,
    entryId: string
  ): Promise<Either<InvalidCatalogError | ResourceInUseError, void>> {
    try {
      return await this.write((tx) => deleteCatalogRow(tx, kind, entryId))
    } catch (error) {
      // chave estrangeira (onDelete: Restrict): personagem, skill aprendida ou traço de um jogador
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        return left(new ResourceInUseError(entryId, ['dado de jogador']))
      }
      throw error
    }
  }

  /**
   * Grava numa transação e relê o catálogo inteiro dentro dela: se um item deixou de passar pelo domínio (ex.: a build
   * de um NPC com a skill editada) ou o catálogo quebrou (`catalogIntegrityError`), desfaz tudo.
   */
  private async write(
    change: (tx: Db) => Promise<void>
  ): Promise<Either<InvalidCatalogError, void>> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          await change(tx)

          const error = catalogIntegrityError(await this.read(tx))
          if (error) throw new CatalogDataError(error)
        },
        { timeout: 30_000 }
      )
    } catch (error) {
      if (error instanceof CatalogDataError) {
        return left(new InvalidCatalogError(error.message))
      }
      // coluna única fora a `key` (ex.: dois despertares para a mesma variante, D151)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return left(
          new InvalidCatalogError(
            `valor repetido em ${String(error.meta?.target ?? 'campo único')}`
          )
        )
      }
      throw error
    } finally {
      this.cached = null
    }

    return right(undefined)
  }

  private async read(db: Db): Promise<GameCatalog> {
    const [
      variantRows,
      traitRows,
      templateRows,
      skillRows,
      fieldRows,
      npcRows,
      awakeningRows,
      gearRows,
      beastRows,
      eventRows,
    ] = await Promise.all([
      db.variant.findMany({ orderBy: { key: 'asc' } }),
      db.trait.findMany({ orderBy: { key: 'asc' } }),
      db.characterTemplate.findMany({
        include: { variants: true },
        orderBy: { key: 'asc' },
      }),
      db.skill.findMany({ orderBy: { key: 'asc' } }),
      db.battleField.findMany({
        include: { requiredTraits: true },
        orderBy: { key: 'asc' },
      }),
      db.npcSquad.findMany({
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
      db.awakening.findMany({ orderBy: { key: 'asc' } }),
      db.gearTemplate.findMany({ orderBy: { key: 'asc' } }),
      db.beastTemplate.findMany({ orderBy: { key: 'asc' } }),
      db.eventTemplate.findMany({ orderBy: { key: 'asc' } }),
    ])

    // despertadas dependem da base: as bases entram primeiro
    const variants = new Map<string, Variant>()
    const pending = [...variantRows]
    while (pending.length > 0) {
      const index = pending.findIndex(
        (v) => !v.awakensFromId || variants.has(v.awakensFromId)
      )
      if (index < 0) throw new CatalogDataError('variante despertada sem base')

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

    const awakenings = new Map<string, Awakening>()
    for (const row of awakeningRows) {
      awakenings.set(
        row.id,
        unwrap(
          Awakening.create(
            {
              key: row.key,
              name: row.name,
              description: row.description,
              variant: variants.get(row.variantId)!,
              requirements:
                row.requirements as unknown as AwakeningRequirement[],
              missions: row.missions as unknown as AwakeningMissionTemplate[],
            },
            id(row.id)
          ),
          `despertar ${row.key}`
        )
      )
    }

    const gearTemplates = new Map<string, GearTemplate>()
    for (const row of gearRows) {
      gearTemplates.set(
        row.id,
        unwrap(
          GearTemplate.create(
            {
              key: row.key,
              name: row.name,
              description: row.description,
              kind: row.kind,
              grade: row.grade,
              lineage: row.lineage as GearTemplate['lineage'],
              primaryStat: row.primaryStat,
              secondaryStat: row.secondaryStat,
              primaryPercent: row.primaryPercent,
              secondaryPercent: row.secondaryPercent,
              requirements: row.requirements as unknown as GearRequirement[],
              titles: row.titles as unknown as string[],
            },
            id(row.id)
          ),
          `equipamento ${row.key}`
        )
      )
    }

    const beastTemplates = new Map<string, BeastTemplate>()
    for (const row of beastRows) {
      beastTemplates.set(
        row.id,
        unwrap(
          BeastTemplate.create(
            {
              key: row.key,
              name: row.name,
              description: row.description,
              contract: row.contract,
              grade: row.grade,
              lineage: row.lineage as BeastTemplate['lineage'],
              skills: row.skills as unknown as BeastSkill[],
              requirements: row.requirements as unknown as GearRequirement[],
              titles: row.titles as unknown as string[],
            },
            id(row.id)
          ),
          `besta ${row.key}`
        )
      )
    }

    const events = new Map<string, EventTemplate>()
    for (const row of eventRows) {
      events.set(
        row.id,
        unwrap(
          EventTemplate.create(
            {
              key: row.key,
              name: row.name,
              description: row.description,
              kind: row.kind,
              announceAt: row.announceAt,
              startsAt: row.startsAt,
              endsAt: row.endsAt,
              requirements: row.requirements as unknown as EventRequirement[],
              attemptLimit:
                (row.attemptLimit as unknown as EventAttemptLimit | null) ??
                null,
              squadMode: row.squadMode,
              fieldKey: row.fieldKey,
              modifiers: row.modifiers as unknown as EventModifier[],
              stages: row.stages as unknown as EventStage[],
              completionRewards:
                row.completionRewards as unknown as EventReward[],
              participationRewards:
                row.participationRewards as unknown as EventReward[],
            },
            id(row.id)
          ),
          `evento ${row.key}`
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
              isStarter: row.isStarter,
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
      awakenings,
      gearTemplates,
      beastTemplates,
      events,
      version,
    }
  }
}
