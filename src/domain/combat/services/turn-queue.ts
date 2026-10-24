import { Rng } from '@/core/rng/rng'
import {
  StatBlock,
  statBudget,
} from '@/domain/characters/value-objects/stat-block'

/** Barra de ação: age ao chegar a 1000 (D102). */
export const ACTION_BAR_MAX = 1000

/** Mover e trocar com aliado custam meio turno (D123): metade da barra. */
export const MOVE_TURN_COST_PERCENT = 50

/** Proteção contra fila sem fim (ninguém consegue agir). */
const MAX_IDLE_TICKS = 100_000

export interface QueueUnit {
  ref: string
  /** Velocidade atual (com buffs e debuffs); maior que zero. */
  speed: number
  /** Média dos stats (HP/5 + demais, ÷ 7), para desempate (D30). */
  statAverage: number
}

export interface Turn {
  ref: string
  tick: number
  round: number
}

interface UnitState extends QueueUnit {
  gauge: number
  /** Barra antes do último tick (para saber quem cruzou 1000 primeiro dentro do tick). */
  previous: number
}

/** Média dos stats para o desempate do D30, na escala do orçamento (HP vale 1/5, D69). */
export function statAverage(stats: StatBlock): number {
  return statBudget(stats) / Object.keys(stats).length
}

/**
 * Fila em timeline (D30, D102, D106). Cada tick soma a Velocidade na barra; ao chegar a 1000 a unidade age e
 * subtrai 1000 (a sobra fica). Se várias chegam no mesmo tick, vai primeiro quem cruzou 1000 antes dentro do tick;
 * empate exato: maior média de stats; depois a seed.
 *
 * Rodada (D106): termina quando todas as unidades vivas agiram pelo menos uma vez (o mais lento fecha a rodada).
 * Quem é mais rápido pode agir mais de uma vez na mesma rodada.
 */
export class TurnQueue {
  private readonly units = new Map<string, UnitState>()
  private tick = 0
  private round = 1
  /** Quem já agiu na rodada atual. */
  private readonly actedThisRound = new Set<string>()

  constructor(
    units: readonly QueueUnit[],
    private readonly rng: Rng
  ) {
    for (const unit of units) this.add(unit)
  }

  /** Cópia independente com outra sorte (previsão da IA): mesmas barras, rodada e quem já agiu. */
  clone(rng: Rng): TurnQueue {
    const copy = new TurnQueue([], rng)
    for (const [ref, unit] of this.units) copy.units.set(ref, { ...unit })
    copy.tick = this.tick
    copy.round = this.round
    for (const ref of this.actedThisRound) copy.actedThisRound.add(ref)

    return copy
  }

  get currentTick() {
    return this.tick
  }

  /** Rodada em andamento (a próxima ação acontece nela). */
  get currentRound() {
    return this.round
  }

  /** Barra atual de uma unidade (0 a 1000; pode passar de 1000 só entre o tick e a ação). */
  gaugeOf(ref: string): number {
    return this.get(ref).gauge
  }

  add(unit: QueueUnit) {
    assertSpeed(unit.speed)
    this.units.set(unit.ref, { ...unit, gauge: 0, previous: 0 })
  }

  /**
   * Tira a unidade da fila (derrotada ou besta que saiu). Se só faltava ela agir, a rodada fecha aqui (o próximo mais
   * lento passa a fechar a rodada).
   */
  remove(ref: string) {
    this.units.delete(ref)
    this.actedThisRound.delete(ref)
    this.closeRoundIfEveryoneActed()
  }

  /** Nova Velocidade (buff/debuff): vale a partir do próximo tick, sem mexer na barra (efeito gradual). */
  setSpeed(ref: string, speed: number) {
    assertSpeed(speed)
    this.get(ref).speed = speed
  }

  /**
   * Adianta (+) ou atrasa (−) a vez em % da barra (Tático, D102). A barra fica entre 0 e 1000: adiantar nunca dá
   * mais de uma ação extra, e atrasar nunca passa de zero.
   */
  shift(ref: string, percent: number) {
    const unit = this.get(ref)
    const next = unit.gauge + (ACTION_BAR_MAX * percent) / 100

    unit.gauge = Math.min(ACTION_BAR_MAX, Math.max(0, next))
  }

  /** Avança o tempo até a próxima unidade agir e devolve de quem é a vez. */
  next(): Turn {
    if (this.units.size === 0) {
      throw new Error('TurnQueue.next: fila vazia')
    }

    let idle = 0
    while (this.ready().length === 0) {
      if (++idle > MAX_IDLE_TICKS)
        throw new Error('TurnQueue.next: ninguém age')
      this.advanceTick()
    }

    const actor = this.pickFirst(this.ready())
    actor.gauge -= ACTION_BAR_MAX

    const turn = { ref: actor.ref, tick: this.tick, round: this.round }

    this.actedThisRound.add(actor.ref)
    this.closeRoundIfEveryoneActed()

    return turn
  }

  /**
   * Linha do tempo (D126): as próximas `count` vezes, sem mudar a fila e **sem usar a seed**. Empate exato fica pela
   * ordem da `ref` (na hora, quem decide é a seed, então a projeção pode trocar dois empatados).
   */
  project(count: number): Turn[] {
    const units = [...this.units.values()].map((u) => ({ ...u }))
    const acted = new Set(this.actedThisRound)
    let tick = this.tick
    let round = this.round
    const turns: Turn[] = []

    while (turns.length < count && units.length > 0) {
      let ready = units.filter((u) => u.gauge >= ACTION_BAR_MAX)
      while (ready.length === 0) {
        tick += 1
        for (const unit of units) {
          unit.previous = unit.gauge
          unit.gauge += unit.speed
        }
        ready = units.filter((u) => u.gauge >= ACTION_BAR_MAX)
      }
      const actor = [...ready].sort(
        (a, b) => compare(a, b) || a.ref.localeCompare(b.ref)
      )[0]
      actor.gauge -= ACTION_BAR_MAX
      turns.push({ ref: actor.ref, tick, round })

      acted.add(actor.ref)
      if (units.every((u) => acted.has(u.ref))) {
        round += 1
        acted.clear()
      }
    }

    return turns
  }

  private closeRoundIfEveryoneActed() {
    if (this.units.size === 0) return

    const everyoneActed = [...this.units.keys()].every((ref) =>
      this.actedThisRound.has(ref)
    )

    if (everyoneActed) {
      this.round += 1
      this.actedThisRound.clear()
    }
  }

  private advanceTick() {
    this.tick += 1
    for (const unit of this.units.values()) {
      unit.previous = unit.gauge
      unit.gauge += unit.speed
    }
  }

  private ready(): UnitState[] {
    return [...this.units.values()].filter((u) => u.gauge >= ACTION_BAR_MAX)
  }

  private pickFirst(candidates: UnitState[]): UnitState {
    let best = [candidates[0]]

    for (const unit of candidates.slice(1)) {
      const order = compare(unit, best[0])
      if (order < 0) best = [unit]
      else if (order === 0) best.push(unit)
    }

    return best.length === 1 ? best[0] : this.rng.pick(best)
  }

  private get(ref: string): UnitState {
    const unit = this.units.get(ref)
    if (!unit) throw new Error(`TurnQueue: unidade ${ref} não está na fila`)

    return unit
  }
}

/** Negativo se `a` age antes de `b`; zero se empate total (vai para a seed). */
function compare(a: UnitState, b: UnitState): number {
  // fração do tick até cruzar 1000: (1000 − antes) / velocidade; menor cruza primeiro.
  // Multiplicação cruzada para comparar sem divisão.
  const crossA = (ACTION_BAR_MAX - a.previous) * b.speed
  const crossB = (ACTION_BAR_MAX - b.previous) * a.speed
  if (crossA !== crossB) return crossA - crossB

  if (a.statAverage !== b.statAverage) return b.statAverage - a.statAverage

  return 0
}

function assertSpeed(speed: number) {
  if (!(speed > 0))
    throw new Error(`TurnQueue: velocidade deve ser maior que zero (${speed})`)
}
