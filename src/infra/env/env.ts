import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3333),

  DATABASE_URL: z.string().url(),

  // Origens do front que podem chamar a API (CORS), separadas por vírgula.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),

  // Limite de requisições por IP (cadastro e login têm limites mais duros). Os e2e desligam.
  // z.coerce.boolean() não serve: 'false' é string não-vazia, viraria true.
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  // Login: par de chaves RSA (RS256) em base64 (ver .env.example).
  JWT_PRIVATE_KEY: z.string(),
  JWT_PUBLIC_KEY: z.string(),
  // Validade do token de acesso. Curta de propósito: a sessão longa vem do refresh token.
  JWT_EXPIRES_IN: z.string().default('15m'),
})

export type Env = z.infer<typeof envSchema>
