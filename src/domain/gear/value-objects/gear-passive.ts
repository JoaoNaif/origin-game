/**
 * Efeito leve da linhagem do equipamento (D94, `living_gear_brief.md` 9.5), já com o multiplicador do grau e o fator do
 * elo. Fica fora das passivas do modelo: cada linhagem tem um só, fixo no código.
 */
export type GearPassive =
  /** Elemental: chance (0 a 1, pela fórmula de status) de aplicar Dano contínuo ao causar dano num inimigo. */
  | { type: 'DOT_ON_HIT'; chance: number }
  /** Material: % a menos de dano recebido de golpes de alvo único. */
  | { type: 'SINGLE_TARGET_REDUCTION'; percent: number }
  /** Vetorial: ignora este % da Defesa do alvo. */
  | { type: 'IGNORE_DEFENSE'; percent: number }
  /** Psíquica: +% de Vontade contra aplicação de status. */
  | { type: 'STATUS_WILL'; percent: number }
  /** Biológica: regenera este % do HP máximo no início de cada turno. */
  | { type: 'REGEN'; percentOfMaxHp: number }
  /** Fundamental: escudo inicial deste % do HP máximo. */
  | { type: 'INITIAL_SHIELD'; percentOfMaxHp: number }

export type GearPassiveType = GearPassive['type']
