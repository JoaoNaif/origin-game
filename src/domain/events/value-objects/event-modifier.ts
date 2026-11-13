/**
 * Modificador de regra da pesquisa (D155, `events_brief.md` 5.2). O campo fixo é o `fieldKey` do evento e "uma linhagem
 * só" é o requisito `LINEAGE`; os demais mudam a batalha e vão na foto (`BattleSnapshot.rules`).
 */
export type EventModifier =
  /** Todas as unidades (dos dois lados) jogam neste nível: os stats saem do perfil no nível dado. */
  | { type: 'LEVELED_STATS'; level: number }
  /** A Exaustão começa depois desta rodada (o normal é depois da 3). */
  | { type: 'EARLY_EXHAUSTION'; afterRound: number }
  /** Nenhuma cura (skill, passiva, regeneração); escudo continua. */
  | { type: 'NO_HEALING' }
  /** Todas as unidades com a mesma Velocidade (a média do início). */
  | { type: 'EQUAL_SPEED' }

export type EventModifierType = EventModifier['type']
