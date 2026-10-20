import { BattleSide } from '@/domain/combat/enums/battle-enums'
import {
  BattleEngine,
  SkillPreview,
} from '@/domain/combat/engine/battle-engine'
import { adjacentCells, isAdjacent } from '@/domain/combat/services/battle-grid'
import { BattleActionPayload } from '@/domain/combat/value-objects/battle-action'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import {
  GRID_SIZE,
  GridPosition,
} from '@/domain/squads/value-objects/grid-position'

/** Ação candidata do turno, com a prévia quando é skill. */
export interface Candidate {
  payload: BattleActionPayload
  preview: SkillPreview | null
}

type SkillPayload = Extract<BattleActionPayload, { type: 'SKILL' }>

const otherSide = (side: BattleSide) =>
  side === BattleSide.PLAYER ? BattleSide.OPPONENT : BattleSide.PLAYER

const ALL_CELLS: GridPosition[] = Array.from(
  { length: GRID_SIZE * GRID_SIZE },
  (_, i) => ({ row: Math.floor(i / GRID_SIZE), column: i % GRID_SIZE })
)

/** Célula ocupada por uma unidade viva do lado. */
function occupantAt(
  engine: BattleEngine,
  side: BattleSide,
  cell: GridPosition
): string | undefined {
  return engine.aliveRefs(side).find((ref) => {
    const p = engine.unit(ref).position
    return p?.row === cell.row && p.column === cell.column
  })
}

/**
 * Todas as ações legais da unidade da vez (`engine.md` 3.13): cada skill pronta em cada célula que dá um conjunto
 * diferente de alvos (com as escolhas extras de trocar inimigos, avançar, mover aliado e trocar campo), mover para
 * uma célula adjacente vazia, trocar com um aliado e Defender. Validado pela prévia do motor: nada aqui é sorteado.
 */
export function generateCandidates(
  engine: BattleEngine,
  actorRef: string
): Candidate[] {
  const actor = engine.unit(actorRef)
  const candidates: Candidate[] = []

  for (const skill of engine.skillsOf(actorRef)) {
    if (!actor.readySkills.includes(skill.key)) continue

    const targetSide =
      skill.target === SkillTarget.ENEMY ? otherSide(actor.side) : actor.side
    const cells =
      skill.target === SkillTarget.SELF || skill.area === SkillArea.GRID
        ? [actor.position!]
        : ALL_CELLS
    const seen = new Set<string>()

    for (const cell of cells) {
      const base: SkillPayload = {
        type: 'SKILL',
        skillKey: skill.key,
        targetSide,
        target: cell,
      }
      const preview = engine.previewSkill(actorRef, base)
      if (preview.isLeft() || preview.value.hits.length === 0) continue

      const signature = preview.value.hits
        .map((h) => `${h.ref}:${h.falloff}`)
        .join('|')
      if (seen.has(signature)) continue
      seen.add(signature)

      for (const payload of withExtras(engine, actorRef, base, preview.value)) {
        candidates.push({ payload, preview: preview.value })
      }
    }
  }

  if (actor.canBeMoved) {
    for (const to of adjacentCells(actor.position!)) {
      if (!occupantAt(engine, actor.side, to)) {
        candidates.push({ payload: { type: 'MOVE', to }, preview: null })
      }
    }

    for (const ref of engine.aliveRefs(actor.side)) {
      const ally = engine.unit(ref)
      if (
        ref !== actorRef &&
        ally.canBeMoved &&
        ally.position &&
        isAdjacent(actor.position!, ally.position)
      ) {
        candidates.push({
          payload: { type: 'SWAP', withRef: ref },
          preview: null,
        })
      }
    }
  }

  candidates.push({ payload: { type: 'DEFEND' }, preview: null })

  return candidates
}

/** Escolhas extras da skill: com quem trocar o inimigo, para onde avançar ou mover o aliado, qual campo. */
function withExtras(
  engine: BattleEngine,
  actorRef: string,
  base: SkillPayload,
  preview: SkillPreview
): SkillPayload[] {
  let payloads: SkillPayload[] = [base]
  const kinds = new Set(
    preview.skill.effects.flatMap((e) =>
      e.type === 'REPOSITION' ? [e.kind] : []
    )
  )
  const firstTarget = engine.unit(preview.hits[0].ref)

  if (kinds.has('SWAP') && firstTarget.position) {
    const options = adjacentCells(firstTarget.position).filter((cell) =>
      occupantAt(engine, firstTarget.side, cell)
    )
    if (options.length > 0) {
      payloads = payloads.flatMap((p) =>
        options.map((swapWith) => ({ ...p, swapWith }))
      )
    }
  }

  const mover = kinds.has('DASH')
    ? engine.unit(actorRef)
    : kinds.has('MOVE_ALLY')
      ? firstTarget
      : null
  if (mover?.position) {
    const options = adjacentCells(mover.position).filter(
      (cell) => kinds.has('MOVE_ALLY') || !occupantAt(engine, mover.side, cell)
    )
    if (options.length > 0) {
      payloads = payloads.flatMap((p) =>
        options.map((moveTo) => ({ ...p, moveTo }))
      )
    }
  }

  if (preview.skill.effects.some((e) => e.type === 'CHANGE_FIELD')) {
    payloads = payloads.flatMap((p) =>
      engine.fields.map((f) => ({ ...p, fieldKey: f.key }))
    )
  }

  return payloads
}
