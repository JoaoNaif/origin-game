import { Rng } from '@/core/rng/rng'
import { AiDifficulty, NPC_LEVEL_RANGE } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { BattleSide } from '@/domain/combat/enums/battle-enums'
import { buildNpcSide } from '@/domain/combat/services/build-snapshot'
import {
  BattleSnapshot,
  SnapshotFieldSetup,
  SnapshotSide,
} from '@/domain/combat/value-objects/battle-snapshot'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import { GridPosition } from '@/domain/squads/value-objects/grid-position'
import { SeedContent } from '../../prisma/seed/content'
import { npcBuild } from '../../prisma/seed/content/npc-squads'

export interface DuelMember extends GridPosition {
  /** `key` do modelo no seed. */
  key: string
}

/** Quem vai na frente numa formação automática: tanques, depois corpo a corpo, depois quem bate de longe. */
const FRONTNESS: Record<CharacterClass, number> = {
  GUARDIAN: 0,
  VANGUARD: 0,
  EXECUTOR: 1,
  TACTICIAN: 2,
  CONTROLLER: 2,
  SUPPORT: 2,
  MARKSMAN: 2,
  ARTILLERY: 2,
}

/** Células da formação automática: 2 na frente (coluna 0) e 2 atrás (coluna 1). */
const CELLS: GridPosition[] = [
  { row: 0, column: 0 },
  { row: 1, column: 0 },
  { row: 0, column: 1 },
  { row: 1, column: 1 },
]

function difficultyFor(level: number): AiDifficulty {
  return (Object.keys(NPC_LEVEL_RANGE) as AiDifficulty[]).find(
    (d) => level >= NPC_LEVEL_RANGE[d].min && level <= NPC_LEVEL_RANGE[d].max
  )!
}

/** Formação automática para 4 modelos do seed (tanques na frente). */
export function autoFormation(
  content: SeedContent,
  keys: readonly string[]
): DuelMember[] {
  const classOf = (key: string) =>
    content.characters.find((c) => c.spec.key === key)!.template.characterClass

  return [...keys]
    .sort((a, b) => FRONTNESS[classOf(a)] - FRONTNESS[classOf(b)])
    .map((key, i) => ({ key, ...CELLS[i] }))
}

/** 4 modelos distintos sorteados do seed. */
export function randomSquadKeys(content: SeedContent, rng: Rng): string[] {
  const pool = content.characters.map((c) => c.spec.key)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, 4)
}

function side(
  content: SeedContent,
  members: readonly DuelMember[],
  level: number,
  battleSide: BattleSide
): SnapshotSide {
  const npcSquad = NpcSquad.create({
    key: `duel-${battleSide}`,
    name: battleSide === BattleSide.PLAYER ? 'Lado A' : 'Lado B',
    profile: AiProfile.BALANCED,
    difficulty: difficultyFor(level),
    members: members.map(({ key, row, column }) => {
      const character = content.characters.find((c) => c.spec.key === key)!
      const family = character.spec.familyTrait
      return {
        template: character.template,
        level,
        row,
        column,
        skills: npcBuild(character, level),
        traits: [
          ...(family ? [content.traits.get(family)!] : []),
          content.traits.get(character.spec.npcTrait)!,
        ],
      }
    }),
  })
  if (npcSquad.isLeft()) throw npcSquad.value

  const built = buildNpcSide({
    npcSquad: npcSquad.value,
    catalog: content.catalog,
  })
  if (built.isLeft()) throw built.value

  return battleSide === BattleSide.OPPONENT
    ? built.value
    : {
        ...built.value,
        side: BattleSide.PLAYER,
        units: built.value.units.map((u) => ({
          ...u,
          ref: u.ref.replace(BattleSide.OPPONENT, BattleSide.PLAYER),
        })),
      }
}

/** Batalha entre duas squads quaisquer do seed, no mesmo nível (balanceamento, `engine.md` 3.15). */
export function makeDuelSnapshot(
  content: SeedContent,
  player: readonly DuelMember[],
  opponent: readonly DuelMember[],
  level: number,
  field: SnapshotFieldSetup = { initial: null, catalog: [] }
): BattleSnapshot {
  return {
    player: side(content, player, level, BattleSide.PLAYER),
    opponent: side(content, opponent, level, BattleSide.OPPONENT),
    field,
  }
}
