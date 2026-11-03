import { SeededRng } from '@/core/rng/seeded-rng'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { aiRng, MachineAi } from '@/domain/ai/machine-ai'
import { generateCandidates } from '@/domain/ai/services/action-generator'
import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { BattleSide, MAX_ROUNDS } from '@/domain/combat/enums/battle-enums'
import { toSnapshotField } from '@/domain/combat/services/build-snapshot'
import { BattleActionPayload } from '@/domain/combat/value-objects/battle-action'
import { BattleSnapshot } from '@/domain/combat/value-objects/battle-snapshot'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { StatusType } from '@/domain/skills/enums/status-type'
import {
  autoFormation,
  makeDuelSnapshot,
  randomSquadKeys,
} from 'test/factories/make-duel-snapshot'
import { describe, expect, it } from 'vitest'
import { loadSeedContent } from '../../prisma/seed/content'

/**
 * Teste de fumaça do motor: batalhas com jogadas legais sorteadas e builds sorteadas, verificando o que nunca pode
 * acontecer, qualquer que seja a jogada: travar, vida fora dos limites, jogada oferecida que o motor recusa, replay
 * diferente. Pega as interações entre status que um teste por regra não cobre.
 */
const content = loadSeedContent()
const fields = content.fields.map((f) => {
  const field = toSnapshotField(f, content.catalog.traits)
  if (field.isLeft()) throw field.value
  return field.value
})

/** Teto de ações por batalha: passar disto é batalha que não acaba. */
const MAX_ACTIONS = 3000
/** `FUZZ_BATTLES` e `FUZZ_FIRST_SEED` para rodar mais batalhas de vez em quando. */
const BATTLES = Number(process.env.FUZZ_BATTLES ?? 150)
const FIRST_SEED = Number(process.env.FUZZ_FIRST_SEED ?? 1)
const LEVELS = [10, 18, 30, 58, 100]

function randomBuild(key: string, level: number, draw: SeededRng) {
  const pool = content.characters
    .find((c) => c.spec.key === key)!
    .skills.filter((s) => s.minLevel <= level)
    .map((s) => s.key)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = draw.int(0, i)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 4)
}

function randomSnapshot(seed: number): BattleSnapshot {
  const draw = new SeededRng(seed * 7919)
  const level = LEVELS[seed % LEVELS.length]
  const squad = () =>
    autoFormation(content, randomSquadKeys(content, draw)).map((m) => ({
      ...m,
      skills: randomBuild(m.key, level, draw),
    }))

  return makeDuelSnapshot(content, squad(), squad(), level, {
    initial: fields[seed % fields.length],
    catalog: fields,
  })
}

const refsOf = (snapshot: BattleSnapshot) =>
  [...snapshot.player.units, ...snapshot.opponent.units].map((u) => u.ref)

/** Tudo o que define o estado da batalha, para comparar cópias. */
function stateOf(engine: BattleEngine, refs: string[]) {
  return refs.map((ref) => {
    const unit = engine.unit(ref)
    return {
      ref,
      hp: unit.hp,
      shield: unit.shield,
      alive: unit.alive,
      position: unit.position,
      statuses: [...unit.statuses].sort(),
      linkedWith: unit.linkedWith,
      swapImmune: unit.swapImmune,
      ready: unit.readySkills,
      gauge: unit.alive ? engine.gauge(ref) : null,
    }
  })
}

/** O que tem que valer depois de qualquer ação. */
function checkInvariants(engine: BattleEngine, refs: string[], seed: number) {
  const where = `semente ${seed}, rodada ${engine.round}`
  const cells = new Set<string>()

  for (const ref of refs) {
    const unit = engine.unit(ref)
    expect(unit.hp, `${where}: HP negativo de ${ref}`).toBeGreaterThanOrEqual(0)
    expect(unit.shield, `${where}: escudo de ${ref}`).toBeGreaterThanOrEqual(0)
    expect(
      unit.hp,
      `${where}: HP acima do máximo de ${ref}`
    ).toBeLessThanOrEqual(unit.maxHp + 1e-9)
    expect(Number.isFinite(unit.hp), `${where}: HP de ${ref}`).toBe(true)

    if (!unit.alive) {
      expect(unit.hp, `${where}: ${ref} morto com vida`).toBe(0)
      expect(unit.position, `${where}: ${ref} morto na grade`).toBeNull()
      expect(unit.linkedWith, `${where}: ${ref} morto ligado`).toBeNull()
      continue
    }

    const cell = `${unit.side}:${unit.position!.row}:${unit.position!.column}`
    expect(cells.has(cell), `${where}: dois na mesma casa ${cell}`).toBe(false)
    cells.add(cell)

    if (!engine.outcome) {
      const gauge = engine.gauge(ref)
      expect(gauge, `${where}: barra de ${ref}`).toBeGreaterThanOrEqual(0)
    }

    if (unit.linkedWith) {
      const partner = engine.unit(unit.linkedWith)
      expect(partner.alive, `${where}: elo com morto (${ref})`).toBe(true)
      expect(partner.linkedWith, `${where}: elo de mão única (${ref})`).toBe(
        ref
      )
      expect(partner.side, `${where}: elo entre lados (${ref})`).toBe(unit.side)
    }
  }
}

/** O que tem que valer nas jogadas oferecidas a quem está na vez. */
function checkCandidates(engine: BattleEngine, ref: string, seed: number) {
  const where = `semente ${seed}, rodada ${engine.round}, ${ref}`
  const actor = engine.unit(ref)
  const skills = engine.skillsOf(ref)
  const candidates = generateCandidates(engine, ref)

  expect(candidates.length, `${where}: sem nenhuma jogada`).toBeGreaterThan(0)
  expect(
    actor.statuses.includes(StatusType.STUN) ||
      actor.statuses.includes(StatusType.SLEEP),
    `${where}: agindo sem poder agir`
  ).toBe(false)

  for (const { payload, preview } of candidates) {
    if (payload.type !== 'SKILL' || !preview) continue
    const skill = skills.find((s) => s.key === payload.skillKey)!

    if (actor.statuses.includes(StatusType.SILENCE)) {
      expect(skill.tier, `${where}: silenciado usando ${skill.key}`).toBe(
        SkillTier.BASIC
      )
    }

    const singleTarget =
      skill.area === SkillArea.SINGLE && skill.range !== SkillRange.PIERCING
    if (singleTarget && skill.target === 'ENEMY') {
      for (const hit of preview.hits) {
        const guarding = [BattleSide.PLAYER, BattleSide.OPPONENT]
          .flatMap((side) => engine.aliveRefs(side))
          .some((r) => engine.unit(r).protectedBy === hit.ref)
        expect(
          engine.unit(hit.ref).isHidden && !guarding,
          `${where}: ${skill.key} mirando quem está Furtivo (${hit.ref})`
        ).toBe(false)
      }
    }
  }

  return candidates
}

function playRandom(seed: number) {
  const snapshot = randomSnapshot(seed)
  const refs = refsOf(snapshot)
  const engine = new BattleEngine(snapshot, new SeededRng(seed))
  const draw = new SeededRng(seed * 31 + 7)
  const played: BattleActionPayload[] = []

  for (let turn = engine.nextTurn(); turn; turn = engine.nextTurn()) {
    expect(
      played.length,
      `semente ${seed}: batalha sem fim na rodada ${engine.round}`
    ).toBeLessThan(MAX_ACTIONS)

    const candidates = checkCandidates(engine, turn.ref, seed)

    // de vez em quando, toda jogada oferecida tem que ser aceita e a cópia direta tem que bater com o replay
    if (played.length % 25 === 0) {
      for (const { payload } of candidates) {
        const done = engine.fork(new SeededRng(seed)).act(payload)
        expect(
          done.isRight(),
          `semente ${seed}: oferecida e recusada ${JSON.stringify(payload)}`
        ).toBe(true)
      }
      expect(stateOf(engine.fork(new SeededRng(seed)), refs)).toEqual(
        stateOf(engine.forkByReplay(new SeededRng(seed)), refs)
      )
    }

    const { payload } = candidates[draw.int(0, candidates.length - 1)]
    const done = engine.act(payload)
    if (done.isLeft()) throw done.value
    played.push(payload)
    checkInvariants(engine, refs, seed)
  }

  expect(engine.outcome, `semente ${seed}: sem resultado`).not.toBeNull()
  expect(engine.round).toBeLessThanOrEqual(MAX_ROUNDS + 1)

  // o servidor refaz a batalha pelo replay: mesma seed + mesmas ações = mesmos eventos (D8)
  const replay = new BattleEngine(snapshot, new SeededRng(seed))
  for (const payload of played) {
    replay.nextTurn()
    const done = replay.act(payload)
    if (done.isLeft()) throw done.value
  }
  replay.nextTurn()
  expect(replay.events).toEqual(engine.events)

  return engine
}

describe('Battle Fuzz', () => {
  it(
    'should be able to survive random legal moves in every status interaction',
    { timeout: 240_000 + BATTLES * 200 },
    async () => {
      const seen = new Set<string>()

      for (let seed = FIRST_SEED; seed < FIRST_SEED + BATTLES; seed++) {
        for (const event of playRandom(seed).events) {
          seen.add(event.type)
          if (event.type === 'STATUS' && event.result !== 'RESISTED') {
            seen.add(event.status)
          }
        }
        // devolve o controle ao vitest: em rodadas longas, o teste não trava o processo
        await new Promise((resolve) => setImmediate(resolve))
      }

      // sem isto o teste passaria sem nunca ter exercitado os status
      for (const expected of [
        StatusType.SILENCE,
        StatusType.SLEEP,
        StatusType.LINK,
        StatusType.STEALTH,
        StatusType.CONTAGION,
        'WOKE',
        'CLEANSE',
      ]) {
        expect(seen, `nunca aconteceu: ${expected}`).toContain(expected)
      }
    }
  )

  it(
    'should be able to finish battles played by the machine on both sides',
    { timeout: 240_000 },
    () => {
      for (let seed = 1; seed <= 12; seed++) {
        const snapshot = randomSnapshot(seed)
        const refs = refsOf(snapshot)
        const engine = new BattleEngine(snapshot, new SeededRng(seed))
        const ai = (side: BattleSide) =>
          new MachineAi(
            {
              side,
              profile: AiProfile.BALANCED,
              difficulty: AiDifficulty.ADVANCED,
            },
            aiRng(seed, side)
          )
        const machines = {
          PLAYER: ai(BattleSide.PLAYER),
          OPPONENT: ai(BattleSide.OPPONENT),
        }

        let actions = 0
        for (let turn = engine.nextTurn(); turn; turn = engine.nextTurn()) {
          expect(++actions, `semente ${seed}: IA sem fim`).toBeLessThan(
            MAX_ACTIONS
          )
          const { payload } = machines[turn.side].decide(engine, turn.ref)
          const done = engine.act(payload)
          if (done.isLeft()) throw done.value
          checkInvariants(engine, refs, seed)
        }
        expect(engine.outcome).not.toBeNull()
      }
    }
  )
})
