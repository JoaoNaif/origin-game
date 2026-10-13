# CLAUDE.md

> **PROVISÓRIO.** O design do jogo ainda está sendo fechado e esta estrutura vai mudar. Ainda não há código.
> Contexto permanente do projeto para o Claude. Leia antes de mexer em qualquer coisa.

## O que é Origin

Jogo de estratégia **por turnos com esquadrão**, PvP competitivo, desktop (web primeiro). O prazer central é
montar formação e dominar skills. Detalhes em [`docs/game_design.md`](./docs/game_design.md) (regras do jogo)
e [`docs/world_build.md`](./docs/world_build.md) (mundo e lore).

Se uma regra de jogo não estiver clara, o `game_design.md` manda. Se não estiver coberta, perguntar ao usuário
e **escrever a resposta no doc**. Não inventar regra de combate.

## Estado atual

Só documentação. Decisões de combate fechadas: fila por velocidade, grade 3x3, 4 personagens por jogador,
skills de área por linha/coluna, Desgaste como risco x retorno, vitória por eliminação.
**Skills são o ponto central e serão desenhadas numa conversa própria**: não implementar o modelo de skill
antes disso.

**Escopo do MVP (D75):** apenas batalhas **contra a máquina (PvE)**, para validar a lógica. O PvP vem depois
(estrutura em [`docs/pvp_brief.md`](./docs/pvp_brief.md)).

Antes de qualquer trabalho em skills, ler [`docs/skills_brief.md`](./docs/skills_brief.md): lista o que já é
**enraizado** (risco x retorno, sem vantagem entre linhagens, ranged nunca superior ao melee, troca de posição
custa o turno, etc.) e o que está em aberto.

## Stack (planejada)

- **TypeScript** (strict), **NestJS**, Node 22
- **Prisma** / PostgreSQL (persistência durável), a confirmar
- **Vitest** para testes
- Motor de combate em **pacote puro separado**, sem interface, determinístico (mesma seed + mesmas ações = mesmo resultado)
- O servidor é a **autoridade** do combate; o cliente só envia ações e exibe o resultado

## Arquitetura (espelha o ZapWave, `../ZapWave`)

Regra de dependência (inviolável):

```
core   →  não importa nada
domain →  importa só core
infra  →  importa domain e core
test   →  importa core e domain (implementa as MESMAS interfaces do domain)
```

O **motor de combate** vive em `domain` (ou pacote próprio) e **nunca** importa Nest, Prisma, I/O, `Date.now()`
ou `Math.random()`. Aleatoriedade entra por uma porta (`Rng`) alimentada pela seed.

Árvore prevista (rascunho, contextos por assunto):

```
src/
  core/                       Entity, Either, UniqueEntityID, erros base
  domain/
    combat/                   motor: batalha, grade 3x3, fila de turnos, resolução de ações
    characters/               personagens, linhagens, atributos
    skills/                   (adiado: depende da conversa de skills)
    squads/                   formação (4 personagens na grade 3x3)
    accounts/                 conta do jogador (depois)
  infra/                      Nest, HTTP/WS, Prisma
test/                         factories, in-memory repositories, fakes (incluindo Rng fixo)
```

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

## Pendências de decisão que bloqueiam código

Ver seção 4 do `game_design.md` (A2b, A3b, A5, A6, A8) e o modelo de skill. O índice de tudo que está em aberto,
incluindo as conversas adiadas (todas fechadas: DOM em [`docs/dom_brief.md`](./docs/dom_brief.md), armas vivas em [`docs/living_gear_brief.md`](./docs/living_gear_brief.md), contratos com bestas em [`docs/beast_contracts_brief.md`](./docs/beast_contracts_brief.md), família e organizações em [`docs/family_faction_brief.md`](./docs/family_faction_brief.md)), é [`docs/open_topics.md`](./docs/open_topics.md).
