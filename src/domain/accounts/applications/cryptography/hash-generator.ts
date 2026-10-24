/** Gera o hash da senha (bcrypt na infra). */
export abstract class HashGenerator {
  abstract hash(plain: string): Promise<string>
}
