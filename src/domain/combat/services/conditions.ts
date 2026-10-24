import { Stat } from '@/domain/characters/enums/stat'
import { StatusType } from '@/domain/skills/enums/status-type'

/** Valores dos status (`skills_brief.md` 12.4, D92). Duração em turnos do afetado (D31). */
export const STATUS_RULES = {
  STUN: { duration: 1, baseChance: 0.7 },
  /** Instantâneo: +2 de recarga numa skill do alvo (aplicado pela resolução, que conhece as recargas). */
  LOCK: { extraCooldown: 2, baseChance: 0.8 },
  ROOT: { duration: 2, baseChance: 0.8 },
  EXPOSE: { duration: 2, baseChance: 0.85 },
  MARK: { duration: 3, baseChance: 0.8, damageTakenPercent: 20 },
  DOT: { duration: 3, baseChance: 0.8, maxHpPercentPerTurn: 4 },
  /** Vale na próxima ação do afetado e acaba no fim dela (D124). */
  TAUNT: { duration: 1, baseChance: 0.8 },
} as const

/** Ferida (D125): com Dano contínuo, a cura recebida rende metade. */
export const WOUND_HEAL_MULTIPLIER = 0.5

/** Marca do Controlador (D125): nos status dele, a Vontade do alvo conta 30% menos. */
export const CONTROLLER_WILL_FACTOR = 0.7

/** Depois de perder a ação pelo Atordoado, fica imune a novo Atordoado por 1 turno (anti-cadeia, 11.9). */
export const STUN_IMMUNITY_TURNS = 1

/** Limite de fontes ativas por stat (D92): 2 buffs e 2 debuffs. */
export const MAX_SOURCES_PER_DIRECTION = 2

export type StatusApplication = 'APPLIED' | 'RENEWED' | 'IMMUNE'

export type ModifierApplication = 'ADDED' | 'RENEWED' | 'REPLACED' | 'IGNORED'

interface ActiveStatus {
  turnsLeft: number
  /** Marcado: % de dano a mais; dano contínuo: % do HP máximo por turno. */
  value: number
}

export interface StatModifier {
  /** Quem gerou (normalmente a `key` da skill): a mesma fonte renova, não soma (9.5b). */
  source: string
  stat: Stat
  /** + buff, − debuff (multiplicativo, D73). */
  percent: number
  turnsLeft: number
  /** Fora do limite de 2 fontes (Defender, campo de batalha: D98, D102). */
  unlimited?: boolean
  /** Vale até o fim da próxima ação do afetado, em vez de contar turnos (Comando e Coordenação, D126). */
  untilAction?: boolean
}

export interface TurnStart {
  /** Atordoado: perde esta ação. */
  skipAction: boolean
  /** Dano contínuo do início do turno (ignora a Defesa, D92); a resolução tira do alvo. */
  dotDamage: number
}

/**
 * Status e modificadores de stat de uma unidade na batalha (11.9, 11.10, 12.4, 12.5). Durações contam em turnos do
 * próprio afetado (D31) e baixam no início do turno dele. Não usa aleatoriedade: a chance de aplicar é decidida antes
 * (`statusChance` + `roll`).
 */
export class UnitConditions {
  private readonly statuses = new Map<StatusType, ActiveStatus>()
  private modifiers: StatModifier[] = []
  private stunImmunity = 0

  /** Cópia independente (previsão da IA, `BattleEngine.fork`). */
  clone(): UnitConditions {
    const copy = new UnitConditions()
    for (const [status, active] of this.statuses) {
      copy.statuses.set(status, { ...active })
    }
    copy.modifiers = this.modifiers.map((m) => ({ ...m }))
    copy.stunImmunity = this.stunImmunity

    return copy
  }

  has(status: StatusType): boolean {
    return this.statuses.has(status)
  }

  /** Status ativos agora (a tela mostra; a IA lê). */
  active(): StatusType[] {
    return [...this.statuses.keys()]
  }

  turnsLeft(status: StatusType): number {
    return this.statuses.get(status)?.turnsLeft ?? 0
  }

  get isStunImmune() {
    return this.stunImmunity > 0
  }

  /** Preso (11.9): não pode se mover nem ser movido. */
  get canBeMoved() {
    return !this.has(StatusType.ROOT)
  }

  /** Exposto (11.9): vira alvo de corpo a corpo mesmo atrás de alguém. */
  get isExposed() {
    return this.has(StatusType.EXPOSE)
  }

  /** Multiplicador do dano recebido (Marcado). */
  get damageTakenMultiplier() {
    return 1 + (this.statuses.get(StatusType.MARK)?.value ?? 0) / 100
  }

  /**
   * Aplica um status com duração. O mesmo status de novo **renova** (fica a maior duração e o maior valor), não soma.
   * O Travado é instantâneo e não passa por aqui.
   */
  applyStatus(
    status: Exclude<StatusType, 'LOCK'>,
    duration: number,
    value = 0
  ): StatusApplication {
    if (status === StatusType.STUN && this.isStunImmune) return 'IMMUNE'

    const current = this.statuses.get(status)
    if (current) {
      current.turnsLeft = Math.max(current.turnsLeft, duration)
      current.value = Math.max(current.value, value)
      return 'RENEWED'
    }

    this.statuses.set(status, { turnsLeft: duration, value })

    return 'APPLIED'
  }

  /** Aplica um status com os valores padrão do 12.4. */
  applyDefaultStatus(status: Exclude<StatusType, 'LOCK'>): StatusApplication {
    switch (status) {
      case StatusType.MARK:
        return this.applyStatus(
          status,
          STATUS_RULES.MARK.duration,
          STATUS_RULES.MARK.damageTakenPercent
        )
      case StatusType.DOT:
        return this.applyStatus(
          status,
          STATUS_RULES.DOT.duration,
          STATUS_RULES.DOT.maxHpPercentPerTurn
        )
      default:
        return this.applyStatus(status, STATUS_RULES[status].duration)
    }
  }

  /**
   * Início do turno do afetado: aplica o dano contínuo, consome o Atordoado (perde a ação e ganha imunidade) e baixa
   * 1 de todas as durações.
   */
  startTurn(maxHp: number): TurnStart {
    const dot = this.statuses.get(StatusType.DOT)
    const dotDamage = dot ? Math.round((maxHp * dot.value) / 100) : 0

    if (this.stunImmunity > 0) this.stunImmunity -= 1

    const skipAction = this.has(StatusType.STUN)
    if (skipAction) this.stunImmunity = STUN_IMMUNITY_TURNS

    for (const [status, active] of this.statuses) {
      // o Provocado vale na ação deste turno: acaba no fim dela (afterAction)
      if (status === StatusType.TAUNT) continue
      active.turnsLeft -= 1
      if (active.turnsLeft <= 0) this.statuses.delete(status)
    }

    for (const modifier of this.modifiers) {
      if (!modifier.untilAction) modifier.turnsLeft -= 1
    }
    this.modifiers = this.modifiers.filter((m) => m.turnsLeft > 0)

    return { skipAction, dotDamage }
  }

  /** Tira um status (skill de executar que consome, D125). */
  remove(status: StatusType) {
    this.statuses.delete(status)
  }

  /** Fim da ação do afetado: o Provocado acaba (D124). */
  afterAction() {
    this.statuses.delete(StatusType.TAUNT)
    this.modifiers = this.modifiers.filter((m) => !m.untilAction)
  }

  /**
   * Adiciona um buff ou debuff (D73, D92). A mesma fonte renova (maior duração e maior valor). Com 2 fontes no mesmo
   * sentido, a nova substitui a mais fraca se for mais forte ou igual; se for mais fraca, é ignorada.
   */
  addModifier(modifier: StatModifier): ModifierApplication {
    const same = this.modifiers.find(
      (m) => m.source === modifier.source && m.stat === modifier.stat
    )
    if (same) {
      same.turnsLeft = Math.max(same.turnsLeft, modifier.turnsLeft)
      if (Math.abs(modifier.percent) > Math.abs(same.percent)) {
        same.percent = modifier.percent
      }
      return 'RENEWED'
    }

    if (modifier.unlimited) {
      this.modifiers.push({ ...modifier })
      return 'ADDED'
    }

    const sameDirection = this.modifiers.filter(
      (m) =>
        !m.unlimited &&
        m.stat === modifier.stat &&
        Math.sign(m.percent) === Math.sign(modifier.percent)
    )

    if (sameDirection.length < MAX_SOURCES_PER_DIRECTION) {
      this.modifiers.push({ ...modifier })
      return 'ADDED'
    }

    const weakest = sameDirection.reduce((a, b) =>
      Math.abs(a.percent) <= Math.abs(b.percent) ? a : b
    )
    if (Math.abs(modifier.percent) < Math.abs(weakest.percent)) {
      return 'IGNORED'
    }

    this.modifiers = this.modifiers.filter((m) => m !== weakest)
    this.modifiers.push({ ...modifier })

    return 'REPLACED'
  }

  modifiersOf(stat: Stat): readonly StatModifier[] {
    return this.modifiers.filter((m) => m.stat === stat)
  }

  /** Multiplicador do stat: produto de (1 + % / 100) de todas as fontes (ordem não importa, D73). */
  statMultiplier(stat: Stat): number {
    return this.modifiersOf(stat).reduce(
      (total, m) => total * (1 + m.percent / 100),
      1
    )
  }

  /** Stat efetivo: o valor já com Desgaste × multiplicador dos buffs e debuffs. */
  effectiveStat(stat: Stat, valueWithDesgaste: number): number {
    return valueWithDesgaste * this.statMultiplier(stat)
  }
}
