import { Lineage } from '@/domain/characters/enums/lineage'
import { Stat } from '@/domain/characters/enums/stat'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'

/** O Desgaste nunca leva o stat abaixo de 80% do base (D91): perde no máximo 20%. */
export const DESGASTE_FLOOR = 0.8

/** Potência da skill quando não há folga nenhuma (9.4b; 70% desde o D119, era 50%). */
export const POTENCY_AT_FLOOR = 0.7

/** Ressonância (D97): fração do custo que cai nas outras linhagens, pelo número de variantes. */
export const RESONANCE_BY_VARIANTS: Record<number, number> = {
  1: 0,
  2: 0.6,
  3: 0.4,
}

/** Desconto nas skills não despertadas quando há uma despertada na build (D96). */
export const AWAKENED_DISCOUNT = 0.75

/** Onde o custo de cada linhagem cai (9.4, D59). */
export type CostTarget =
  | 'MAX_HP'
  | 'CURRENT_HP'
  | typeof Stat.DEFENSE
  | typeof Stat.PRECISION
  | typeof Stat.WILL
  | typeof Stat.EVASION

export const LINEAGE_COST_TARGET: Record<Lineage, CostTarget> = {
  FUNDAMENTAL: 'MAX_HP',
  ELEMENTAL: 'CURRENT_HP',
  MATERIAL: Stat.DEFENSE,
  VECTORIAL: Stat.PRECISION,
  PSYCHIC: Stat.WILL,
  BIOLOGICAL: Stat.EVASION,
  // Skill none (D107): Defesa. Divide o stat com a Material, mas quem usa none não tem variante (sem ressonância),
  // então nunca paga os dois ao mesmo tempo.
  NONE: Stat.DEFENSE,
}

/** Alívio do Desgaste acumulado (9.4b, placeholders aprovados). */
export const RELIEF = {
  HEAL: 0.2,
  DEFEND: 0.1,
  RECOVERY_SKILL: 0.5,
} as const

/** O que o motor precisa saber da skill para cobrar o Desgaste. */
export interface DesgasteSkill {
  lineage: Lineage
  isAwakened: boolean
  /** % do stat base da linhagem. */
  desgastePercent: number
}

export interface DesgasteUnit {
  /** Stats fora de batalha (o "stat base" do piso de 80%). */
  baseStats: StatBlock
  /** Linhagens das variantes (principal primeiro); vazio = sem variante. */
  lineages: readonly Lineage[]
  /** A build tem skill despertada (ativa o desconto do D96). */
  hasAwakenedSkill: boolean
  /** Modificadores de custo por linhagem, em % (ex.: sangue puro −10%, D88). */
  lineageCostPercent?: Partial<Record<Lineage, number>>
}

export interface DesgasteCharge {
  target: CostTarget
  /** Quanto foi pedido, em unidades do stat. */
  requested: number
  /** Quanto foi cobrado de fato (limitado pela folga até o piso). */
  applied: number
}

export interface ChargeResult {
  /** Multiplicador da potência (dano, cura, buff, debuff): 1 com folga, 0,7 sem folga (D119). Duração e acerto não mudam. */
  potency: number
  charges: DesgasteCharge[]
  /** Dano em si (Elemental): o chamador tira do HP atual. */
  selfDamage: number
}

type LossTarget = Exclude<CostTarget, 'CURRENT_HP'>

/**
 * Desgaste de uma unidade na batalha (9.4b, D71, D91, D96, D97). Acumula como perda nos stats da linhagem, nunca
 * passa do piso de 80% do base e some no fim da batalha (D32). Não usa aleatoriedade: custo é lei.
 */
export class DesgasteState {
  private readonly lost: Record<LossTarget, number> = {
    MAX_HP: 0,
    DEFENSE: 0,
    PRECISION: 0,
    WILL: 0,
    EVASION: 0,
  }

  constructor(private readonly unit: DesgasteUnit) {}

  /** Perda acumulada (em unidades do stat). */
  lostOf(target: LossTarget): number {
    return this.lost[target]
  }

  /**
   * Desgaste acumulado total, como soma das frações perdidas de cada stat (ex.: 10% de Defesa + 5% de Precisão = 0,15).
   * Usado no desempate do fim forçado (D72). O dano em si do Elemental já conta no HP, então não entra aqui.
   */
  totalFraction(): number {
    return (Object.keys(this.lost) as LossTarget[]).reduce((total, target) => {
      const stat = target === 'MAX_HP' ? Stat.HP : target
      return total + this.lost[target] / this.unit.baseStats[stat]
    }, 0)
  }

  /** HP máximo atual (Fundamental reduz o máximo). */
  get maxHp(): number {
    return this.unit.baseStats.HP - this.lost.MAX_HP
  }

  /** Stat com o Desgaste aplicado (antes de buffs e debuffs). */
  stat(stat: Stat): number {
    if (stat === Stat.HP) return this.maxHp

    const loss = stat in this.lost ? this.lost[stat as LossTarget] : 0

    return this.unit.baseStats[stat] - loss
  }

  /** Quanto ainda pode ser cobrado até o piso. `currentHp` é usado só pelo custo Elemental. */
  slack(target: CostTarget, currentHp: number): number {
    if (target === 'CURRENT_HP') {
      return Math.max(0, currentHp - this.floorOf(Stat.HP))
    }

    const stat = target === 'MAX_HP' ? Stat.HP : target
    const max = this.unit.baseStats[stat] - this.floorOf(stat)

    return Math.max(0, max - this.lost[target])
  }

  /** Custos que a skill pediria agora (sem cobrar). */
  costOf(skill: DesgasteSkill): Omit<DesgasteCharge, 'applied'>[] {
    const multiplier = this.costMultiplier(skill)
    const own = skill.lineage
    const requests = [{ lineage: own, share: 1 }]

    // Ressonância por variante: tira a variante da própria skill (a primeira com a mesma linhagem) e cobra a
    // fração nas demais. Duas variantes da mesma linhagem cobram as duas partes no mesmo stat.
    const resonance = RESONANCE_BY_VARIANTS[this.unit.lineages.length] ?? 0
    if (resonance > 0) {
      const others = [...this.unit.lineages]
      const ownIndex = others.indexOf(own)
      if (ownIndex >= 0) others.splice(ownIndex, 1)

      for (const lineage of others) {
        requests.push({ lineage, share: resonance })
      }
    }

    return requests.map(({ lineage, share }) => {
      const target = LINEAGE_COST_TARGET[lineage]
      const base =
        this.unit.baseStats[
          target === 'MAX_HP' || target === 'CURRENT_HP' ? Stat.HP : target
        ]

      return {
        target,
        requested: (base * skill.desgastePercent * multiplier * share) / 100,
      }
    })
  }

  /**
   * Potência da skill agora, sem cobrar (o motor calcula o efeito antes de saber se a skill acertou alguém):
   * `0,7 + 0,3 × min(1, folga / custo)` na linhagem da própria skill (D119).
   */
  potencyFor(skill: DesgasteSkill, currentHp: number): number {
    const own = this.costOf(skill)[0]
    const ownSlack = this.slack(own.target, currentHp)
    const ratio = own.requested > 0 ? Math.min(1, ownSlack / own.requested) : 1

    return POTENCY_AT_FLOOR + (1 - POTENCY_AT_FLOOR) * ratio
  }

  /**
   * Cobra o Desgaste da skill (chamar só se ela produziu efeito em pelo menos 1 alvo; errar não cobra). Devolve a
   * potência, que depende da folga na linhagem da própria skill: com folga ≥ custo, 100%; parcial, interpola;
   * sem folga, 70% (D119).
   */
  charge(skill: DesgasteSkill, currentHp: number): ChargeResult {
    const requests = this.costOf(skill)
    const potency = this.potencyFor(skill, currentHp)

    let selfDamage = 0
    let hp = currentHp
    const charges: DesgasteCharge[] = []

    for (const request of requests) {
      const applied = Math.min(
        request.requested,
        this.slack(request.target, hp)
      )

      if (request.target === 'CURRENT_HP') {
        selfDamage += applied
        hp -= applied
      } else {
        this.lost[request.target] += applied
      }

      charges.push({ ...request, applied })
    }

    return { potency, charges, selfDamage }
  }

  /**
   * Alivia parte do Desgaste acumulado (cura 20%, Defender 10%, skill de recuperação 50%). A cura comum não
   * recupera o HP máximo perdido pela Fundamental (D59); só a skill de recuperação.
   */
  relieve(fraction: number, options: { includeMaxHp?: boolean } = {}) {
    for (const target of Object.keys(this.lost) as LossTarget[]) {
      if (target === 'MAX_HP' && !options.includeMaxHp) continue
      this.lost[target] -= this.lost[target] * fraction
    }
  }

  private floorOf(stat: Stat): number {
    return this.unit.baseStats[stat] * DESGASTE_FLOOR
  }

  private costMultiplier(skill: DesgasteSkill): number {
    const awakenedDiscount =
      this.unit.hasAwakenedSkill && !skill.isAwakened ? AWAKENED_DISCOUNT : 1
    const lineagePercent = this.unit.lineageCostPercent?.[skill.lineage] ?? 0

    return awakenedDiscount * (1 + lineagePercent / 100)
  }
}
