import { EMPTY_FREE_POINTS } from '@/domain/characters/entities/character'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Stat } from '@/domain/characters/enums/stat'
import { computeStats } from '@/domain/characters/services/stat-calculator'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { VANGUARD_STATS } from 'test/factories/make-character-template'
import { beforeEach, describe, expect, it } from 'vitest'
import { DesgasteSkill, DesgasteState, DesgasteUnit, RELIEF } from './desgaste'

// Vanguarda nível 100 com a distribuição padrão: 700 / 100 / 120 / 75 / 84 / 55 / 95
const BASE: StatBlock = { ...VANGUARD_STATS, PRECISION: 84 }

const skill = (override: Partial<DesgasteSkill> = {}): DesgasteSkill => ({
  lineage: Lineage.MATERIAL,
  isAwakened: false,
  desgastePercent: 5,
  ...override,
})

const unit = (override: Partial<DesgasteUnit> = {}): DesgasteUnit => ({
  baseStats: BASE,
  lineages: [Lineage.MATERIAL],
  hasAwakenedSkill: false,
  ...override,
})

describe('Desgaste', () => {
  let sut: DesgasteState

  beforeEach(() => {
    sut = new DesgasteState(unit())
  })

  describe('Charge', () => {
    it('should be able to charge the stat of the skill lineage', () => {
      const result = sut.charge(skill(), BASE.HP)

      // Material → Defesa: 5% de 120 = 6
      expect(result.potency).toBe(1)
      expect(result.charges).toEqual([
        { target: Stat.DEFENSE, requested: 6, applied: 6 },
      ])
      expect(sut.stat(Stat.DEFENSE)).toBe(114)
    })

    it('should not be able to go below 80% of the base stat', () => {
      for (let i = 0; i < 10; i++) sut.charge(skill(), BASE.HP)

      // piso: 80% de 120 = 96 (perde no máximo 24)
      expect(sut.stat(Stat.DEFENSE)).toBe(96)
    })

    it('should be able to halve the potency with no slack left', () => {
      for (let i = 0; i < 4; i++) sut.charge(skill(), BASE.HP) // 24 de 24

      const result = sut.charge(skill(), BASE.HP)

      expect(result.potency).toBe(0.5)
      expect(result.charges[0].applied).toBe(0)
    })

    it('should be able to interpolate the potency with partial slack', () => {
      for (let i = 0; i < 3; i++) sut.charge(skill(), BASE.HP) // 18 de 24
      sut.charge(skill({ desgastePercent: 2.5 }), BASE.HP) // 21 de 24: sobram 3

      // pede 6 com 3 de folga → metade da folga → potência 0,75
      expect(sut.charge(skill(), BASE.HP).potency).toBeCloseTo(0.75)
    })

    it('should be able to hurt the current HP for Elemental, down to 80% of max', () => {
      const elemental = new DesgasteState(
        unit({ lineages: [Lineage.ELEMENTAL] })
      )

      const result = elemental.charge(
        skill({ lineage: Lineage.ELEMENTAL, desgastePercent: 8 }),
        600
      )

      // pede 8% de 700 = 56, mas só há 600 − 560 = 40 de folga
      expect(result.selfDamage).toBe(40)
      expect(result.potency).toBeCloseTo(0.5 + 0.5 * (40 / 56))
    })

    it('should be able to lower the max HP for Fundamental', () => {
      const fundamental = new DesgasteState(
        unit({ lineages: [Lineage.FUNDAMENTAL] })
      )

      fundamental.charge(skill({ lineage: Lineage.FUNDAMENTAL }), 700)

      expect(fundamental.maxHp).toBe(665) // 700 − 5%
    })
  })

  describe('Cost Modifiers', () => {
    it('should be able to charge resonance on the other variant (D97)', () => {
      const dual = new DesgasteState(
        unit({ lineages: [Lineage.MATERIAL, Lineage.VECTORIAL] })
      )

      const result = dual.charge(skill(), BASE.HP)

      // 100% em Defesa (6) e 60% em Precisão (5% × 84 × 0,6 = 2,52)
      expect(result.charges.map((c) => c.target)).toEqual([
        Stat.DEFENSE,
        Stat.PRECISION,
      ])
      expect(result.charges[1].applied).toBeCloseTo(2.52)
    })

    it('should be able to charge 40% on each other variant with three variants', () => {
      const triple = new DesgasteState(
        unit({
          lineages: [Lineage.MATERIAL, Lineage.VECTORIAL, Lineage.PSYCHIC],
        })
      )

      const result = triple.charge(skill(), BASE.HP)

      expect(result.charges).toHaveLength(3)
      expect(result.charges[2].applied).toBeCloseTo((95 * 5 * 0.4) / 100)
    })

    it('should be able to charge both parts on one stat for two variants of the same lineage', () => {
      const sameLineage = new DesgasteState(
        unit({ lineages: [Lineage.MATERIAL, Lineage.MATERIAL] })
      )

      sameLineage.charge(skill(), BASE.HP)

      // 6 + 60% de 6
      expect(sameLineage.lostOf(Stat.DEFENSE)).toBeCloseTo(9.6)
    })

    it('should be able to discount non awakened skills with an awakened one in the build (D96)', () => {
      const awakened = new DesgasteState(unit({ hasAwakenedSkill: true }))

      expect(awakened.costOf(skill())[0].requested).toBeCloseTo(4.5) // 6 × 0,75
      expect(
        awakened.costOf(skill({ isAwakened: true }))[0].requested
      ).toBeCloseTo(6)
    })

    it('should be able to apply the pure blood discount (D88)', () => {
      const pureBlood = new DesgasteState(
        unit({ lineageCostPercent: { [Lineage.MATERIAL]: -10 } })
      )

      expect(pureBlood.costOf(skill())[0].requested).toBeCloseTo(5.4)
    })
  })

  describe('Relieve', () => {
    it('should be able to remove part of the accumulated desgaste', () => {
      sut.charge(skill({ desgastePercent: 10 }), BASE.HP) // perde 12

      sut.relieve(RELIEF.HEAL)

      expect(sut.lostOf(Stat.DEFENSE)).toBeCloseTo(9.6)
    })

    it('should not be able to recover max HP with a common heal (D59)', () => {
      const fundamental = new DesgasteState(
        unit({ lineages: [Lineage.FUNDAMENTAL] })
      )
      fundamental.charge(skill({ lineage: Lineage.FUNDAMENTAL }), 700)

      fundamental.relieve(RELIEF.HEAL)
      expect(fundamental.maxHp).toBe(665)

      fundamental.relieve(RELIEF.RECOVERY_SKILL, { includeMaxHp: true })
      expect(fundamental.maxHp).toBeCloseTo(682.5)
    })
  })

  it('should be able to charge the none skill on defense (D107)', () => {
    const noVariant = new DesgasteState(unit({ lineages: [] }))

    const result = noVariant.charge(
      skill({ lineage: Lineage.NONE, desgastePercent: 0.5 }),
      BASE.HP
    )

    // 0,5% de 120, sem ressonância (sem variante)
    expect(result.charges).toEqual([
      { target: Stat.DEFENSE, requested: 0.6, applied: 0.6 },
    ])
  })

  it('should be able to use the stats computed for the battle', () => {
    const base = computeStats({
      profile: VANGUARD_STATS,
      level: 100,
      freePoints: EMPTY_FREE_POINTS,
    })
    const state = new DesgasteState(unit({ baseStats: base }))

    state.charge(skill(), base.HP)

    expect(state.stat(Stat.DEFENSE)).toBeCloseTo(102 - 5.1)
  })
})
