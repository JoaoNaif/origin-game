/** Confere a senha com o hash guardado. */
export abstract class HashCompare {
  abstract compare(plain: string, hash: string): Promise<boolean>
}
