import { DomPillar } from '@/domain/characters/enums/dom-pillar'
import { DomRole } from '@/domain/characters/enums/dom-role'
import {
  DOM_LEVEL_ORDER,
  DOM_PILLAR_ORDER,
  DOM_PILLAR_STATS,
  DOM_RULES,
  DOM_STAT_PERCENTS,
  DOM_THRESHOLDS,
  DOM_TITLES,
  domThreshold,
} from '@/domain/characters/services/dom-rules'
import {
  DOM_FEAT_RULES as F,
  DOM_PVE_WEIGHT,
} from '@/domain/combat/services/dom-feats'
import { DOM_SKILL_RULES as S } from '@/domain/combat/services/dom-skills'

const pct = (share: number) => `${Math.round(share * 100)}%`

/** Texto de cada feito (`dom_brief.md` 4.1 e 8.3, D152), com os números das constantes. Todos exigem vencer. */
const FEATS: Record<DomPillar, Record<DomRole, string>> = {
  MIND: {
    DAMAGE: `Causar dano com ${F.markedHits} skills em alvos Marcados ou Expostos`,
    TANK: `Esquivar ${F.dodges} ataques`,
    SUPPORT:
      'Dar um buff num aliado e ele abater um inimigo antes do seu próximo turno',
    CONTROL:
      'Numa mesma rodada, pôr debuff ou status em todos os inimigos vivos sem levar dano',
  },
  HEART: {
    DAMAGE: `Dar o golpe que encerra a batalha com menos de ${pct(F.lowHpShare)} do HP`,
    TANK: `Ser o alvo mais atacado da squad em ${F.mostAttackedRounds} rodadas e terminar vivo`,
    SUPPORT: `Curar aliados num total de ${pct(F.healShare)} do seu HP máximo e terminar vivo`,
    CONTROL: `Ter estado com ${F.disadvantage} ou mais vivos a menos que o inimigo e terminar vivo`,
  },
  BODY: {
    DAMAGE: `Abater ${F.roundKills} inimigos na mesma rodada com skills de alvo único`,
    TANK: `Receber mais de ${pct(F.damageTakenShare)} do dano inimigo (o segurado por escudo, Interceptar e Proteger conta)`,
    SUPPORT: `Seu escudo salvar ${F.shieldSaves} aliados diferentes de golpes que os abateriam`,
    CONTROL: `Deixar o mesmo inimigo sob Atordoado, Preso, Adormecido ou Travado em ${F.controlledTurns} turnos seguidos dele`,
  },
  AURA: {
    DAMAGE: 'Abater um inimigo de nível maior que o seu',
    TANK: 'Vencer uma squad de nível médio maior e terminar vivo',
    SUPPORT: 'Vencer uma squad de nível médio maior com a squad inteira viva',
    CONTROL: `Pôr ${F.debuffsBeforeSkip} debuffs num mesmo inimigo e ele depois perder um turno`,
  },
}

/** Skill única de cada pilar avançado (D93, `dom_brief.md` 8.4). */
const UNIQUE_SKILLS: Record<DomPillar, string> = {
  MIND: `Um inimigo perde ${S.seerDuration} turnos (Atordoado). Chance pelo DOM da Mente dele: sem ou básico ${pct(S.seerChanceByMind.BASIC)}, intermediário ${pct(S.seerChanceByMind.INTERMEDIATE)}, avançado ${pct(S.seerChanceByMind.ADVANCED)}`,
  HEART: `Cura ${S.resilientHealPower * 10}% do seu HP máximo, como qualquer cura`,
  BODY: 'Anula todo o dano que você recebe até o seu próximo turno, inclusive o dano contínuo do início dele',
  AURA: `${S.kingPercent}% em todos os stats de todos os inimigos por ${S.kingDuration} turnos deles; chance pela fórmula de status (base ${pct(S.kingBaseChance)})`,
}

/** Regras do DOM para o guia e a ficha (D60, D93, D152): as mesmas constantes que o servidor usa. */
export class DomRulesPresenter {
  static toHTTP() {
    return {
      pillars: DOM_PILLAR_ORDER.map((pillar) => ({
        pillar,
        primaryStat: DOM_PILLAR_STATS[pillar].primary,
        secondaryStat: DOM_PILLAR_STATS[pillar].secondary,
        title: DOM_TITLES[pillar],
        uniqueSkill: {
          name: DOM_TITLES[pillar],
          description: UNIQUE_SKILLS[pillar],
        },
        feats: Object.entries(FEATS[pillar]).map(([role, description]) => ({
          role,
          description,
        })),
      })),
      levels: DOM_LEVEL_ORDER.map((level) => ({
        level,
        threshold: DOM_THRESHOLDS[level],
        thresholdWithoutVariant: domThreshold(level, false),
        primaryPercent: DOM_STAT_PERCENTS[level].primary,
        secondaryPercent: DOM_STAT_PERCENTS[level].secondary,
      })),
      window: DOM_RULES.window,
      checkEvery: DOM_RULES.checkEvery,
      lossShare: DOM_RULES.lossShare,
      advancedRoles: DOM_RULES.advancedRoles,
      advancedRolePoints: DOM_RULES.advancedRolePoints,
      pveWeights: DOM_PVE_WEIGHT,
    }
  }
}
