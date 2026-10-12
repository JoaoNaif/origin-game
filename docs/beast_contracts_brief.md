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
3. **Teto de bestas em campo ao mesmo tempo** por squad **[PLACEHOLDER: 2]**, além da limitação das células livres.
4. A besta tem **duração** (N turnos) **[PLACEHOLDER]**.

## 8. Pendências

1. Valores do teto em campo (seção 7) e da duração.
2. Valores: stats da besta, % de dano compartilhado, duração, custo de Vontade.
3. Requisitos de stats do contrato Mestre.
4. Lista de bestas (comuns e sagradas) e suas variantes.
5. Burnout da lore (excesso de pactos) já é coberto por: 1 besta, 2 com Domador, 1 invocação por besta.
6. Regras de captura em PvE e mercado (A6).
