import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { describe, expect, it } from 'vitest'
import { InvalidTargetError } from '../errors/invalid-target-error'
import { allCells, GridUnit, resolveTargets, TargetingSkill } from './targeting'

//            coluna 0   coluna 1   coluna 2
//  linha 0      A          .          B
//  linha 1      .          C          .
//  linha 2      D          .          .
const ENEMIES: GridUnit[] = [
  { ref: 'A', row: 0, column: 0 },
  { ref: 'B', row: 0, column: 2 },
  { ref: 'C', row: 1, column: 1 },
  { ref: 'D', row: 2, column: 0 },
]

const ACTOR: GridUnit = { ref: 'ME', row: 1, column: 0 }

const enemySkill = (
  range: SkillRange,
  area: SkillArea = SkillArea.SINGLE
): TargetingSkill => ({ target: SkillTarget.ENEMY, range, area })

const targets = (
  skill: TargetingSkill,
  row: number,
  column: number,
  units: GridUnit[] = ENEMIES,
  exposedRefs?: Set<string>
) => {
  const result = resolveTargets({
    skill,
    actor: ACTOR,
    units,
    cell: { row, column },
    exposedRefs,
  })

  return result.isRight() ? result.value : result.value
}

describe('Targeting', () => {
  describe('Single target', () => {
    it('should be able to hit the exposed one in melee', () => {
      expect(targets(enemySkill(SkillRange.MELEE), 0, 0)).toEqual([
        { ref: 'A', falloff: 1 },
      ])
    })

    it('should not be able to hit behind someone in melee', () => {
      expect(targets(enemySkill(SkillRange.MELEE), 0, 2)).toBeInstanceOf(
        InvalidTargetError
      )
    })

    it('should be able to hit behind someone in melee when it has the Expose status', () => {
      expect(
        targets(enemySkill(SkillRange.MELEE), 0, 2, ENEMIES, new Set(['B']))
      ).toEqual([{ ref: 'B', falloff: 1 }])
    })

    it('should be able to treat the only one in a line as exposed', () => {
      expect(targets(enemySkill(SkillRange.MELEE), 1, 1)).toEqual([
        { ref: 'C', falloff: 1 },
      ])
    })

    it('should be able to hit anyone at range', () => {
      expect(targets(enemySkill(SkillRange.RANGED), 0, 2)).toEqual([
        { ref: 'B', falloff: 1 },
      ])
    })

    it('should be able to hit the back of the line with a flank', () => {
      expect(targets(enemySkill(SkillRange.FLANK), 0, 0)).toEqual([
        { ref: 'B', falloff: 1 },
      ])
    })

    it('should be able to pierce the whole line without falloff', () => {
      expect(targets(enemySkill(SkillRange.PIERCING), 0, 0)).toEqual([
        { ref: 'A', falloff: 1 },
        { ref: 'B', falloff: 1 },
      ])
    })

    it('should not be able to hit an empty cell', () => {
      expect(targets(enemySkill(SkillRange.RANGED), 2, 2)).toBeInstanceOf(
        InvalidTargetError
      )
    })

    it('should stop being blocked by a defeated unit (D21)', () => {
      const withoutA = ENEMIES.filter((u) => u.ref !== 'A')

      expect(targets(enemySkill(SkillRange.MELEE), 0, 2, withoutA)).toEqual([
        { ref: 'B', falloff: 1 },
      ])
    })
  })

  describe('Area', () => {
    it('should be able to hit a line from front to back with 100/60/30 falloff', () => {
      expect(
        targets(enemySkill(SkillRange.MELEE, SkillArea.LINE), 0, 2)
      ).toEqual([
        { ref: 'A', falloff: 1 },
        { ref: 'B', falloff: 0.6 },
      ])
    })

    it('should be able to give the third one in a line 30%', () => {
      const fullLine: GridUnit[] = [
        { ref: 'X', row: 0, column: 2 },
        { ref: 'Y', row: 0, column: 0 },
        { ref: 'Z', row: 0, column: 1 },
      ]

      expect(
        targets(enemySkill(SkillRange.RANGED, SkillArea.LINE), 0, 1, fullLine)
      ).toEqual([
        { ref: 'Y', falloff: 1 },
        { ref: 'Z', falloff: 0.6 },
        { ref: 'X', falloff: 0.3 },
      ])
    })

    it('should be able to hit a whole column without falloff (D108)', () => {
      // A (linha 0) e D (linha 2) estão na mesma profundidade: os dois levam 100%
      expect(
        targets(enemySkill(SkillRange.RANGED, SkillArea.COLUMN), 2, 0)
      ).toEqual([
        { ref: 'A', falloff: 1 },
        { ref: 'D', falloff: 1 },
      ])
    })

    it('should be able to choose an empty cell of the column', () => {
      expect(
        targets(enemySkill(SkillRange.RANGED, SkillArea.COLUMN), 1, 0)
      ).toHaveLength(2)
    })

    it('should be able to hit the whole grid without falloff', () => {
      const hits = targets(enemySkill(SkillRange.RANGED, SkillArea.GRID), 0, 0)

      expect(hits).toHaveLength(4)
      expect(
        (hits as { falloff: number }[]).every((h) => h.falloff === 1)
      ).toBe(true)
    })

    it('should not be able to hit an empty line', () => {
      const onlyRow0 = ENEMIES.filter((u) => u.row === 0)

      expect(
        targets(enemySkill(SkillRange.RANGED, SkillArea.LINE), 2, 0, onlyRow0)
      ).toBeInstanceOf(InvalidTargetError)
    })
  })

  describe('Allies and self', () => {
    const allySkill = (area: SkillArea): TargetingSkill => ({
      target: SkillTarget.ALLY,
      range: null,
      area,
    })

    it('should be able to heal any ally without blocking', () => {
      expect(targets(allySkill(SkillArea.SINGLE), 0, 2)).toEqual([
        { ref: 'B', falloff: 1 },
      ])
    })

    it('should be able to buff the whole squad without falloff', () => {
      expect(targets(allySkill(SkillArea.GRID), 0, 0)).toHaveLength(4)
    })

    it('should be able to target only itself', () => {
      expect(
        targets(
          { target: SkillTarget.SELF, range: null, area: SkillArea.SINGLE },
          9,
          9
        )
      ).toEqual([{ ref: 'ME', falloff: 1 }])
    })
  })

  it('should be able to list the 9 cells of the grid', () => {
    expect(allCells()).toHaveLength(9)
  })
})
