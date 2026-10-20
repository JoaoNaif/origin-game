import { DIFFICULTY_RULES, PROFILE_WEIGHTS } from '@/domain/ai/ai-values'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { MatchupResult, runMatchup } from '@/domain/ai/simulation/run-matchup'
import { AiSetup } from '@/domain/ai/simulation/simulate-battle'
import { makeCalibrationSnapshot } from 'test/factories/make-calibration-snapshot'
import { makeMirrorSnapshot } from 'test/factories/make-seed-snapshot'
import { toSnapshotField } from '@/domain/combat/services/build-snapshot'
import { loadSeedContent } from '../prisma/seed/content'
import { afterAll, describe, it } from 'vitest'

/**
 * Calibração da IA (`pvp_brief.md` 10.4, `engine.md` 3.14): IA contra IA com a squad espelhada. Rodar com
 * `npm run simulate`. Variáveis:
 * - `SIM_BATTLES`: batalhas por confronto (padrão 100);
 * - `SIM_SQUADS`: `seed` (padrão: as 4 composições do seed, espelhadas, nível de `SIM_SQUAD_DIFFICULTY`) ou
 *   `fixture` (a squad de calibração de `test/factories`, nível `SIM_LEVEL`, padrão 50);
 * - `SIM_SQUAD_DIFFICULTY`: de qual dificuldade vêm as squads do seed (padrão ADVANCED, nível 58);
 * - `SIM_SECTIONS`: `mirror,gap1,gap2,gap4,profiles` (padrão todas);
 * - `SIM_OVERRIDES`: JSON para testar valores sem mudar o código, ex.
 *   `{"difficulty":{"BEGINNER":{"temperature":0.8}},"profiles":{"CAUTIOUS":{"SUPPORT":0.8}}}`.
 */
const BATTLES = Number(process.env.SIM_BATTLES ?? 100)
const LEVEL = Number(process.env.SIM_LEVEL ?? 50)
const SECTIONS = (
  process.env.SIM_SECTIONS ?? 'mirror,gap1,gap2,gap4,profiles'
).split(',')
const LEVELS = Object.values(AiDifficulty)
const PROFILES = Object.values(AiProfile)
const SQUADS = process.env.SIM_SQUADS ?? 'seed'
const SQUAD_DIFFICULTY = (process.env.SIM_SQUAD_DIFFICULTY ??
  'ADVANCED') as AiDifficulty

/** Squads espelhadas: as batalhas do confronto se dividem igualmente entre elas. */
const snapshots =
  SQUADS === 'fixture'
    ? [makeCalibrationSnapshot(LEVEL)]
    : (() => {
        const content = loadSeedContent()
        return content.npcSquads
          .filter((s) => s.difficulty === SQUAD_DIFFICULTY)
          .map((s) => {
            // campo inicial a cada par de batalhas (os dois lados no mesmo campo), girando pelos 6 do seed
            const fields = content.fields.map((f) => {
              const field = toSnapshotField(f, content.catalog.traits)
              if (field.isLeft()) throw field.value
              return field.value
            })
            return (seed: number) =>
              makeMirrorSnapshot(s, content.catalog, {
                initial: fields[Math.floor((seed - 1) / 2) % fields.length],
                catalog: fields,
              })
          })
      })()

if (process.env.SIM_OVERRIDES) {
  const overrides = JSON.parse(process.env.SIM_OVERRIDES)
  for (const [level, rules] of Object.entries(overrides.difficulty ?? {})) {
    Object.assign(DIFFICULTY_RULES[level as AiDifficulty], rules)
  }
  for (const [profile, weights] of Object.entries(overrides.profiles ?? {})) {
    Object.assign(PROFILE_WEIGHTS[profile as AiProfile], weights)
  }
}

/** Batalhas por bloco (par, para manter a troca de lado). */
const CHUNK = 2

const pct = (x: number) => `${Math.round(x * 100)}%`
const lines: string[] = [
  `Batalhas por confronto: ${BATTLES}, squads: ${SQUADS === 'fixture' ? `fixture nível ${LEVEL}` : `seed ${SQUAD_DIFFICULTY} (${snapshots.length} composições)`}`,
  process.env.SIM_OVERRIDES
    ? `Valores alterados: ${process.env.SIM_OVERRIDES}`
    : '',
  '',
  '| Confronto (A x B) | A vence | Meta | Eliminação | Rodada média |',
  '|---|---|---|---|---|',
]

function matchup(label: string, a: AiSetup, b: AiSetup, goal: string) {
  it(label, { timeout: 0 }, async () => {
    const per = Math.max(2, Math.round(BATTLES / snapshots.length))
    const results: MatchupResult[] = []
    for (const [i, snapshot] of snapshots.entries()) {
      // blocos de 2 (par = A de PLAYER, ímpar = A de OPPONENT), devolvendo o controle ao vitest entre eles
      for (let done = 0; done < per; done += CHUNK) {
        results.push(
          runMatchup({
            snapshot,
            a,
            b,
            battles: Math.min(CHUNK, per - done),
            firstSeed: 1 + i * 10_000 + done,
          })
        )
        await new Promise((resolve) => setImmediate(resolve))
      }
    }
    const total = results.reduce((sum, x) => sum + x.battles, 0)
    const r: MatchupResult = {
      battles: total,
      winsA: results.reduce((sum, x) => sum + x.winsA, 0),
      winRateA: results.reduce((sum, x) => sum + x.winsA, 0) / total,
      eliminations: results.reduce((sum, x) => sum + x.eliminations, 0),
      averageRound:
        results.reduce((sum, x) => sum + x.averageRound * x.battles, 0) / total,
    }
    lines.push(
      `| ${label} | ${pct(r.winRateA)} | ${goal} | ${pct(r.eliminations / r.battles)} | ${r.averageRound.toFixed(1)} |`
    )
  })
}

const balanced = (difficulty: AiDifficulty): AiSetup => ({
  profile: AiProfile.BALANCED,
  difficulty,
})

describe('Calibração da IA', () => {
  afterAll(() => console.log('\n' + lines.join('\n') + '\n'))

  if (SECTIONS.includes('mirror')) {
    matchup(
      'Equilibrado Mestre x ele mesmo',
      balanced('MASTER'),
      balanced('MASTER'),
      '~50%'
    )
  }

  for (const [gap, goal] of [
    [1, '~65%'],
    [2, '~80%'],
    [4, '≥95%'],
  ] as const) {
    if (!SECTIONS.includes(`gap${gap}`)) continue
    for (let i = 0; i + gap < LEVELS.length; i++) {
      const high = LEVELS[i + gap]
      const low = LEVELS[i]
      matchup(`${high} x ${low}`, balanced(high), balanced(low), goal)
    }
  }

  if (SECTIONS.includes('profiles')) {
    for (let i = 0; i < PROFILES.length; i++) {
      for (let j = i + 1; j < PROFILES.length; j++) {
        matchup(
          `${PROFILES[i]} x ${PROFILES[j]} (Mestre)`,
          { profile: PROFILES[i], difficulty: AiDifficulty.MASTER },
          { profile: PROFILES[j], difficulty: AiDifficulty.MASTER },
          '45–55%'
        )
      }
    }
  }
})
