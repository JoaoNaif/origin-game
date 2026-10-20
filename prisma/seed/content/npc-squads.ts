import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { Trait } from '@/domain/characters/entities/trait'
import { Skill } from '@/domain/skills/entities/skill'
import { SkillKitSlot } from '@/domain/skills/enums/skill-kit-slot'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import { GridPosition } from '@/domain/squads/value-objects/grid-position'
import { unwrap } from './catalog'
import { BuiltCharacter } from './characters'

/** Nível dos NPCs por dificuldade: o meio da faixa do D103. */
export const NPC_LEVEL: Record<AiDifficulty, number> = {
  BEGINNER: 18,
  INTERMEDIATE: 35,
  ADVANCED: 58,
  MASTER: 80,
  GRANDMASTER: 95,
}

/** Uma composição por perfil; as 4 juntas usam os 12 personagens. Coluna 0 = frente. */
const COMPOSITIONS: Record<
  AiProfile,
  { name: string; members: ({ key: string } & GridPosition)[] }
> = {
  AGGRESSIVE: {
    name: 'Trindade',
    members: [
      { key: 'kael-vaz', row: 0, column: 0 },
      { key: 'ecko-nocthar', row: 1, column: 0 },
      { key: 'derik-okoro', row: 2, column: 0 },
      { key: 'isis-maccarthy', row: 1, column: 2 },
    ],
  },
  CAUTIOUS: {
    name: 'Muralha da CORE',
    members: [
      { key: 'gaia', row: 0, column: 0 },
      { key: 'tank-valen', row: 1, column: 0 },
      { key: 'rolf-eidvar', row: 0, column: 1 },
      { key: 'kara', row: 1, column: 1 },
    ],
  },
  FINISHER: {
    name: 'Caçada',
    members: [
      { key: 'nox', row: 0, column: 0 },
      { key: 'tyir-ossvald', row: 1, column: 0 },
      { key: 'lucky', row: 0, column: 1 },
      { key: 'sunna', row: 1, column: 1 },
    ],
  },
  BALANCED: {
    name: 'CORE',
    members: [
      { key: 'gaia', row: 0, column: 0 },
      { key: 'kael-vaz', row: 1, column: 0 },
      { key: 'lucky', row: 0, column: 1 },
      { key: 'kara', row: 1, column: 1 },
    ],
  },
}

const TIER_ORDER: SkillTier[] = [
  SkillTier.FINAL,
  SkillTier.STRONG,
  SkillTier.REINFORCED,
  SkillTier.STANDARD,
  SkillTier.BASIC,
]

/**
 * Build do NPC no nível: a de função e a de assinatura do kit, mais as 2 de maior tipo já liberadas (Final, Forte,
 * Reforçada, Padrão, Básica).
 */
export function npcBuild(character: BuiltCharacter, level: number): Skill[] {
  const kept = character.skills.filter(
    (s) =>
      s.kitSlot === SkillKitSlot.ROLE || s.kitSlot === SkillKitSlot.SIGNATURE
  )
  const rest = character.skills
    .filter((s) => !kept.includes(s) && s.minLevel <= level)
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))

  return [...rest.slice(0, 2), ...kept]
}

/** 4 perfis × 5 dificuldades = 20 squads (`CLAUDE.md`, montagem do MVP). */
export function buildNpcSquads(
  characters: BuiltCharacter[],
  traits: Map<string, Trait>
): NpcSquad[] {
  const byKey = new Map(characters.map((c) => [c.spec.key, c]))
  const squads: NpcSquad[] = []

  for (const profile of Object.values(AiProfile)) {
    const composition = COMPOSITIONS[profile]

    for (const difficulty of Object.values(AiDifficulty)) {
      const level = NPC_LEVEL[difficulty]
      const key = `${profile}-${difficulty}`.toLowerCase()

      squads.push(
        unwrap(
          NpcSquad.create({
            key,
            name: composition.name,
            description: `${composition.name} (${profile}, ${difficulty}, nível ${level})`,
            profile,
            difficulty,
            members: composition.members.map(
              ({ key: memberKey, row, column }) => {
                const character = byKey.get(memberKey)!
                const family = character.spec.familyTrait
                return {
                  template: character.template,
                  level,
                  row,
                  column,
                  skills: npcBuild(character, level),
                  traits: [
                    ...(family ? [traits.get(family)!] : []),
                    traits.get(character.spec.npcTrait)!,
                  ],
                }
              }
            ),
          }),
          `squad ${key}`
        )
      )
    }
  }

  return squads
}
