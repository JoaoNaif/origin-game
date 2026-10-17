# ORIGIN — Contratos com bestas (brief)

> Regras dos contratos com animais no jogo, decididas na conversa própria. Decisões resumidas em `game_design.md` (D64).
> Lore em [`world_build.md`](./world_build.md) 3.7. Personagem em [`character_brief.md`](./character_brief.md).
> **[ENRAIZADO]** = decidido · **[PLACEHOLDER]** = número provisório.

---

## 1. O que é

Animais com variante são chamados de **bestas**. É possível firmar um **contrato** com elas. Há duas espécies:
**comuns** e **sagradas** (raríssimas e únicas: Fenrir, Fênix, Cérbero...). Não confundir com os Contratos de Vínculo
dos Escrivães (`world_build.md` 9.8), que são financeiros.

## 2. Modelo: invocação [ENRAIZADO]

- O contrato dá ao personagem uma **skill de invocação de uso único por batalha**.
- A besta entra numa **célula livre** da grade (a grade tem 9 células e só 4 personagens) e **sai** depois de N
  turnos ou quando morre.
- A besta **não é um dos 4 personagens** (D11): é uma unidade temporária.
- **Entra na fila** (D10) com Velocidade própria e **bloqueia** (D21/D22). **Pode ser alvo.**
- Entrada e saída em turnos fixos, ordem pela seed (D8).
- **Se morre**, o dono perde só o que ela dava. **Ninguém morre por isso** (D31).
- **Vale no ranqueado** e o grau influencia (D63).

## 3. Os 3 contratos [ENRAIZADO]

Eles mudam o **comportamento** da besta, não só os números:

| Contrato | Lore | No jogo | Custo |
|---|---|---|---|
| **Dominância** | Obriga a besta a servir | Obediente, age junto com o dono, mais fraca (% dos stats) | O dono perde **Vontade** enquanto ela está em campo |
| **Mestre** | O mais forte lidera, o mais fraco é vassalo | Unidade própria: HP, Velocidade e a ação é escolhida pelo jogador | Besta mais forte exige mais **requisitos de stats** do dono (como o elo, `living_gear_brief.md` 4.1) |
| **Igualdade** | Os dois se tornam um: veem pelos mesmos olhos, sentem a mesma dor | **Não ocupa célula.** Dano compartilhado (%) e bônus de Precisão e Esquiva | **Faca de dois gumes:** a dor dela é do dono; se ela cai, o dono sofre |

## 4. Sagradas [ENRAIZADO]

- **Não vêm de baú.** Só por evento único (como o Divino da arma).
- **Uma** por personagem; efeitos além da besta comum.
- Sem ressurreição (D31): a Fênix, por exemplo, usa **cura ativa**.

## 5. Quantidade [ENRAIZADO]

- **1 besta por personagem.**
- **2** só para quem tem o traço **Domador**. Traço novo, na categoria Origem/Combate (D47), conquistado pelas regras
  normais de traço (D39).

## 6. Obtenção [ENRAIZADO]

- **Eventos**, inicialmente. Baús, captura em PvE e mercado ficam para depois.

## 7. Contra o excesso de invocações [ENRAIZADO]

Receio do usuário: muitas invocações na grade. Salvaguardas confirmadas:

1. A skill de invocação **ocupa um dos 4 slots** (D43), então o contrato tem custo de build.
2. **Uso único por batalha** por besta.
3. **Teto de bestas em campo ao mesmo tempo** por squad: **2** (D95), além da limitação das células livres.
4. A besta tem **duração** (N turnos) **[PLACEHOLDER]**.

## 8. Pendências

Fechadas em D95 (seção 9). Resta só o **ajuste fino por simulação**, a **lista de bestas** (admin) e a captura em PvE
e o mercado (A6).

## 9. Valores (D95)

**[PLACEHOLDER aprovado]**, ajustar com simulação. A besta comum tem os mesmos 4 graus do equipamento (Escudeiro a
Rei); a sagrada fica acima. Referência de força: a skill Final (Poder 2,0) tira ~22% do HP de um alvo uma vez.

### 9.1 Stats da besta (% dos stats do dono)

| Grau | Dominância | Mestre |
|---|---|---|
| Escudeiro | 25% | 40% |
| Cavaleiro | 35% | 50% |
| Mestre | 45% | 60% |
| Rei | 55% | 70% |
| Sagrada | ×1,25 do Rei | ×1,25 do Rei |

- Velocidade da besta: **90%** da do dono. Vontade: **50%** da do dono.
- Rendimento em 4 ações: Dominância Rei ~17% do HP do alvo, Mestre Rei ~25%.

### 9.2 Duração

**4 turnos da besta** (sagrada: **5**). Igualdade: 4 turnos do dono.

### 9.3 Dominância: custo de Vontade

O dono perde Vontade enquanto a besta está em campo, **dentro do piso de 80%** do Desgaste.

| Grau | Escudeiro | Cavaleiro | Mestre | Rei |
|---|---|---|---|---|
| Vontade perdida | 5% | 8% | 11% | 15% |

### 9.4 Igualdade (não ocupa célula)

A besta guarda um buffer que **absorve 50%** de cada golpe recebido pelo dono, até esvaziar.

| Grau | Buffer (% do HP máx. do dono) | Bônus de Precisão e Esquiva |
|---|---|---|
| Escudeiro | 12% | +4% |
| Cavaleiro | 16% | +6% |
| Mestre | 20% | +9% |
| Rei | 25% | +12% |

Se o buffer esvazia, o dono sofre **10% do HP máximo** (ignora Defesa) e **perde os bônus**.

### 9.5 Requisitos do contrato Mestre

Escudeiro 2 · Cavaleiro 2 · Mestre 3 · Rei 4 · Sagrada 4, com pelo menos 1 "baixo" do Mestre para cima (formato do
equipamento, `living_gear_brief.md` 9.4). **Sem parcial:** não cumprindo todos, a build é bloqueada. Dominância e
Igualdade não têm requisitos.

### 9.6 Teto em campo e títulos

- **2 bestas em campo por squad.** A Igualdade **não conta** (não é unidade). Com Domador o personagem tem 2
  invocações (2 slots), mas o teto da squad continua 2.
- **Títulos (D81):** teto de **1 substituição**, só para o contrato **Mestre**. Não ajudam Dominância nem Igualdade.
- **Lista de bestas:** conteúdo do admin; no `seed.ts` do MVP, uma besta por contrato.
