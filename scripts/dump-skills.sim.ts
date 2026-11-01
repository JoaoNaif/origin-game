import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { loadSeedContent } from '../prisma/seed/content'

it('dump', () => {
  const c = loadSeedContent()
  const rows: string[] = []
  for (const ch of c.characters) {
    for (const s of ch.skills) {
      const p = s as any
      const props = p.props ?? p
      rows.push(
        [ch.template.key, ch.template.characterClass, props.key, props.tier, props.target, props.range ?? '-', props.area, 'cd' + props.cooldown, 'dg' + props.desgastePercent, 'lv' + props.minLevel, props.isKit ? 'KIT' : '', JSON.stringify(props.effects)].join(' | ')
      )
    }
  }
  writeFileSync(process.env.OUT!, rows.join('\n'))
})
