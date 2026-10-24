import { Character } from '../../entities/character'

/** Porta de persistência dos personagens do jogador (com skills e traços). */
export abstract class CharactersRepository {
  abstract findById(id: string): Promise<Character | null>
  abstract findManyByAccountId(accountId: string): Promise<Character[]>
  abstract findManyByIds(ids: string[]): Promise<Character[]>
  abstract createMany(characters: Character[]): Promise<void>
  abstract save(character: Character): Promise<void>
}
