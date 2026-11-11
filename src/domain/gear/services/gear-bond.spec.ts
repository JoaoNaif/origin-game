import { beforeEach, describe, expect, it } from 'vitest'
import { Stat } from '@/domain/characters/enums/stat'
import { CLASS_STAT_MEAN } from '@/domain/characters/services/class-profiles'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { GearTemplate } from '../entities/gear-template'
import { gearBond } from './gear-bond'

/** Alto: HP e Ataque; baixo: Esquiva e Vontade (na régua das classes). */
const STATS: StatBlock = {
  HP: CLASS_STAT_MEAN.HP * 1.5,
  ATTACK: CLASS_STAT_MEAN.ATTACK * 1.4,
  DEFENSE: CLASS_STAT_MEAN.DEFENSE * 1,
  SPEED: CLASS_STAT_MEAN.SPEED * 0.9,
  PRECISION: CLASS_STAT_MEAN.PRECISION * 1,
  EVASION: CLASS_STAT_MEAN.EVASION * 0.6,
  WILL: CLASS_STAT_MEAN.WILL * 0.7,
}

let sut: GearTemplate

describe('Gear Bond', () => {
  beforeEach(() => {
    const created = GearTemplate.create({
      key: 'rei-de-teste',
      name: 'Rei de Teste',
      kind: 'ARMOR',
      grade: 'KING',
      lineage: 'FUNDAMENTAL',
      primaryStat: Stat.HP,
      secondaryStat: Stat.DEFENSE,
      requirements: [
        { stat: Stat.HP, level: 'HIGH' },
        { stat: Stat.ATTACK, level: 'HIGH' },
        { stat: Stat.EVASION, level: 'LOW' },
        { stat: Stat.SPEED, level: 'LOW' },
      ],
      titles: ['Rei', 'Indestrutível'],
    })
    if (created.isLeft()) throw created.value
    sut = created.value
  })

  it('should be able to count the requirements by the 2 highest and 2 lowest stats', () => {
    const result = gearBond(sut, { stats: STATS, titles: [], traitWaivers: 0 })

    // Velocidade não está entre as 2 menores: 3 de 4 = parcial
    expect(result.met).toBe(3)
    expect(result.bond).toBe('PARTIAL')
    expect(result.requirements.find((r) => r.stat === Stat.SPEED)?.met).toBe(
      false
    )
  })

  it('should be able to reach the full bond with a title from the list', () => {
    const result = gearBond(sut, {
      stats: STATS,
      titles: ['Indestrutível'],
      traitWaivers: 0,
    })

    expect(result.waived).toBe(1)
    expect(result.matchingTitles).toEqual(['Indestrutível'])
    expect(result.bond).toBe('FULL')
  })

  it('should not be able to waive more than 1 requirement (titles and Prodígio share the cap)', () => {
    const weak: StatBlock = { ...STATS, ATTACK: CLASS_STAT_MEAN.ATTACK * 0.5 }

    const result = gearBond(sut, {
      stats: weak,
      titles: ['Rei', 'Indestrutível'],
      traitWaivers: 1,
    })

    // HP alto e Esquiva baixa: 2 reais + 1 substituído = 3 de 4
    expect(result.met).toBe(2)
    expect(result.waived).toBe(1)
    expect(result.bond).toBe('PARTIAL')
  })

  it('should be able to have no bond with less than half', () => {
    const opposite: StatBlock = {
      HP: CLASS_STAT_MEAN.HP * 0.5,
      ATTACK: CLASS_STAT_MEAN.ATTACK * 0.6,
      DEFENSE: CLASS_STAT_MEAN.DEFENSE * 1,
      SPEED: CLASS_STAT_MEAN.SPEED * 1.5,
      PRECISION: CLASS_STAT_MEAN.PRECISION * 1,
      EVASION: CLASS_STAT_MEAN.EVASION * 1.4,
      WILL: CLASS_STAT_MEAN.WILL * 1,
    }

    const result = gearBond(sut, {
      stats: opposite,
      titles: ['Rei'],
      traitWaivers: 0,
    })

    expect(result.met).toBe(0)
    expect(result.bond).toBe('NONE')
  })
})
