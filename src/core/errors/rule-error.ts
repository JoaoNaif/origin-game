/**
 * Erro de regra de jogo (jogada inválida, alvo fora de alcance): é uma resposta normal, devolvida em `Either`, não uma
 * falha. Não guarda o rastro da chamada, que custa caro: a IA testa milhares de jogadas por decisão e a maioria é
 * inválida (desempenho da previsão, `engine.md` 3.13).
 */
export abstract class RuleError extends Error {
  constructor(message: string) {
    const limit = Error.stackTraceLimit
    Error.stackTraceLimit = 0
    super(message)
    Error.stackTraceLimit = limit
  }
}
