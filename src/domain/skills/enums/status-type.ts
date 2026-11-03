/** Status (`skills_brief.md` 11.9, valores em 12.4). Usado por skills e passivas. */
export const StatusType = {
  STUN: 'STUN',
  LOCK: 'LOCK',
  ROOT: 'ROOT',
  EXPOSE: 'EXPOSE',
  MARK: 'MARK',
  DOT: 'DOT',
  /** Provocado (D124): golpes de alvo único só em quem provocou, na próxima ação. */
  TAUNT: 'TAUNT',
  /** Silenciado (D146): na próxima ação, só a skill básica. */
  SILENCE: 'SILENCE',
  /** Adormecido (D146): perde as ações até levar dano. */
  SLEEP: 'SLEEP',
  /** Ligado (D146): parte do dano que um leva também atinge o parceiro. */
  LINK: 'LINK',
  /** Furtivo (D146): não pode ser alvo único até agir. */
  STEALTH: 'STEALTH',
  /** Contágio (D146): o Dano contínuo passa para os aliados adjacentes. */
  CONTAGION: 'CONTAGION',
} as const

export type StatusType = (typeof StatusType)[keyof typeof StatusType]
