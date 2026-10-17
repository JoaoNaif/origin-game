import { randomUUID } from 'node:crypto'

/**
 * Identidade de uma entidade. Sem valor, gera um UUID (uso de infra/cadastro).
 * O motor de combate NÃO deve gerar ids assim: passe o valor explicitamente (determinismo).
 */
export class UniqueEntityId {
  private value: string

  constructor(value?: string) {
    this.value = value ?? randomUUID()
  }

  toString() {
    return this.value
  }

  toValue() {
    return this.value
  }

  equals(id: UniqueEntityId) {
    return id.toValue() === this.value
  }
}
