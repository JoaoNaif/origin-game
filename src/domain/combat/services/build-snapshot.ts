import { Either, left, right } from '@/core/either'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Account } from '@/domain/accounts/entities/account'
import { Character } from '@/domain/characters/entities/character'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { Lineage } from '@/domain/characters/enums/lineage'
import { BUILD_SIZE } from '@/domain/characters/services/basic-kit'
import { defaultFreePoints } from '@/domain/characters/services/free-points'
import { Skill } from '@/domain/skills/entities/skill'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import { Squad, SQUAD_SIZE } from '@/domain/squads/entities/squad'
import { BattleSide } from '../enums/battle-enums'
import { BuildSnapshotError } from '../errors/build-snapshot-error'
import { BattleField } from '../entities/battle-field'
import {
  BattleSnapshot,
  SnapshotField,
  SnapshotFieldSetup,
  SnapshotSide,
  SnapshotSkill,
  SnapshotUnit,
} from '../value-objects/battle-snapshot'

/**
 * Catálogo já carregado (modelos, variantes, skills e traços), indexado pelo id. Quem chama (caso de uso) busca
 * no repositório; o domínio só monta a foto.
 */
export interface SnapshotCatalog {
  templates: ReadonlyMap<string, CharacterTemplate>
  variants: ReadonlyMap<string, Variant>
  skills: ReadonlyMap<string, Skill>
  traits: ReadonlyMap<string, Trait>
}

export interface PlayerSideInput {
  account: Account
  squad: Squad
  /** Os personagens do squad, já carregados com skills e traços. */
  characters: readonly Character[]
  catalog: SnapshotCatalog
}

export interface NpcSideInput {
  npcSquad: NpcSquad
  catalog: SnapshotCatalog
}

export function unitRef(side: BattleSide, index: number) {
  return `${side}:${index}`
}

/** Skill como valor (o catálogo pode mudar depois; o replay precisa do original). */
export function toSnapshotSkill(
  skill: Skill,
  isEnhanced: boolean
): SnapshotSkill {
  return {
    key: skill.key,
    name: skill.name,
    lineage: skill.lineage,
    isAwakened: skill.isAwakened,
    isEnhanced,
    tier: skill.tier,
    target: skill.target,
    range: skill.range,
    area: skill.area,
    cooldown: skill.cooldown,
    desgastePercent: skill.desgastePercent,
    baseHitChance: skill.baseHitChance,
    effects: [...skill.effects],
  }
}

/**
 * Modificadores de custo por linhagem vindos dos traços (LINEAGE_COST_MODIFIER). Traço ligado a uma variante (família)
 * vale só para a linhagem dela; sem variante, vale para todas as linhagens da unidade.
 */
function lineageCostPercent(
  traits: readonly Trait[],
  lineages: readonly Lineage[],
  catalog: SnapshotCatalog
): Partial<Record<Lineage, number>> {
  const result: Partial<Record<Lineage, number>> = {}

  for (const trait of traits) {
    const variantLineage = trait.variantId
      ? catalog.variants.get(trait.variantId.toValue())?.lineage
      : undefined
    const targets = variantLineage ? [variantLineage] : lineages

    for (const effect of trait.effects) {
      if (effect.type !== 'LINEAGE_COST_MODIFIER') continue
      for (const lineage of new Set(targets)) {
        result[lineage] = (result[lineage] ?? 0) + effect.percent
      }
    }
  }

  return result
}

/** Campo de batalha como valor, com os traços pedidos pela `key` (D98). */
export function toSnapshotField(
  field: BattleField,
  traits: ReadonlyMap<string, Trait>
): Either<BuildSnapshotError, SnapshotField> {
  const requiredTraitKeys: string[] = []

  for (const traitId of field.requiredTraitIds) {
    const trait = traits.get(traitId.toValue())
    if (!trait) {
      return left(
        new BuildSnapshotError(`traço ${traitId} do campo não carregado`)
      )
    }
    requiredTraitKeys.push(trait.key)
  }

  return right({
    key: field.key,
    name: field.name,
    requiredTraitKeys,
    primaryStat: field.primaryStat,
    secondaryStat: field.secondaryStat,
    primaryPercent: field.primaryPercent,
    secondaryPercent: field.secondaryPercent,
  })
}

/** Linhagens das variantes do modelo, principal primeiro (vazio = sem variante). */
function templateLineages(
  template: CharacterTemplate,
  catalog: SnapshotCatalog
): Either<BuildSnapshotError, Lineage[]> {
  const ordered = [...template.variants].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary)
  )
  const lineages: Lineage[] = []

  for (const { variantId } of ordered) {
    const variant = catalog.variants.get(variantId.toValue())
    if (!variant) {
      return left(new BuildSnapshotError(`variante ${variantId} não carregada`))
    }
    lineages.push(variant.lineage)
  }

  return right(lineages)
}

function findTemplate(
  id: UniqueEntityId,
  catalog: SnapshotCatalog
): Either<BuildSnapshotError, CharacterTemplate> {
  const template = catalog.templates.get(id.toValue())

  return template
    ? right(template)
    : left(new BuildSnapshotError(`modelo ${id} não carregado`))
}

/** Lado do jogador: o squad escolhido, com os personagens dele como estão agora. */
export function buildPlayerSide(
  input: PlayerSideInput
): Either<BuildSnapshotError, SnapshotSide> {
  const { account, squad, characters, catalog } = input

  if (!squad.accountId.equals(account.id)) {
    return left(new BuildSnapshotError('o squad não é desta conta'))
  }

  if (squad.members.length !== SQUAD_SIZE) {
    return left(
      new BuildSnapshotError(
        `squad incompleto (${squad.members.length} de ${SQUAD_SIZE}): complete a formação`
      )
    )
  }

  const units: SnapshotUnit[] = []

  for (const [index, member] of squad.members.entries()) {
    const character = characters.find((c) => c.id.equals(member.characterId))
    if (!character) {
      return left(
        new BuildSnapshotError(`personagem ${member.characterId} não carregado`)
      )
    }

    const template = findTemplate(character.templateId, catalog)
    if (template.isLeft()) return left(template.value)

    const lineages = templateLineages(template.value, catalog)
    if (lineages.isLeft()) return left(lineages.value)

    const build = character.build
    if (build.length !== BUILD_SIZE) {
      return left(
        new BuildSnapshotError(
          `${template.value.name} sem build completa de ${BUILD_SIZE} skills`
        )
      )
    }

    units.push({
      ref: unitRef(BattleSide.PLAYER, index),
      name: template.value.name,
      templateKey: template.value.key,
      characterClass: template.value.characterClass,
      lineages: lineages.value,
      level: character.level,
      profile: { ...template.value.stats },
      freePoints: { ...character.freePoints },
      traitEffects: character.traits.flatMap((t) => [...t.effects]),
      traitKeys: character.traits.map((t) => t.key),
      lineageCostPercent: lineageCostPercent(
        character.traits,
        lineages.value,
        catalog
      ),
      passive: template.value.passive,
      skills: build.map((s) => toSnapshotSkill(s.skill, s.isEnhanced)),
      row: member.row,
      column: member.column,
    })
  }

  return right({ side: BattleSide.PLAYER, name: account.displayName, units })
}

/** Lado da máquina: o squad do catálogo, com a distribuição padrão de pontos livres (D103). */
export function buildNpcSide(
  input: NpcSideInput
): Either<BuildSnapshotError, SnapshotSide> {
  const { npcSquad, catalog } = input
  const units: SnapshotUnit[] = []

  for (const [index, member] of npcSquad.members.entries()) {
    const template = findTemplate(member.templateId, catalog)
    if (template.isLeft()) return left(template.value)

    const lineages = templateLineages(template.value, catalog)
    if (lineages.isLeft()) return left(lineages.value)

    const skills: SnapshotSkill[] = []
    for (const skillId of member.skillIds) {
      const skill = catalog.skills.get(skillId.toValue())
      if (!skill) {
        return left(new BuildSnapshotError(`skill ${skillId} não carregada`))
      }
      skills.push(toSnapshotSkill(skill, false))
    }

    const traits: Trait[] = []
    for (const traitId of member.traitIds) {
      const trait = catalog.traits.get(traitId.toValue())
      if (!trait) {
        return left(new BuildSnapshotError(`traço ${traitId} não carregado`))
      }
      traits.push(trait)
    }

    units.push({
      ref: unitRef(BattleSide.OPPONENT, index),
      name: template.value.name,
      templateKey: template.value.key,
      characterClass: template.value.characterClass,
      lineages: lineages.value,
      level: member.level,
      profile: { ...template.value.stats },
      freePoints: defaultFreePoints(template.value.stats, member.level),
      traitEffects: traits.flatMap((t) => [...t.effects]),
      traitKeys: traits.map((t) => t.key),
      lineageCostPercent: lineageCostPercent(traits, lineages.value, catalog),
      passive: template.value.passive,
      skills,
      row: member.row,
      column: member.column,
    })
  }

  return right({ side: BattleSide.OPPONENT, name: npcSquad.name, units })
}

/** Foto completa de uma batalha PvE: o squad do jogador contra o squad da máquina. */
export function buildPveSnapshot(
  player: PlayerSideInput,
  opponent: NpcSideInput,
  field: SnapshotFieldSetup = { initial: null, catalog: [] }
): Either<BuildSnapshotError, BattleSnapshot> {
  const playerSide = buildPlayerSide(player)
  if (playerSide.isLeft()) return left(playerSide.value)

  const opponentSide = buildNpcSide(opponent)
  if (opponentSide.isLeft()) return left(opponentSide.value)

  return right({
    player: playerSide.value,
    opponent: opponentSide.value,
    field,
  })
}
