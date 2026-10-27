import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Agent, signUp } from './accounts'

/** Cadastra, entra e vira admin direto no banco (pela API ninguém vira admin): devolve o cliente já logado. */
export async function signUpAdmin(
  app: INestApplication,
  prisma: PrismaClient,
  username: string
): Promise<Agent> {
  const agent = await signUp(app, username)
  await prisma.account.update({ where: { username }, data: { role: 'ADMIN' } })

  return agent
}

/** Um item do `GET /admin/catalog` (formato do corpo de edição, mais campos só de leitura). */
export type AdminItem = Record<string, unknown> & { key: string }

export interface AdminCatalogBody {
  version: string
  variants: AdminItem[]
  traits: AdminItem[]
  templates: AdminItem[]
  skills: AdminItem[]
  fields: AdminItem[]
  npcSquads: (AdminItem & {
    members: { level: number; skillKeys: string[] }[]
  })[]
}

export async function adminCatalog(agent: Agent): Promise<AdminCatalogBody> {
  return (await agent.get('/admin/catalog')).body.catalog
}
