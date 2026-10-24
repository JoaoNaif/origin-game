import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { GatewaysModule } from '../gateways/gateways.module'
import { AllocateFreePointsController } from './controllers/characters/allocate-free-points.controller'
import { CreateAccountController } from './controllers/accounts/create-account.controller'
import { CreateSquadController } from './controllers/squads/create-squad.controller'
import { DraftPveBattleController } from './controllers/battles/draft-pve-battle.controller'
import { DeleteSquadController } from './controllers/squads/delete-squad.controller'
import { EquipSkillsController } from './controllers/characters/equip-skills.controller'
import { FetchAccountByUsernameController } from './controllers/accounts/fetch-account-by-username.controller'
import { FetchAccountCharactersController } from './controllers/characters/fetch-account-characters.controller'
import { FetchAccountSquadsController } from './controllers/squads/fetch-account-squads.controller'
import { FetchNpcSquadsController } from './controllers/catalog/fetch-npc-squads.controller'
import { FetchTemplatesController } from './controllers/catalog/fetch-templates.controller'
import { GetBattleController } from './controllers/battles/get-battle.controller'
import { GetCharacterController } from './controllers/characters/get-character.controller'
import { HealthController } from './controllers/health.controller'
import { StartPveBattleController } from './controllers/battles/start-pve-battle.controller'
import { SubmitBattleActionController } from './controllers/battles/submit-battle-action.controller'
import { UpdateSquadFormationController } from './controllers/squads/update-squad-formation.controller'
import { battlesUseCases } from './use-cases/battles.providers'
import { accountsUseCases } from './use-cases/accounts.providers'
import { charactersUseCases } from './use-cases/characters.providers'
import { squadsUseCases } from './use-cases/squads.providers'

// Controllers e use-cases (providers) de cada contexto entram aqui.
@Module({
  imports: [DatabaseModule, GatewaysModule],
  controllers: [
    HealthController,
    // catálogo (leitura pública, direto do repositório)
    FetchTemplatesController,
    FetchNpcSquadsController,
    // accounts
    CreateAccountController,
    FetchAccountByUsernameController,
    // characters
    FetchAccountCharactersController,
    GetCharacterController,
    EquipSkillsController,
    AllocateFreePointsController,
    // squads
    CreateSquadController,
    FetchAccountSquadsController,
    UpdateSquadFormationController,
    DeleteSquadController,
    // battles (PvE)
    DraftPveBattleController,
    StartPveBattleController,
    SubmitBattleActionController,
    GetBattleController,
  ],
  providers: [
    ...accountsUseCases,
    ...charactersUseCases,
    ...squadsUseCases,
    ...battlesUseCases,
  ],
})
export class HttpModule {}
