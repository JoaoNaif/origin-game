import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Clock } from '@/core/gateways/clock'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { SeedGenerator } from '@/domain/combat/applications/gateways/seed-generator'
import { BattleDraftsRepository } from '@/domain/combat/applications/repositories/battle-drafts-repository'
import {
  catalogFields,
  drawField,
} from '@/domain/combat/applications/services/pve-session'
import { BattleDraft } from '@/domain/combat/entities/battle-draft'
import { BuildSnapshotError } from '@/domain/combat/errors/build-snapshot-error'
import { SnapshotField } from '@/domain/combat/value-objects/battle-snapshot'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import { EventTemplate } from '../../entities/event-template'
import { EventPhase } from '../../enums/event-phase'
import { InvalidEventError } from '../../errors/invalid-event-error'
import { EventBattles } from '../services/event-battles'

interface DraftEventBattleUseCaseRequest {
  accountId: string
  eventKey: string
}

type DraftEventBattleUseCaseResponse = Either<
  ResourceNotFoundError | InvalidEventError | BuildSnapshotError,
  {
    draft: BattleDraft
    event: EventTemplate
    /** A etapa (base 0) que a batalha joga. */
    stage: number
    npcSquad: NpcSquad
    field: SnapshotField | null
  }
>

/**
 * Pré-batalha da próxima etapa do evento (D155): o adversário é o squad de NPC da etapa e o campo é o fixo do evento
 * (pesquisa) ou o sorteado, como no PvE (D112). A batalha começa no `POST /battles` de sempre, que confere de novo a
 * entrada (requisitos, squad travado) e conta a tentativa.
 */
export class DraftEventBattleUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private catalogRepository: CatalogRepository,
    private battleDraftsRepository: BattleDraftsRepository,
    private eventBattles: EventBattles,
    private seedGenerator: SeedGenerator,
    private clock: Clock
  ) {}

  async execute({
    accountId,
    eventKey,
  }: DraftEventBattleUseCaseRequest): Promise<DraftEventBattleUseCaseResponse> {
    const account = await this.accountsRepository.findById(accountId)
    if (!account) return left(new ResourceNotFoundError('conta'))

    const catalog = await this.catalogRepository.load()
    const event = [...catalog.events.values()].find((e) => e.key === eventKey)
    const now = this.clock.now()
    if (!event || event.phaseAt(now) === EventPhase.HIDDEN) {
      return left(new ResourceNotFoundError('evento'))
    }
    if (!event.isOpenAt(now)) {
      return left(new InvalidEventError('o evento não está aberto'))
    }

    const { entry } = await this.eventBattles.findEntry(accountId, event, now)
    const playError = entry.playError(event.attemptLimit, now)
    if (playError) return left(new InvalidEventError(playError))

    const stage = entry.clearedStages
    const npcSquad = catalog.npcSquads.find(
      (s) => s.key === event.stages[stage].npcSquadKey
    )
    if (!npcSquad) return left(new ResourceNotFoundError('squad de NPC'))

    const fields = catalogFields(catalog)
    if (fields.isLeft()) return left(fields.value)

    const seed = this.seedGenerator.next()
    const field = event.fieldKey
      ? (fields.value.find((f) => f.key === event.fieldKey) ?? null)
      : drawField(fields.value, seed)

    const draft = BattleDraft.create({
      accountId: account.id,
      npcSquadId: npcSquad.id,
      seed,
      fieldKey: field?.key ?? null,
      createdAt: now,
      event: { eventId: event.id.toString(), stage },
    })
    await this.battleDraftsRepository.create(draft)

    return right({ draft, event, stage, npcSquad, field })
  }
}
