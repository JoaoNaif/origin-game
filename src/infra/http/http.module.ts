import { Module } from '@nestjs/common'
import { CryptographyModule } from '../cryptography/cryptography.module'
import { DatabaseModule } from '../database/database.module'
import { GatewaysModule } from '../gateways/gateways.module'
import { CreateCatalogEntryController } from './controllers/admin/create-catalog-entry.controller'
import { DeleteCatalogEntryController } from './controllers/admin/delete-catalog-entry.controller'
import { FetchAccountsController } from './controllers/admin/fetch-accounts.controller'
import { FetchAdminCatalogController } from './controllers/admin/fetch-admin-catalog.controller'
import { FetchAdminOptionsController } from './controllers/admin/fetch-admin-options.controller'
import { FetchBattlesByUsernameController } from './controllers/admin/fetch-battles-by-username.controller'
import { FetchCharactersByUsernameController } from './controllers/admin/fetch-characters-by-username.controller'
import { GetSkillReferenceController } from './controllers/admin/get-skill-reference.controller'
import { GrantCharacterController } from './controllers/admin/grant-character.controller'
import { UpdateCatalogEntryController } from './controllers/admin/update-catalog-entry.controller'
import { AllocateFreePointsController } from './controllers/characters/allocate-free-points.controller'
import { AuthenticateController } from './controllers/accounts/authenticate.controller'
import { ChooseSkillOfferController } from './controllers/characters/choose-skill-offer.controller'
import { CreateAccountController } from './controllers/accounts/create-account.controller'
import { GetCurrentAccountController } from './controllers/accounts/get-current-account.controller'
import { LogoutController } from './controllers/accounts/logout.controller'
import { RefreshSessionController } from './controllers/accounts/refresh-session.controller'
import { CreateSquadController } from './controllers/squads/create-squad.controller'
import { DraftPveBattleController } from './controllers/battles/draft-pve-battle.controller'
import { DeleteSquadController } from './controllers/squads/delete-squad.controller'
import { EquipSkillsController } from './controllers/characters/equip-skills.controller'
import { FetchAccountByUsernameController } from './controllers/accounts/fetch-account-by-username.controller'
import { FetchAccountCharactersController } from './controllers/characters/fetch-account-characters.controller'
import { FetchAccountSquadsController } from './controllers/squads/fetch-account-squads.controller'
import { FetchPendingSkillOffersController } from './controllers/characters/fetch-pending-skill-offers.controller'
import { FetchNpcSquadsController } from './controllers/catalog/fetch-npc-squads.controller'
import { FetchTraitsController } from './controllers/catalog/fetch-traits.controller'
import { FetchTemplatesController } from './controllers/catalog/fetch-templates.controller'
import { ForfeitBattleController } from './controllers/battles/forfeit-battle.controller'
import { FetchAccountBattlesController } from './controllers/battles/fetch-account-battles.controller'
import { GetBattleController } from './controllers/battles/get-battle.controller'
import { GetTurnOptionsController } from './controllers/battles/get-turn-options.controller'
import { GetCharacterController } from './controllers/characters/get-character.controller'
import { HealthController } from './controllers/health.controller'
import { StartPveBattleController } from './controllers/battles/start-pve-battle.controller'
import { SubmitBattleActionController } from './controllers/battles/submit-battle-action.controller'
import { UpdateSquadFormationController } from './controllers/squads/update-squad-formation.controller'
import { adminUseCases } from './use-cases/admin.providers'
import { battlesUseCases } from './use-cases/battles.providers'
import { accountsUseCases } from './use-cases/accounts.providers'
import { charactersUseCases } from './use-cases/characters.providers'
import { squadsUseCases } from './use-cases/squads.providers'

// Controllers e use-cases (providers) de cada contexto entram aqui.
@Module({
  imports: [DatabaseModule, GatewaysModule, CryptographyModule],
  controllers: [
    HealthController,
    // catálogo (leitura pública, direto do repositório)
    FetchTemplatesController,
    FetchNpcSquadsController,
    FetchTraitsController,
    // accounts
    CreateAccountController,
    AuthenticateController,
    RefreshSessionController,
    LogoutController,
    GetCurrentAccountController,
    FetchAccountByUsernameController,
    // characters
    FetchAccountCharactersController,
    GetCharacterController,
    EquipSkillsController,
    AllocateFreePointsController,
    FetchPendingSkillOffersController,
    ChooseSkillOfferController,
    // squads
    CreateSquadController,
    FetchAccountSquadsController,
    UpdateSquadFormationController,
    DeleteSquadController,
    // battles (PvE)
    DraftPveBattleController,
    StartPveBattleController,
    SubmitBattleActionController,
    FetchAccountBattlesController,
    GetBattleController,
    GetTurnOptionsController,
    ForfeitBattleController,
    // admin (papel ADMIN): as rotas fixas antes das de `:collection`
    FetchAdminCatalogController,
    FetchAdminOptionsController,
    GetSkillReferenceController,
    FetchAccountsController,
    FetchCharactersByUsernameController,
    FetchBattlesByUsernameController,
    GrantCharacterController,
    CreateCatalogEntryController,
    UpdateCatalogEntryController,
    DeleteCatalogEntryController,
  ],
  providers: [
    ...accountsUseCases,
    ...charactersUseCases,
    ...squadsUseCases,
    ...battlesUseCases,
    ...adminUseCases,
  ],
})
export class HttpModule {}
