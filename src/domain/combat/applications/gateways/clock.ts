/** O relógio entra por uma porta: o domínio não lê a hora (regra do ESLint), recebe como dado. */
export abstract class Clock {
  abstract now(): Date
}
