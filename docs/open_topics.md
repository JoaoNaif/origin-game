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
| **Valores dos stats** e pisos do Desgaste (a forma da fórmula de dano e de acerto está fechada, D68) | A8; `character_brief.md` 2 | **Fechado em D91** (`classes_brief.md`). Poder das skills, empilhamento e Defender fechados em D92 |
| ~~**Valores do Desgaste**~~ **fechado** (D91) | `skills_brief.md` 9.4b | Piso 80%, custo 1,5% / 4% / 8%. Ajuste com simulação |
| ~~**Valores** da Exaustão, dos status e do Defender~~ **fechado** (D92) | `skills_brief.md` 12 | Ajuste com simulação |
| **IA da máquina** (adversário do MVP): como escolhe ações, dificuldades, squads de NPC | `pvp_brief.md` 7 | **Modelo fechado (D90, `pvp_brief.md` 8)**: pontuação por perfil, sorteio por nível, log do jogador. Só restam valores (placeholders em 8.1), depois do A8. Chefes com perfil próprio e previsão de turnos: depois do MVP |
| **Ajuste fino do PvP:** reconexão, valores do ranking e das faixas, top 3, fila | `pvp_brief.md` 7 | Estrutura fechada (D74); PvP vem depois do MVP |
| **Modelo de progressão da conta** (A6): parte 1 (XP, nível, skills) fechada (D76, D77) | A6 | Conta guarda inventário, moeda, organização, reputação, ranking. Resta a parte 2 (linha abaixo) |
| ~~**Campos de batalha**~~ **valores fechados** (D98) | `skills_brief.md` 12.7 | Os campos em si e os traços de cada um são do admin |
| ~~**Valores do XP e da curva**~~ **fechado** (D92) | `progression_brief.md` 1.1 e 1.2 | Ajuste com simulação |
| ~~**Parte 2 da progressão**~~ **fechada** (D79 a D86; modelo de negócio fechado no princípio, D84) | `progression_brief.md` 2.3 | Personagens fechados (D78). Mercado, inventário, economia e baús fechados (D79); aprimoramento de skill e títulos fechados (D80), venda perde o DOM e títulos ajudam elo e contrato por lista (D81), título vale por um requisito cumprido (teto placeholder 1); obtenção e exclusividade fechadas (D82); restam valores (limite do inventário, taxa, porcentagens dos baús, preços) e o funcionamento do mercado |
| **Metas de traço** (métricas e limiares por categoria) | `progression_brief.md` 1.5 | **Adiado para a conversa com o admin**; no MVP, traços direto no `seed.ts` |
| **Distribuição de stats:** níveis que dão ponto livre, tetos por classe, orçamento | `character_brief.md` 3; `classes_brief.md` 5 | Modelo fechado (D70); valores fechados em D91 (níveis dos pontos, tetos, orçamento). 8 classes (D69) |
| ~~**Marcos de skill e tamanho do kit básico**~~ **fechado** (D92) | `skills_brief.md` 12.6 | Kit de 4 skills da variante; none aprovado |
| ~~**Ajuste fino do despertar**~~ **fechado** (D96) | `awakening_brief.md` 6 | Catálogo e modelos de missão são do admin |
| ~~**Ajuste fino do DOM**~~ **fechado** (D93) | `dom_brief.md` 8 | Só ajuste por simulação |
| ~~**Ajuste fino do equipamento vivo**~~ **fechado** (D94) | `living_gear_brief.md` 9 | Catálogo e listas de títulos são do admin; resto por simulação |
| ~~**Ajuste fino dos contratos**~~ **fechado** (D95) | `beast_contracts_brief.md` 9 | Lista de bestas é do admin; resto por simulação |
| ~~**Famílias e organizações**~~ **fechada** (D87, D88) | `family_faction_brief.md` 4 | Famílias e eventos são do admin. Empréstimo e calote fechados (D89). Resta só ajuste fino dos placeholders depois de A8 |
| **Faixas do ranqueado** (D63) | `game_design.md` D63 | Quais faixas, nível de cada uma, o que é "limitação" (inclui o limite da skill aprimorada, D80). Liga com A5 |
| ~~**Custo extra de 2 ou 3 variantes**~~ **fechado** (D97) | `character_brief.md` 8 | Ressonância 60% / 40%; ajuste por simulação |
| **Conflitos do `world_build.md`** (seção 13) que viram dado | A7 | Decidir só os que importam |
| **Personagens de teste do MVP:** 8 a 12 personagens cobrindo todas as classes (D69), alcances, status e linhagens, criados num `seed.ts` (dados iniciais) | `skills_brief.md` 9.7 | Não é decisão aberta, é trabalho de montagem. Substitui o "~8 skills, 2 linhagens" |

---

## Como retomar

1. Escolher um tópico da Parte 1 ou 2.
2. Reler a seção indicada e os princípios enraizados em `skills_brief.md` seção 1.
3. Ao fechar, registrar a decisão em `game_design.md` (nova linha D) e atualizar o doc de origem; riscar aqui.
