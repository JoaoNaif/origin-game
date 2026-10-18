/** Status (`skills_brief.md` 11.9, valores em 12.4). Usado por skills e passivas. */
export const StatusType = {
  STUN: 'STUN',
  LOCK: 'LOCK',
  ROOT: 'ROOT',
  EXPOSE: 'EXPOSE',
  MARK: 'MARK',
  DOT: 'DOT',
} as const

export type StatusType = (typeof StatusType)[keyof typeof StatusType]
