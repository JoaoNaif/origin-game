import { beforeAll, describe, expect, it } from 'vitest'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { GameCatalog } from '../applications/repositories/catalog-repository'
import { templateKit, templateSkills } from './template-skills'

let catalog: GameCatalog

describe('Template Skills', () => {
  beforeAll(() => {
    catalog = seedCatalog()
  })

  it('should be able to list the kit of every template in role order', () => {
    for (const template of catalog.templates.values()) {
      const kit = templateKit(catalog, template)

      expect(kit.map((s) => s.kitSlot)).toEqual([
        'BASIC',
        'STANDARD',
        'ROLE',
        'SIGNATURE',
      ])
    }
  })

  it('should be able to list only the skills of the template', () => {
    const kael = [...catalog.templates.values()].find(
      (t) => t.key === 'kael-vaz'
    )!

    const skills = templateSkills(catalog, kael)

    expect(skills.length).toBeGreaterThan(4)
    expect(skills.every((s) => s.key.startsWith('kael-vaz:'))).toBe(true)
  })
})
