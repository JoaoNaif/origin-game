import { BattleSide } from '@/domain/combat/enums/battle-enums'
import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { LOG_WEIGHTS, PROTECTION_BONUS } from '../ai-values'

/** Uma ação do jogador como a IA a viu. */
export interface LoggedAction {
  actorRef: string
  skillKey: string | null
  /** Aliados da IA atingidos pela ação (dano direto). */
  targetRefs: string[]
}

export interface FocusReading {
  /** Personagem da IA que o jogador está focando. */
  ref: string
  /** Bônus de proteção antes da escala do nível (0,15 indício, 0,30 padrão). */
  bonus: number
}

const STRONG_TIERS: readonly string[] = [SkillTier.STRONG, SkillTier.FINAL]

/**
 * Log do jogador dentro da batalha (D90, `pvp_brief.md` 10.2). Lê os eventos do motor, só o que o jogador fez e a IA
 * viu: alvo atingido, skill usada, defesa e movimento. Não passa entre batalhas.
 */
export class PlayerLog {
  private readonly actions: LoggedAction[] = []
  private readonly seenSkills = new Set<string>()
  private cursor = 0

  constructor(private readonly side: BattleSide) {}

  /** Lê os eventos novos do motor. */
  update(engine: BattleEngine) {
    const events = engine.events
    let open: LoggedAction | null = null

    for (; this.cursor < events.length; this.cursor++) {
      const event = events[this.cursor]
      switch (event.type) {
        case 'SKILL':
          open = null
          if (this.isPlayer(engine, event.ref)) {
            open = {
              actorRef: event.ref,
              skillKey: event.skillKey,
              targetRefs: [],
            }
            this.actions.push(open)
            this.seenSkills.add(event.skillKey)
          }
          break
        case 'DAMAGE':
          if (
            open &&
            event.ref === open.actorRef &&
            !this.isPlayer(engine, event.targetRef) &&
            !open.targetRefs.includes(event.targetRef)
          ) {
            open.targetRefs.push(event.targetRef)
          }
          break
        case 'DEFEND':
        case 'MOVE':
          if (
            !('forced' in event && event.forced) &&
            this.isPlayer(engine, event.ref)
          ) {
            open = null
            this.actions.push({
              actorRef: event.ref,
              skillKey: null,
              targetRefs: [],
            })
          }
          break
        case 'TURN':
          open = null
          break
      }
    }
  }

  /** Ações mais recentes primeiro. */
  recent(window: number): LoggedAction[] {
    return this.actions.slice(-window).reverse()
  }

  /**
   * Personagem focado (10.2): o mais atacado na janela, pelos pesos 1,0 / 0,8 / 0,6 / 0,4 / 0,2; o bônus sai dos ataques
   * **seguidos** nele a partir da ação mais recente (2 = indício, 3 = padrão). Com janela de 1 (Intermediário), o
   * último ataque já conta como indício.
   */
  focus(window: number): FocusReading | null {
    const recent = this.recent(window)
    if (recent.length === 0) return null

    const weight = new Map<string, number>()
    recent.forEach((action, i) => {
      for (const ref of action.targetRefs) {
        weight.set(ref, (weight.get(ref) ?? 0) + (LOG_WEIGHTS[i] ?? 0))
      }
    })
    const favorite = [...weight].sort((a, b) => b[1] - a[1])[0]
    if (!favorite) return null

    const [ref] = favorite
    let streak = 0
    for (const action of recent) {
      if (!action.targetRefs.includes(ref)) break
      streak += 1
    }

    const hintAt = Math.min(2, window)
    const bonus =
      streak >= 3
        ? PROTECTION_BONUS.PATTERN
        : streak >= hintAt
          ? PROTECTION_BONUS.HINT
          : 0

    return bonus > 0 ? { ref, bonus } : null
  }

  /** Mestre e Grão-mestre: alguma skill forte já vista do jogador está pronta de novo. */
  strongSkillReady(engine: BattleEngine): boolean {
    const enemySide =
      this.side === BattleSide.PLAYER ? BattleSide.OPPONENT : BattleSide.PLAYER

    return engine.aliveRefs(enemySide).some((ref) => {
      const ready = engine.unit(ref).readySkills
      return engine
        .skillsOf(ref)
        .some(
          (s) =>
            this.seenSkills.has(s.key) &&
            (STRONG_TIERS.includes(s.tier) || s.isAwakened) &&
            ready.includes(s.key)
        )
    })
  }

  /** Lado do jogador, visto pela IA (o outro lado). */
  private isPlayer(engine: BattleEngine, ref: string): boolean {
    return engine.unit(ref).side !== this.side
  }
}
