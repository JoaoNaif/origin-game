import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { Account } from '@/domain/accounts/entities/account'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import { BattleDraft } from '../../entities/battle-draft'
import { BuildSnapshotError } from '../../errors/build-snapshot-error'
import { SnapshotField } from '../../value-objects/battle-snapshot'
import { Clock } from '@/core/gateways/clock'
import { SeedGenerator } from '../gateways/seed-generator'
import { BattleDraftsRepository } from '../repositories/battle-drafts-repository'
import { catalogFields, drawField } from '../services/pve-session'

interface DraftPveBattleUseCaseRequest {
  username: string
  npcSquadKey: string
}

type DraftPveBattleUseCaseResponse = Either<
  ResourceNotFoundError | BuildSnapshotError,
  { draft: BattleDraft; npcSquad: NpcSquad; field: SnapshotField | null }
>

/**
 * Pré-batalha contra a máquina (`pvp_brief.md` 3, D28, D112): escolhe o adversário, sorteia a seed e, por ela, o campo
 * entre todos do catálogo. O campo é mostrado **antes** de o jogador escolher o squad.
 */
export class DraftPveBattleUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private catalogRepository: CatalogRepository,
    private battleDraftsRepository: BattleDraftsRepository,
    private seedGenerator: SeedGenerator,
    private clock: Clock
  ) {}

  async execute({
    username,
    npcSquadKey,
  }: DraftPveBattleUseCaseRequest): Promise<DraftPveBattleUseCaseResponse> {
    const account = await this.accountsRepository.findByUsername(
      Account.normalizeUsername(username)
    )
    if (!account) return left(new ResourceNotFoundError('conta'))

    const catalog = await this.catalogRepository.load()
    const npcSquad = catalog.npcSquads.find((s) => s.key === npcSquadKey)
    if (!npcSquad) return left(new ResourceNotFoundError('squad de NPC'))

    const fields = catalogFields(catalog)
    if (fields.isLeft()) return left(fields.value)

    const seed = this.seedGenerator.next()
    const field = drawField(fields.value, seed)

    const draft = BattleDraft.create({
      accountId: account.id,
      npcSquadId: npcSquad.id,
      seed,
      fieldKey: field?.key ?? null,
      createdAt: this.clock.now(),
    })
    await this.battleDraftsRepository.create(draft)

    return right({ draft, npcSquad, field })
  }
}
