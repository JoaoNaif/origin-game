import { Injectable } from '@nestjs/common'
import { BattleDraftsRepository } from '@/domain/combat/applications/repositories/battle-drafts-repository'
import { BattleDraft } from '@/domain/combat/entities/battle-draft'

/** Pré-batalha vale por 30 minutos: depois o jogador sorteia de novo. */
export const DRAFT_TTL_MS = 30 * 60 * 1000

/**
 * Pré-batalhas em memória (MVP): duram segundos ou minutos, até o jogador escolher o squad. Reiniciar o servidor só
 * faz o jogador sortear de novo; a seed nunca sai daqui para o cliente (D33). Com mais de um servidor, vira Redis
 * ou tabela.
 */
@Injectable()
export class MemoryBattleDraftsRepository implements BattleDraftsRepository {
  private readonly drafts = new Map<string, BattleDraft>()

  async findById(id: string): Promise<BattleDraft | null> {
    this.dropExpired()

    return this.drafts.get(id) ?? null
  }

  async create(draft: BattleDraft): Promise<void> {
    this.dropExpired()
    this.drafts.set(draft.id.toString(), draft)
  }

  async delete(draft: BattleDraft): Promise<boolean> {
    // Map.delete é síncrono: entre duas requisições ao mesmo tempo, só uma recebe true
    return this.drafts.delete(draft.id.toString())
  }

  private dropExpired() {
    const limit = Date.now() - DRAFT_TTL_MS
    for (const [id, draft] of this.drafts) {
      if (draft.createdAt.getTime() < limit) this.drafts.delete(id)
    }
  }
}
