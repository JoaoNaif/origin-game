import { SeededRng } from '@/core/rng/seeded-rng'
import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { buildNpcSide } from '@/domain/combat/services/build-snapshot'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { Lineage } from '@/domain/characters/enums/lineage'
import { StatusType } from '@/domain/skills/enums/status-type'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { skillReference } from '@/domain/skills/services/skill-reference'
import { describe, expect, it } from 'vitest'
import { loadSeedContent } from '../../prisma/seed/content'

describe('Seed Content', () => {
  const sut = loadSeedContent()
  const skills = sut.characters.flatMap((c) => c.skills)

  it('should be able to load the 12 starters and the 6 chest characters with valid templates and kits', () => {
    expect(sut.characters).toHaveLength(18)
    expect(sut.characters.filter((c) => c.template.isStarter)).toHaveLength(12)
    expect(sut.fields).toHaveLength(8)
    expect(sut.npcSquads).toHaveLength(20)
  })

  it('should be able to keep the chest characters out of the starters and the npc squads', () => {
    // os de baú (D150): raridade baixa, só saem de baú
    const chest = sut.characters.filter((c) => !c.template.isStarter)
    const npcTemplates = new Set(
      sut.npcSquads.flatMap((s) => s.members.map((m) => m.templateId.toValue()))
    )

    expect(chest.map((c) => c.template.rarity).sort()).toEqual([
      'B',
      'C',
      'D',
      'D',
      'E',
      'E',
    ])
    expect(chest.some((c) => npcTemplates.has(c.template.id.toValue()))).toBe(
      false
    )
  })

  it('should be able to cover every class, lineage, range and status', () => {
    const classes = new Set(
      sut.characters.map((c) => c.template.characterClass)
    )
    const lineages = new Set(skills.map((s) => s.lineage))
    const ranges = new Set(skills.map((s) => s.range).filter(Boolean))
    const statuses = new Set(
      skills.flatMap((s) =>
        s.effects.flatMap((e) => (e.type === 'APPLY_STATUS' ? [e.status] : []))
      )
    )

    expect(classes).toEqual(new Set(Object.values(CharacterClass)))
    expect(lineages).toEqual(new Set(Object.values(Lineage)))
    expect(ranges).toEqual(new Set(Object.values(SkillRange)))
    expect(statuses).toEqual(new Set(Object.values(StatusType)))
  })

  it('should be able to cover every area, target, skill effect and passive shape', () => {
    const effects = skills.flatMap((s) => s.effects)
    const passives = sut.characters.map((c) => c.template.passive!)

    expect(new Set(skills.map((s) => s.area))).toEqual(
      new Set(Object.values(SkillArea))
    )
    expect(new Set(skills.map((s) => s.target))).toEqual(
      new Set(Object.values(SkillTarget))
    )
    expect(new Set(effects.map((e) => e.type))).toEqual(
      new Set([
        'DAMAGE',
        'HEAL',
        'SHIELD',
        'STAT_MODIFIER',
        'APPLY_STATUS',
        'REPOSITION',
        'TURN_SHIFT',
        'CHANGE_FIELD',
        'CLEANSE',
        'RECOVER',
        'PROTECT',
        'GRANT_TURN',
        'EXPLOIT',
      ])
    )
    expect(
      new Set(effects.flatMap((e) => (e.type === 'REPOSITION' ? [e.kind] : [])))
    ).toEqual(new Set(['PUSH', 'PULL', 'SWAP', 'MOVE_ALLY', 'DASH']))
    // adiantar e atrasar; buff e debuff
    const shifts = effects.flatMap((e) =>
      e.type === 'TURN_SHIFT' ? [Math.sign(e.percent)] : []
    )
    const modifiers = effects.flatMap((e) =>
      e.type === 'STAT_MODIFIER' ? [Math.sign(e.percent)] : []
    )
    expect(new Set(shifts)).toEqual(new Set([1, -1]))
    expect(new Set(modifiers)).toEqual(new Set([1, -1]))
    // uma passiva por gatilho: só o ON_HEAL fica de fora (12 personagens, 13 gatilhos)
    expect(new Set(passives.map((p) => p.trigger.type)).size).toBe(12)
    expect(
      new Set(passives.flatMap((p) => p.effects.map((e) => e.type)))
    ).toEqual(
      new Set([
        'IGNORE_SHIELD',
        'REDUCE_COOLDOWN',
        'APPLY_STATUS',
        'HEAL',
        'ADVANCE_TURN',
        'ADVANCE_ALLIES',
        'REDUCE_DAMAGE',
        'STAT_MODIFIER',
      ])
    )
  })

  it('should be able to build every npc squad into a battle side', () => {
    for (const npcSquad of sut.npcSquads) {
      const side = buildNpcSide({ npcSquad, catalog: sut.catalog })
      expect(side.isRight()).toBe(true)
    }
  })

  it('should be able to play an engine battle between two seed squads', () => {
    const [a, b] = sut.npcSquads.filter((s) => s.difficulty === 'MASTER')
    const opponent = buildNpcSide({ npcSquad: b, catalog: sut.catalog })
    const player = buildNpcSide({ npcSquad: a, catalog: sut.catalog })
    if (opponent.isLeft() || player.isLeft()) throw new Error('lado inválido')

    const engine = new BattleEngine(
      {
        player: {
          ...player.value,
          side: 'PLAYER',
          units: player.value.units.map((u) => ({
            ...u,
            ref: u.ref.replace('OPPONENT', 'PLAYER'),
          })),
        },
        opponent: opponent.value,
        field: { initial: null, catalog: [] },
      },
      new SeededRng(1)
    )

    expect(engine.nextTurn()).not.toBeNull()
  })
  it('should be able to give each awakening 5 skills from level 80 to 100 in the awakened variant', () => {
    // D151: Sombra (2), Terra e Combustão
    expect([...sut.awakenings.keys()].sort()).toEqual([
      'cristal',
      'eclipse',
      'plasma',
      'sombra-abissal',
    ])

    for (const awakening of sut.awakenings.values()) {
      const own = skills.filter((s) => s.variantId?.equals(awakening.variantId))
      expect(own.map((s) => s.minLevel).sort((a, b) => a - b)).toEqual([
        80, 85, 90, 95, 100,
      ])
      for (const skill of own) {
        expect(skill.isAwakened).toBe(true)
        const reference = skillReference({
          tier: skill.tier,
          target: skill.target,
          range: skill.range,
          area: skill.area,
        })
        // Desgaste ×1,5 sobre a referência (D96)
        expect(skill.desgastePercent).toBeCloseTo(
          reference.desgastePercent * 1.5,
          1
        )
      }
      // quem tem a variante base pode sortear o despertar
      expect(
        sut.characters.some(
          (c) =>
            c.template.variants.length === 1 &&
            c.template.variants[0].variantId.equals(awakening.baseVariantId)
        )
      ).toBe(true)
    }
  })
})
