# ORIGIN — Tópicos em aberto

> Índice do que **ainda precisa ser conversado**, para saber onde paramos. Parte 1: as **conversas próprias**
> adiadas de propósito (**todas fechadas**: DOM, armas vivas, contratos e família/facção; sobram só pontos de lore, 1.5).
> Parte 2: os demais pendentes de design.
> Regras decididas ficam em [`game_design.md`](./game_design.md); personagem em
> [`character_brief.md`](./character_brief.md); skills em [`skills_brief.md`](./skills_brief.md); mundo em
> [`world_build.md`](./world_build.md).
>
> Convenções: **[ENRAIZADO]** = já decidido e que limita a conversa · **[HIPÓTESE]** = ideia levantada, **não** decidida
> · **[ABERTO]** = a decidir. Quando um tópico for fechado, mover o resultado para o doc de regras e riscar aqui.

---

## Parte 1. Conversas próprias (adiadas de propósito)

Cada uma é complexa o bastante para uma sessão só dela. **Nenhuma bloqueia o protótipo** (D5, D17): o combate e os
personagens de teste funcionam sem elas. Todas pertencem ao eixo de **aprimoramento** do personagem
(`character_brief.md` 6): o despertar é só uma das formas.

### ~~1.1 DOM~~ (fechado)

Modelo fechado em [`dom_brief.md`](./dom_brief.md) e D60/D61 (`game_design.md`). Só restam valores numéricos, que
entraram na Parte 2 (linha "Ajuste fino do DOM").

### ~~1.2 Armas vivas~~ (fechado)

Modelo fechado em [`living_gear_brief.md`](./living_gear_brief.md) e D62/D63 (`game_design.md`): passiva, um slot
(arma ou armadura), grau + elo por requisitos de stats, sem teto no ranqueado. Só restam valores e catálogo, que
entraram na Parte 2 (linha "Ajuste fino do equipamento vivo").

### ~~1.3 Contratos com animais~~ (fechado)

Modelo fechado em [`beast_contracts_brief.md`](./beast_contracts_brief.md) e D64 (`game_design.md`): invocação de uso
único, 3 contratos, sagradas por evento, 1 besta (2 com Domador). Só restam valores (teto em campo, duração, stats da
besta), que entraram na Parte 2 (linha "Ajuste fino dos contratos").

### ~~1.4 Família e facção~~ (fechado)

Modelo fechado em [`family_faction_brief.md`](./family_faction_brief.md) e D65/D66 (`game_design.md`): família é
traço de Origem (sangue puro dá acesso ao despertar, sem stat geral; Prodígio fora da família) e organizações são da
conta, fora do combate. Só restam valores, tabela de famílias x variante e eventos, que entraram na Parte 2 (linhas
"Famílias e organizações").

### ~~1.5 Pontos de lore a mapear junto~~ (fechado)

- **Despertar** (conflito 5): fechado em D67 e [`awakening_brief.md`](./awakening_brief.md). Um despertar só, sem
  estágios; os dois sentidos do lore são só flavor.
- **Éon** (conflito 4): **descartado** como termo (nome técnico da Sombra para variante, sem relevância no jogo).

---

## Parte 2. Outros tópicos em aberto

Não são conversa própria; são decisões de design que faltam. Em ordem aproximada do que **bloqueia código**:

| Tópico | Onde está | Observação |
|---|---|---|
| **Fórmula de dano**, valores dos stats, fórmula de acerto (Precisão x Esquiva), pisos do Desgaste | A8; `character_brief.md` 2 | Bloqueia custos, buffs, queda de dano, teto de empilhamento, Defender |
| **Mecânica do Desgaste** (como o risco se manifesta e como o retorno é medido) | A3b | Conceito fechado (D13); a mecânica é o centro da conversa de skills |
| **Regras finas de alcance e bloqueio**, tipos de alcance, turtling | A2b | Conversa de skills |
| **Estrutura do PvP:** ao vivo ou assíncrono, relógio de turno, ranqueado, modos (ranqueado, casual, amistosa, PvE), matchmaking | A5 | Amistosa não conta XP nem histórico (D54) |
| **Modelo de progressão:** conta, personagens, skills, equipamento | A6 | Onde mora inventário (armas) e como se obtêm personagens |
| **Lista de status** (queimadura, lentidão...) e o que a Vontade resiste | `skills_brief.md` 10.7 | Necessária para o catálogo de skills |
| **Teto do empilhamento e redução do Defender** | `skills_brief.md` 10.8 | Dependem dos stats |
| **Campos de batalha:** duração N, traços exigidos, tamanho do bônus | `skills_brief.md` 8.5/10.2 | Dados do admin |
| **XP:** fórmula, pesos das métricas, curva | `character_brief.md` 7 | Suporte sobe mais devagar (aceito) |
| **Distribuição de stats:** níveis que dão ponto livre, teto, proporção | `character_brief.md` 3 | |
| **Marcos de skill e tamanho do kit básico** | `character_brief.md` 4 | Kit pode ser padronizado por classe |
| **Ajuste fino do despertar** | `awakening_brief.md` 5 | Nível mínimo, pesos, catálogo por variante, missões ocultas, sangue puro, skills x slots |
| **Ajuste fino do DOM** | `dom_brief.md` 7 | Stats de básico/intermediário, feitos, janela e limiares, multiplicadores, durações. Depende de A8 |
| **Ajuste fino do equipamento vivo** | `living_gear_brief.md` 8 | Valores por grau e elo, requisitos, catálogo de passivas, 2º slot, Divino. Depende de A8 |
| **Ajuste fino dos contratos** | `beast_contracts_brief.md` 7 e 8 | Teto em campo, stats da besta, duração, lista de bestas, traço Domador. Depende de A8 |
| **Famílias e organizações** | `family_faction_brief.md` 4 | Tabela família x variante, valores de Origem e Prodígio, reputação das organizações, Crônica x Registro, eventos |
| **Faixas do ranqueado** (D63) | `game_design.md` D63 | Quais faixas, nível de cada uma, o que é "limitação". Liga com A5 |
| **Custo extra de 2 ou 3 variantes** | `character_brief.md` 8 | "Mais variantes, mais custo" |
| **Conflitos do `world_build.md`** (seção 13) que viram dado | A7 | Decidir só os que importam |
| **Conjunto mínimo de skills de teste** (~8, 2 linhagens) | `skills_brief.md` 9.7 | Protótipo |

---

## Como retomar

1. Escolher um tópico da Parte 1 ou 2.
2. Reler a seção indicada e os princípios enraizados em `skills_brief.md` seção 1.
3. Ao fechar, registrar a decisão em `game_design.md` (nova linha D) e atualizar o doc de origem; riscar aqui.
