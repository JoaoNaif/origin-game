/** Perfil da IA da máquina (D90): muda só os pesos da pontuação (`pvp_brief.md` 8.1). */
export const AiProfile = {
  AGGRESSIVE: 'AGGRESSIVE',
  CAUTIOUS: 'CAUTIOUS',
  FINISHER: 'FINISHER',
  BALANCED: 'BALANCED',
} as const

export type AiProfile = (typeof AiProfile)[keyof typeof AiProfile]
