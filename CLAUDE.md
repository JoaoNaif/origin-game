# CLAUDE.md

> O **design de jogo está fechado até o D135** (regras e valores iniciais do MVP). **Feito:** motor de combate, IA e
> simulação (D122 a D132), schema do Prisma, seed e o **servidor do MVP** (contas, catálogo, personagens, squads e
> batalha contra a máquina, com XP no fim e as ações possíveis da vez), com login (username + senha). Contrato da API em [`docs/api.md`](./docs/api.md).
> Contexto permanente do projeto para o Claude. Leia antes de mexer em qualquer coisa.

## O que é Origin

Jogo de estratégia **por turnos com esquadrão**, PvP competitivo, desktop (web primeiro). O prazer central é
montar formação e dominar skills. Detalhes em [`docs/game_design.md`](./docs/game_design.md) (regras do jogo)
e [`docs/world_build.md`](./docs/world_build.md) (mundo e lore).

Se uma regra de jogo não estiver clara, o `game_design.md` manda. Se não estiver coberta, perguntar ao usuário
e **escrever a resposta no doc**. Não inventar regra de combate.

## Estado atual

**As regras e os valores iniciais estão fechados** (registro das decisões D1 a D135 em
[`docs/game_design.md`](./docs/game_design.md)). Combate: fila em barra de ação (0 a 1000, Velocidade soma por tick),
grade 3x3, 4 personagens com 4 skills cada, 7 stats, fórmula de dano `Poder × Ataque² / (Ataque + Defesa) × 0,7` (D131), Desgaste
como risco x retorno (piso de 80%), vitória por eliminação ou por dano causado na rodada 30 (D122). Os valores são **placeholders
aprovados**, a calibrar por simulação (IA contra IA).

**Escopo do MVP (D75):** apenas batalhas **contra a máquina (PvE)**, para validar a lógica. O PvP vem depois
(estrutura em [`docs/pvp_brief.md`](./docs/pvp_brief.md)). A IA da máquina está em `pvp_brief.md` 8 e 10 (D90, D103).

**Onde está cada assunto** (ler antes de mexer):

| Assunto | Doc |
|---|---|
| Skills (Poder, custo, status, alcance, Tático, Guardião, campos) | [`docs/skills_brief.md`](./docs/skills_brief.md) (seção 12 = valores) |
| Personagem, stats, classes | [`docs/character_brief.md`](./docs/character_brief.md), [`docs/classes_brief.md`](./docs/classes_brief.md) |
| XP, nível, economia, mercado, baús, materiais | [`docs/progression_brief.md`](./docs/progression_brief.md) |
| DOM, despertar | [`docs/dom_brief.md`](./docs/dom_brief.md), [`docs/awakening_brief.md`](./docs/awakening_brief.md) |
| Equipamento vivo, contratos com bestas | [`docs/living_gear_brief.md`](./docs/living_gear_brief.md), [`docs/beast_contracts_brief.md`](./docs/beast_contracts_brief.md) |
| Família e organizações | [`docs/family_faction_brief.md`](./docs/family_faction_brief.md) |
| PvP, ranqueado, faixas, IA | [`docs/pvp_brief.md`](./docs/pvp_brief.md) |
| Modelo de dados (Prisma e entidades) | [`docs/data_model.md`](./docs/data_model.md) |
| Motor de combate (fórmulas e peças) | [`docs/engine.md`](./docs/engine.md) |
| API HTTP (contrato para o front; atualizar ao mudar rota) | [`docs/api.md`](./docs/api.md) |

O `skills_brief.md` lista o que já é **enraizado** (risco x retorno, sem vantagem entre linhagens, ranged nunca
superior ao melee, etc.; o custo do movimento mudou para meio turno no D123). Dados de **conteúdo** (famílias, campos, catálogo de
equipamentos, despertares, bestas, traços e eventos) são do **admin**; no MVP vêm de um `seed.ts`.

## Stack (planejada)

- **TypeScript** (strict), **NestJS**, Node 22
- **Prisma** / PostgreSQL (persistência durável), a confirmar
- **Vitest** para testes
- Motor de combate em **pacote puro separado**, sem interface, determinístico (mesma seed + mesmas ações = mesmo resultado)
- O servidor é a **autoridade** do combate; o cliente só envia ações e exibe o resultado

## Arquitetura (espelha o help-invest, `../help-invest/backend`, que vem do ZapWave)

Regra de dependência (inviolável, **verificada pelo ESLint**: `npm run lint:check` falha se domain/core importarem infra, Nest ou Prisma, ou usarem `Math.random()`/`Date.now()`):

```
core   →  não importa nada
domain →  importa só core
infra  →  importa domain e core
test   →  importa core e domain (implementa as MESMAS interfaces do domain)
```

O **motor de combate** vive em `domain` (ou pacote próprio) e **nunca** importa Nest, Prisma, I/O, `Date.now()`
ou `Math.random()`. Aleatoriedade entra por uma porta (`Rng`) alimentada pela seed.

Árvore (contextos por assunto):

```
src/
  core/                       Entity, Either, UniqueEntityId, Rng (porta) e SeededRng, Clock (porta), RuleError
    errors/err/               erros genéricos de use-case: ResourceNotFound, ResourceAlreadyExists, NotAllowed
  domain/
    combat/                   motor: batalha, grade 3x3, fila de turnos, resolução de ações
    characters/               personagens, linhagens, atributos
    skills/                   modelo de skill (ver `docs/skills_brief.md` seção 12)
    ai/                       IA da máquina: pontuação, sorteio com Rng, log do jogador
    squads/                   formação (4 personagens na grade 3x3)
    accounts/                 conta do jogador, login (sessões, portas de criptografia)
    catalog/                  porta do catálogo do admin (modelos, skills, traços, campos, squads de NPC)
  infra/
    auth/                     JWT (estratégia, guard global, @Public, @CurrentUser)
    cryptography/             bcrypt, JWT e refresh token (portas de accounts)
    env/                      validação do .env (Zod) e EnvService
    database/                 DatabaseModule, PrismaService, prisma/{mappers,repositories}, memory/ (pré-batalha)
    gateways/                 relógio e gerador de seed (portas do domínio)
    http/                     HttpModule, controllers/, presenters/, pipes/, schemas/, use-cases/, middlewares/
test/                         factories, in-memory repositories, fakes (incluindo Rng fixo), setup-e2e.ts
```

### Camadas dentro de `domain/<contexto>/`

- `entities/` — entidades, JS puro, `static create(props, id?)`.
- `applications/use-cases/` — um caso de uso por arquivo, classe com `execute()`; devolve a **entidade** no `Either`
  (o presenter da infra escolhe o que sai na resposta).
- `applications/repositories/`, `applications/gateways/` — portas (**classes abstratas**, token de DI).
- `errors/` — erros de regra do contexto (validação de entidade, `RuleError` do motor); erros genéricos de use-case
  vêm de `core/errors/err/`.
- `services/`, `engine/`, `enums/`, `value-objects/` — regra pura (motor, cálculo), sem porta.

`skills` e `ai` ainda não têm casos de uso (ganham `applications/` quando tiverem). A batalha PvE está em
`combat/applications/`: o servidor não guarda o estado, refaz o motor pelo replay a cada requisição
(`services/pve-session.ts`; `data_model.md` 5).

### Infra

- **Login** (modelo do help-invest): toda rota exige JWT (guard global), menos as com `@Public()`. A conta logada
  chega por `@CurrentUser()` (`sub` = id da conta); o que é dela fica em `/me/...`, e os casos de uso que recebem um
  id conferem o dono (`findOwned...`, outra conta = `NotAllowedError` → 403). Tokens só em cookies httpOnly
  (`http/auth-cookies.ts`); CSRF por `SameSite=Strict` + checagem de `Origin`. Chaves no `.env` (`npm run keys:generate`).
- Catálogo público (`GET /templates`, `GET /npc-squads`): controller lê direto do `CatalogRepository`, sem caso de
  uso (dado público, como no help-invest).
- Repositório Prisma em `infra/database/prisma/repositories/`, com mapper Prisma ↔ domínio em `prisma/mappers/`;
  registrado no `DatabaseModule` como `{ provide: Porta, useClass: PrismaX }`.
- Casos de uso entram no Nest por `useFactory` em `infra/http/use-cases/<contexto>.providers.ts` (o domínio não tem
  decorators); a classe do caso de uso é o token de DI.
- Um controller por caso de uso em `infra/http/controllers/<contexto>/` (`accounts`, `catalog`, `characters`, `squads`,
  `battles`; o `health` fica na raiz), com o `*.e2e-spec.ts` ao lado. Validação no
  `@Body(new ZodValidationPipe(schema))`; erro do `Either` vira exceção HTTP num `switch (error.constructor)`; saída
  sempre por presenter (`infra/http/presenters/`). Schemas reaproveitados em `infra/http/schemas/`.
- e2e: `npm run test:e2e` (precisa do Postgres: `npm run services:up`); cada arquivo roda num schema próprio
  (`test/setup-e2e.ts`, que também grava o conteúdo do seed) e monta o app com `configureApp(app)`
  (`infra/setup-app.ts`). Preparos repetidos (cadastrar e entrar com o `agent` do supertest, squad, pré-batalha, jogada válida) em `test/e2e/`.

## Convenções (herdadas do ZapWave)

- **Either** para retorno de use-cases, nunca `throw` para erro de regra: `right(...)` / `left(new XError())`.
- Um use-case por arquivo, classe com `execute()`. Repositórios e gateways são **classes abstratas** (token DI).
- Entidades em JS puro, `static create(props, id?)`. Sem decorators no `domain`.
- Prettier: sem ponto e vírgula, aspas simples, `trailingComma: es5`, 2 espaços. Rodar lint antes de terminar.
- Imports: `@/*` → `src/*`, `test/*` → `test/*`.
- Testes: Vitest com import explícito, `describe('Nome do Caso', ...)`, `it('should be able to ...', ...)`,
  instância sob teste chamada `sut`, montada em `beforeEach`. Sem banco/rede em teste unitário.
- Cada novo port precisa de um fake/in-memory em `test/`.
- Nomes de pasta e código em **inglês**; documentação em **português**.

## Pendências

**Nada de design bloqueia o código do MVP.** O que resta (índice em [`docs/open_topics.md`](./docs/open_topics.md)):

- **Calibração por simulação** dos valores (pesos e `T` da IA, Desgaste, dano de referência, etc.), que só é possível
  com o motor implementado. Metas em `pvp_brief.md` 10.4.
- **Metas de traço** (conversa com o admin; no MVP, traços direto no `seed.ts`).
- **Conflitos do `world_build.md`** (seção 13) que viram dado, só os que importam.
- **Depois do MVP:** PvP (pontos do Elo, limites de pontos, temporada, reconexão, top 3, fila), perfil próprio para
  chefes, previsão de turnos da IA, memória entre batalhas, e os caminhos Enxerto, Rede e Selo.
- **Servidor, a seguir:** desistir (W.O.), XP guardado na batalha (histórico e reconexão), nomes de traços e campos
  para a tela, Defender por tempo esgotado (D38, falta o tempo em segundos), valor do buff/debuff no XP (D134) e o front.

**Regra de trabalho:** valores numéricos novos, o Claude **propõe** e o usuário aprova; depois registra em uma nova
linha D do `game_design.md` e no brief de origem.
