import { Either, left, right } from '@/core/either'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import {
  GRID_SIZE,
  GridPosition,
  isInsideGrid,
} from '@/domain/squads/value-objects/grid-position'
import { InvalidTargetError } from '../errors/invalid-target-error'

/** Queda de dano por personagem atingido, em ordem (D36): 100%, 60%, 30%. */
export const LINE_FALLOFF = [1, 0.6, 0.3] as const

/** Unidade viva numa grade (derrotado não bloqueia nem é alvo, D21). */
export interface GridUnit extends GridPosition {
  ref: string
}

export interface TargetHit {
  ref: string
  /** Multiplicador da queda (1, 0,6 ou 0,3); 1 quando a forma não tem queda. */
  falloff: number
}

export interface TargetingSkill {
  target: SkillTarget
  range: SkillRange | null
  area: SkillArea
}

export interface TargetingInput {
  skill: TargetingSkill
  /** Quem usa a skill. */
  actor: GridUnit
  /** Unidades vivas do lado alvo (o inimigo, ou o próprio lado em skill de aliado). */
  units: readonly GridUnit[]
  /** Célula escolhida (ignorada em SELF e em GRID). */
  cell: GridPosition
  /** Unidades com o status Exposto: viram alvo de corpo a corpo mesmo atrás de alguém (11.9). */
  exposedRefs?: ReadonlySet<string>
}

const at = (units: readonly GridUnit[], { row, column }: GridPosition) =>
  units.find((u) => u.row === row && u.column === column)

/** Unidades da linha `row`, da frente (coluna 0) para o fundo (D35). */
function rowFrontToBack(units: readonly GridUnit[], row: number) {
  return units.filter((u) => u.row === row).sort((a, b) => a.column - b.column)
}

/** Unidades da coluna (mesma profundidade nas 3 linhas), de cima para baixo. */
function columnUnits(units: readonly GridUnit[], column: number) {
  return units.filter((u) => u.column === column).sort((a, b) => a.row - b.row)
}

/** Primeira célula ocupada da linha (D22, 11.2). */
export function exposedOfRow(
  units: readonly GridUnit[],
  row: number
): GridUnit | undefined {
  return rowFrontToBack(units, row)[0]
}

const withFalloff = (list: GridUnit[]): TargetHit[] =>
  list.map((u, index) => ({ ref: u.ref, falloff: LINE_FALLOFF[index] ?? 0 }))

const noFalloff = (list: readonly GridUnit[]): TargetHit[] =>
  list.map((u) => ({ ref: u.ref, falloff: 1 }))

/**
 * Quem a skill atinge (D21, D22, D34 a D36, `skills_brief.md` 11.1 a 11.4).
 *
 * - Si mesmo: só o usuário.
 * - Aliado: sem bloqueio; alvo único na célula escolhida, área nos aliados da área, sem queda.
 * - Inimigo, área (linha, coluna, grade): ignora o bloqueio. Linha com queda 100/60/30 pela ordem dos personagens na
 *   profundidade (D36); coluna e grade sem queda (D108: na coluna todos estão na mesma profundidade).
 * - Inimigo, alvo único: corpo a corpo só no exposto (ou com status Exposto); à distância em qualquer um; flanco no
 *   fundo da linha; perfurante atravessa a linha inteira, sem queda.
 */
export function resolveTargets(
  input: TargetingInput
): Either<InvalidTargetError, TargetHit[]> {
  const { skill, actor, units, cell } = input

  if (skill.target === SkillTarget.SELF) {
    return right([{ ref: actor.ref, falloff: 1 }])
  }

  if (skill.area !== SkillArea.GRID && !isInsideGrid(cell)) {
    return left(new InvalidTargetError('célula fora da grade'))
  }

  const hits =
    skill.target === SkillTarget.ALLY
      ? allyTargets(skill.area, units, cell)
      : enemyTargets(input)

  if (hits.isLeft()) return hits
  if (hits.value.length === 0) {
    return left(new InvalidTargetError('ninguém na área escolhida'))
  }

  return hits
}

function allyTargets(
  area: SkillArea,
  units: readonly GridUnit[],
  cell: GridPosition
): Either<InvalidTargetError, TargetHit[]> {
  switch (area) {
    case SkillArea.SINGLE: {
      const unit = at(units, cell)
      return unit
        ? right([{ ref: unit.ref, falloff: 1 }])
        : left(new InvalidTargetError('nenhum aliado nessa célula'))
    }
    case SkillArea.LINE:
      return right(noFalloff(rowFrontToBack(units, cell.row)))
    case SkillArea.COLUMN:
      return right(noFalloff(columnUnits(units, cell.column)))
    case SkillArea.GRID:
      return right(noFalloff(units))
  }
}

function enemyTargets(
  input: TargetingInput
): Either<InvalidTargetError, TargetHit[]> {
  const { skill, units, cell, exposedRefs } = input

  switch (skill.area) {
    case SkillArea.LINE:
      return right(
        skill.range === SkillRange.PIERCING
          ? noFalloff(rowFrontToBack(units, cell.row))
          : withFalloff(rowFrontToBack(units, cell.row))
      )
    case SkillArea.COLUMN:
      // mesma profundidade nas 3 linhas: todos levam 100% (D108)
      return right(noFalloff(columnUnits(units, cell.column)))
    case SkillArea.GRID:
      return right(noFalloff(units))
    case SkillArea.SINGLE:
      break
  }

  const row = rowFrontToBack(units, cell.row)

  switch (skill.range) {
    case SkillRange.PIERCING:
      return right(noFalloff(row))

    case SkillRange.FLANK: {
      const last = row.at(-1)
      return last
        ? right([{ ref: last.ref, falloff: 1 }])
        : left(new InvalidTargetError('linha vazia'))
    }

    case SkillRange.RANGED: {
      const unit = at(units, cell)
      return unit
        ? right([{ ref: unit.ref, falloff: 1 }])
        : left(new InvalidTargetError('nenhum inimigo nessa célula'))
    }

    case SkillRange.MELEE:
    case null: {
      const unit = at(units, cell)
      if (!unit)
        return left(new InvalidTargetError('nenhum inimigo nessa célula'))

      const isExposed =
        row[0]?.ref === unit.ref || (exposedRefs?.has(unit.ref) ?? false)

      return isExposed
        ? right([{ ref: unit.ref, falloff: 1 }])
        : left(
            new InvalidTargetError(
              'corpo a corpo só no exposto (a primeira célula ocupada da linha)'
            )
          )
    }
  }
}

/** Todas as células da grade (para a IA listar alvos possíveis). */
export function allCells(): GridPosition[] {
  return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
    row: Math.floor(i / GRID_SIZE),
    column: i % GRID_SIZE,
  }))
}
