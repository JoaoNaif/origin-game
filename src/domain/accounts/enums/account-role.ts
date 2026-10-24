/**
 * Papel da conta. O admin cuida do conteúdo (catálogo: variantes, traços, personagens, skills, campos, squads de NPC);
 * por enquanto só o papel existe, sem rotas de admin. Uma conta vira admin pelo seed ou pelo banco
 * (`npm run admin:promote`), nunca por uma rota.
 */
export const AccountRole = {
  PLAYER: 'PLAYER',
  ADMIN: 'ADMIN',
} as const

export type AccountRole = (typeof AccountRole)[keyof typeof AccountRole]
