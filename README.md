# Origin

Jogo de estratégia por turnos com esquadrão. Contexto e regras em [`CLAUDE.md`](./CLAUDE.md) e [`docs/`](./docs).

## Requisitos

- Node 22 (`.nvmrc`)
- Docker (só quando a persistência entrar)

## Comandos

```bash
npm install
npm test            # testes unitários (Vitest)
npm run lint        # ESLint (--fix)
npm run typecheck
npm run build
npm run start:dev   # API Nest em http://localhost:3333/health
```

## Estrutura

```
src/
  core/     sem dependências (Either, Entity, Rng...)
  domain/   só importa core (motor de combate, personagens, skills...)
  infra/    Nest, HTTP/WS, Prisma
test/       fakes (Rng fixo), factories e repositórios in-memory
docs/       design do jogo
```

A regra de dependência é verificada pelo ESLint (`npm run lint:check`).
