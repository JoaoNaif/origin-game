import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import {
  CreateNpcSquadInput,
  NpcSquad,
} from '@/domain/squads/entities/npc-squad'
import { makeCharacterTemplate } from './make-character-template'
import { makeSkill } from './make-skill'

const CELLS = [
  { row: 0, column: 0 },
  { row: 2, column: 0 },
  { row: 1, column: 1 },
  { row: 1, column: 2 },
]

/** Squad Iniciante válido: 4 recrutas sem variante, nível 15, com skills none. */
export function makeNpcSquad(
  override: Partial<CreateNpcSquadInput> = {},
  id?: UniqueEntityId
): NpcSquad {
  const skills = [0, 1, 2, 3].map((i) => makeSkill({ key: `none-${i}` }))

  const result = NpcSquad.create(
    {
      key: 'beginner-wall',
      name: 'Muralha de recrutas',
      profile: AiProfile.CAUTIOUS,
      difficulty: AiDifficulty.BEGINNER,
      members: CELLS.map((cell, i) => ({
        template: makeCharacterTemplate(
          { key: `npc-${i}` },
          new UniqueEntityId(`npc-template-${i}`)
        ),
        level: 15,
        skills,
        ...cell,
      })),
      ...override,
    },
    id
  )

  if (result.isLeft()) throw result.value

  return result.value
}
