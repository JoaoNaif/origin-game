import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { AllocateFreePointsController } from './controllers/characters/allocate-free-points.controller'
import { CreateAccountController } from './controllers/accounts/create-account.controller'
import { EquipSkillsController } from './controllers/characters/equip-skills.controller'
import { FetchAccountByUsernameController } from './controllers/accounts/fetch-account-by-username.controller'
import { FetchAccountCharactersController } from './controllers/characters/fetch-account-characters.controller'
import { FetchNpcSquadsController } from './controllers/catalog/fetch-npc-squads.controller'
import { FetchTemplatesController } from './controllers/catalog/fetch-templates.controller'
import { GetCharacterController } from './controllers/characters/get-character.controller'
import { HealthController } from './controllers/health.controller'
import { accountsUseCases } from './use-cases/accounts.providers'
import { charactersUseCases } from './use-cases/characters.providers'

// Controllers e use-cases (providers) de cada contexto entram aqui.
@Module({
  imports: [DatabaseModule],
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
  ],
  providers: [...accountsUseCases, ...charactersUseCases],
})
export class HttpModule {}
