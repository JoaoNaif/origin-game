import { CharacterClass } from '@/domain/characters/enums/character-class'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { GridPosition } from '@/domain/squads/value-objects/grid-position'
import { isAdjacent } from './battle-grid'

export interface InterceptCandidate extends GridPosition {
  ref: string
  characterClass: CharacterClass
  /** Atordoado ou Preso não intercepta (12.8). */
  canAct: boolean
}

export interface InterceptAttack {
  /** Alvo original do golpe. */
  targetRef: string
  targetCell: GridPosition
  range: SkillRange | null
  area: SkillArea
}

/** Só golpes de alvo único, corpo a corpo ou à distância (11.6, 12.8). */
export function canBeIntercepted(attack: InterceptAttack): boolean {
  return (
    attack.area === SkillArea.SINGLE &&
    (attack.range === SkillRange.MELEE || attack.range === SkillRange.RANGED)
  )
}

/**
 * Interceptar do Guardião (D102, 12.8): passiva de classe, automática, sem Desgaste. Uma vez por rodada por Guardião,
 * o primeiro golpe de alvo único (corpo a corpo ou à distância) contra um aliado **adjacente** é desviado para ele. O
 * dano é calculado contra a Defesa do Guardião, e qualquer status do golpe cai nele.
 */
export class InterceptState {
  /** Rodada em que cada Guardião interceptou pela última vez. */
  private readonly usedInRound = new Map<string, number>()

  /**
   * `guardians` na ordem de prioridade, fixa pela seed no início da batalha (com mais de um Guardião). Devolve quem
   * intercepta, ou `undefined` se ninguém (e o golpe segue para o alvo original).
   */
  intercept(
    attack: InterceptAttack,
    guardians: readonly InterceptCandidate[],
    round: number,
    options: { dryRun?: boolean } = {}
  ): string | undefined {
    if (!canBeIntercepted(attack)) return undefined

    const interceptor = guardians.find(
      (g) =>
        g.characterClass === CharacterClass.GUARDIAN &&
        g.canAct &&
        g.ref !== attack.targetRef &&
        isAdjacent(g, attack.targetCell) &&
        this.usedInRound.get(g.ref) !== round
    )

    // dryRun: só prevê (a IA, `engine.md` 3.13), sem gastar o Interceptar da rodada
    if (interceptor && !options.dryRun)
      this.usedInRound.set(interceptor.ref, round)

    return interceptor?.ref
  }
}
