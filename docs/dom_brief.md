# ORIGIN — DOM (brief)

> Regras do DOM no jogo, decididas na conversa própria do DOM. Decisões resumidas em `game_design.md` (D60, D61).
> Lore em [`world_build.md`](./world_build.md) 3.6. Personagem em [`character_brief.md`](./character_brief.md).
> **[ENRAIZADO]** = decidido · **[PLACEHOLDER]** = número provisório, ajustar com a fórmula de dano (A8).

---

## 1. O que é

Potencial humano natural, **sem Éon**: um poder **democrático**, qualquer personagem pode ter (comparável ao haki).
Quatro pilares, cada um com três níveis. Na história o DOM **não tem custo** e se mantém com treino constante; quem
para de treinar cai de nível.

| Pilar | O que representa |
|---|---|
| **Mente** | percepção, análise, antecipação |
| **Coração** | resistência biológica, energia vital |
| **Corpo** | domínio estrutural do organismo |
| **Aura** | presença e intenção (o mais raro) |

Níveis: **básico**, **intermediário**, **avançado**.

## 2. Raridade [ENRAIZADO]

- Chegar ao **avançado** já é muito difícil.
- Ter os **4 pilares** é possível, mas raríssimo: na história há só 2 casos. Tão raro quanto 3 variantes.
- É **ainda mais difícil** para quem já tem variante.
- **Não é fixo:** pode ser perdido (seção 5).
- Quem **não tem variante** ganha com mais facilidade (meta menor), para não ficar muito atrás.

## 3. Efeito no jogo [ENRAIZADO]

| Nível | Efeito |
|---|---|
| **Básico** e **intermediário** | aumento de stats (valores em 8.1) |
| **Avançado** | **título** (traço extra, fora dos 5 de D39) + **uma skill única**, de uso único |

- O título **não dá stat**: é só o acesso à skill única.
- A skill única é uma **skill extra**, fora das 4 do D43, de **uso único por batalha** (é por isso que é forte). Cada pilar avançado dá a sua (ver 8.5).
- **O DOM não tem custo nem Desgaste.** Exceção consciente ao D52 ("mais poder, mais custo"): o custo é manter a meta.
- Vale no ranqueado (D56), e o grau influencia: a paridade vem das **faixas** do ranqueado (D63), não de teto.

### 3.1 Skills únicas do avançado

| Pilar | Título | Skill única |
|---|---|---|
| **Aura** | Rei | Em área, atinge **inimigos com Vontade** e **reduz todos os stats** deles por N turnos. Os stats **voltam** ao fim (D32). Ideia: convicção fraca não trava batalha entre reis |
| **Mente** | Vidente | Alvo único inimigo: ele **perde o turno** (só passa a vez). Chance por DOM da Mente do alvo: sem DOM/básico **100%**, intermediário **70%**, avançado **30%** [PLACEHOLDER] |
| **Corpo** | Indestrutível | **Anula todo o dano recebido por 1 turno** |
| **Coração** | Resiliente | **Cura 50% do HP máximo** do usuário. Cura ativa, não ressurreição (D31), sem lado negativo depois |

Valores e durações fechados em 8.4.

## 4. Como se conquista [ENRAIZADO o princípio]

Não há uma forma única: **cada pilar se conquista de um jeito**, por **feitos** próprios. Um feito é uma condição
**composta**, medida **numa mesma batalha**, rara de propósito. Cumprido, dá **1 ponto** no pilar.

Regras dos feitos:

- **Vencer a batalha é parte do feito** na maioria deles (não dá para farmar derrota).
- **Um feito por pilar por batalha.**
- Medidos como **participação na batalha**, não valor absoluto (batalha longa não pontua mais).
- Cada pilar tem feitos para **cada papel** (dano, tank, suporte, controle), para nenhuma classe dominar.
- **Nível de alvo maior** só vale no casual/PvE; no ranqueado (nivelado, D46) vale **ranking maior**.
- **Pontos por nível:** 8 / 20 / 45 na janela de 150 de peso (D93, seção 8.2). O **avançado** exige feitos de **pelo menos 3 papéis**.

### 4.1 Feitos (rascunho, a refinar)

| Pilar | Dano | Tank | Suporte | Controle |
|---|---|---|---|---|
| **Mente** | acertar 3 skills seguidas em alvos que acabaram de esquivar e vencer | esquivar 3 ataques seguidos e vencer | buffar um aliado antes do inimigo agir e ele abater o alvo no mesmo turno | debuff em **todos** os inimigos vivos sem ser atingido na rodada |
| **Coração** | vencer com o personagem **abaixo de 20% de HP** dando o abate final | sobreviver a 5 rodadas sendo o alvo mais atacado e vencer | curar aliados que somem **100% do HP máximo** do curador, ficando vivo | vencer em **desvantagem numérica** (1x3 ou pior) |
| **Corpo** | abater 2 inimigos no mesmo turno **sem skill de área** | absorver **mais de 50%** do dano total do inimigo e vencer | escudo em 2 aliados que sobrevivem à rodada em que seriam abatidos | deixar um inimigo **sem alvo exposto por 2 turnos** |
| **Aura** | abate final contra alvo de **nível maior** | vencer contra squad de **nível médio maior** | squad inteira viva contra squad de nível maior | 3 debuffs em um alvo que depois **perde o turno** |

## 5. Como se perde [ENRAIZADO o princípio]

- Representa o **treino que parou**: se o pilar fica **abaixo da meta numa janela de batalhas**, o personagem perde
  **um nível** por vez, e pode recuperar.
- A perda usa a **mesma régua** da conquista (os feitos do próprio pilar), então ganhar e perder têm lógica única
  mesmo com formas de conquista diferentes.
- Perder o **avançado** retira o título e a skill única.
- **Perda por derrota não existe**: só o ritmo de feitos conta (não punir tank/suporte por derrotas).
- **Venda no mercado:** o personagem vendido **perde todo o DOM** (todos os pilares e níveis, com título e skill
  única). O DOM é volátil e conquistado por quem jogou; não se compra (D81).

## 6. Modos

| Modo | Ganha | Perde |
|---|---|---|
| **Ranqueado** | mais | mais |
| **Casual** e **PvE** | bem menos | bem menos |
| **Amistosa** | nada | nada (D54) |

Pesos por modo fechados em 8.2.

## 7. Pendências

Fechadas em D93 (seção 8) e implementadas no D152 (seção 9). Resta só o **ajuste fino por simulação** (stats, janela,
pontos, durações) e, depois do MVP, os pesos do ranqueado e do casual, a Aura pelo ranking (8.3) e a perda na venda
(mercado).

## 8. Valores (D93)

**[PLACEHOLDER aprovado]**, ajustar com simulação.

### 8.1 Stats do básico e do intermediário

| Pilar | Stat principal | Stat secundário |
|---|---|---|
| Mente | Precisão | Esquiva |
| Coração | HP | Defesa |
| Corpo | Velocidade | Ataque |
| Aura | Vontade | Ataque |

| Nível | Principal | Secundário |
|---|---|---|
| Básico | +3% | +2% |
| Intermediário | +6% | +4% (substitui o básico, não soma) |
| Avançado | mantém os do intermediário, mais título e skill única | |

O bônus vem **depois dos tetos da classe**. Um intermediário vale cerca de uma concessão de pontos livres.

### 8.2 Janela, pontos e limiares

- **Janela móvel:** últimos **150 de peso de batalha**. Cada batalha ocupa a janela com o peso do modo, e cada feito
  rende pontos com o mesmo peso (o modo muda só a **velocidade**, não o ritmo exigido).

| Modo | Peso |
|---|---|
| Ranqueado | 1,0 |
| Casual (PvP) | 0,6 |
| PvE Grão-mestre / Mestre / Avançado / Intermediário / Iniciante | 0,6 / 0,5 / 0,4 / 0,3 / 0,15 |
| Amistosa | 0 (D54) |

| Nível | Pontos | Sem variante (×0,8) |
|---|---|---|
| Básico | 8 | 6 |
| Intermediário | 20 | 16 |
| Avançado | 45 (e ao menos 8 em cada um de 3 papéis) | 36 (idem) |

- **Perda:** avaliada a cada 25 de peso. Perde **um nível** se os pontos ficarem abaixo de **70% do limiar do nível
  atual**. Pode recuperar. Perder o avançado retira título e skill única (seção 5).

### 8.3 Feitos ajustados (4.1)

| Pilar / papel | Feito |
|---|---|
| Mente / dano | Causar dano com 3 skills em alvos com **Marcado ou Exposto** e vencer |
| Mente / tank | **Esquivar 3 ataques** na mesma batalha (não precisam ser seguidos) e vencer |
| Coração / controle | Vencer tendo estado em **desvantagem de 2 ou mais personagens vivos** (ex.: 1x3, 2x4) |
| Corpo / dano | **Abater 2 inimigos na mesma rodada** com skills de alvo único e vencer |
| Corpo / controle | Manter o mesmo inimigo sob **Atordoado, Preso ou Travado por 2 turnos dele seguidos** e vencer |
| Aura (nível maior) | No ranqueado vale **ranking maior** (nivelado, D46) |

Os demais feitos de 4.1 ficam como estão.

### 8.4 Skills únicas do avançado

| Skill | Valor |
|---|---|
| **Rei (Aura)** | Área: grade inteira. −15% em todos os stats por **3 turnos** do afetado. Chance pela fórmula de status (Precisão do Rei contra Vontade, base 80%). Conta como 1 fonte de debuff por stat |
| **Vidente (Mente)** | Alvo **perde 2 turnos seguidos**. Chance pelo DOM da Mente do alvo: sem DOM/básico 100% · intermediário 70% · avançado 30% |
| **Indestrutível (Corpo)** | Anula todo dano recebido **até o próximo turno do personagem** (inclui dano contínuo) |
| **Resiliente (Coração)** | Cura **50% do HP máximo** do usuário, sem lado negativo |

Todas de uso único por batalha.

### 8.5 Mais de um pilar avançado

**Sem teto:** cada pilar avançado dá **a sua skill única**, todas de uso único por batalha. Um personagem com 2
avançados leva **6 skills** (4 + 2). Justificativa: avançado é muito difícil de obter, e é um motivo para escolherem
quem conseguiu (inclusive quem não tem variante, que tem meta menor). O que limita é a raridade.

### 8.6 Título

Campo extra no personagem, fora dos 5 traços (D39).

## 9. Na prática (D152)

Como o servidor aplica o DOM. Código em `src/domain/characters/services/dom-rules.ts` e `dom-progress.ts` (níveis e
janela), `src/domain/combat/services/dom-feats.ts` (feitos) e `dom-skills.ts` (skills únicas).

### 9.1 Janela e níveis

- O personagem guarda os níveis dos pilares e a **janela**: as últimas batalhas até somar 150 de peso, cada uma com o
  peso do modo e os feitos que valeram. Batalhas seguidas sem feito ficam numa entrada só; ao passar de 150, as mais
  antigas saem (a sem feito encolhe, a com feito sai inteira).
- Pontos de um pilar = soma do peso das batalhas em que ele teve feito. No PvE o peso vem da dificuldade: Iniciante
  0,15, Intermediário 0,3, Avançado 0,4, Mestre 0,5, Grão-mestre 0,6. Desistência não conta.
- **Um feito por pilar por batalha.** Se o personagem cumprir mais de um no mesmo pilar, vale o do papel com menos
  pontos na janela (empate: dano, tank, suporte, controle). Assim ele se aproxima dos 3 papéis do avançado.
- **Subir:** no fim da batalha, cada pilar sobe **no máximo 1 nível** se os pontos chegam ao limiar do próximo (8 / 20
  / 45; sem variante 6 / 16 / 36). O avançado pede também 8 pontos em ao menos 3 papéis.
- **Cair:** a cada 25 de peso jogado, o pilar com pontos abaixo de 70% do limiar do nível atual cai um nível.
- **Stats:** o % do DOM soma com o dos traços, fora do teto de +15% deles (vem depois dos tetos, 8.1). Pilares no mesmo
  stat somam (Corpo e Aura dão Ataque).
- **Admin** define os níveis direto (`PUT /admin/characters/:id/dom`), para testar. A janela fica como está e a perda
  volta a contar do zero.

### 9.2 Feitos (leitura exata)

Todos exigem **vencer**. Medidos pelos eventos da batalha, só do lado do jogador.

| Pilar / papel | Feito |
|---|---|
| Mente / dano | 3 usos de skill que causaram dano num alvo que estava Marcado ou Exposto (cada uso conta uma vez) |
| Mente / tank | Esquivar 3 ataques (`MISS` com ele de alvo) |
| Mente / suporte | Dar um buff num aliado e esse aliado abater um inimigo antes do próximo turno de quem buffou |
| Mente / controle | Numa mesma rodada, pôr debuff, status ou Travado em todos os inimigos vivos no fim dela, sem levar dano nessa rodada |
| Coração / dano | Dar o golpe que abate o último inimigo, terminando vivo com menos de 20% do HP |
| Coração / tank | Ser o mais atacado da squad (golpes e erros contra ele) em 5 rodadas, não precisam ser seguidas, e terminar vivo; empate conta para todos os empatados |
| Coração / suporte | Curar aliados (sem contar ele mesmo) num total de 100% do próprio HP máximo e terminar vivo |
| Coração / controle | A squad ter estado com 2 ou mais vivos a menos que o inimigo; vale para quem termina vivo |
| Corpo / dano | Abater 2 inimigos na mesma rodada com skills de alvo único |
| Corpo / tank | Receber mais da metade do dano que o inimigo causou na squad (o que o escudo segurou conta; Interceptar e Proteger já põem o golpe nele) |
| Corpo / suporte | O escudo dele (o último posto no aliado) segurar um golpe que teria abatido o aliado, e o aliado terminar a rodada vivo, em 2 aliados diferentes |
| Corpo / controle | O mesmo inimigo, em 2 turnos seguidos dele, perder o turno por Atordoado ou Adormecido, começar o turno Preso ou ter sido Travado desde o turno anterior, sempre por ele |
| Aura / dano | Abater um inimigo de nível maior que o dele |
| Aura / tank | Vencer uma squad de nível médio maior que o da squad dele; vale para quem termina vivo |
| Aura / suporte | Vencer uma squad de nível médio maior com a squad inteira viva |
| Aura / controle | Pôr 3 debuffs (ou status, ou Travado) num mesmo inimigo e ele depois perder um turno |

O abate é de quem deu o último golpe (como no XP). No ranqueado, a Aura vai usar o ranking em vez do nível (8.3).

### 9.3 Skills únicas na batalha

- Entram depois das 4 da build (uma por pilar avançado, na ordem Mente, Coração, Corpo, Aura). Tipo Final, sem
  linhagem, sem Desgaste, sem recarga, sem teste de acerto e **uso único**. Silenciado e Travado valem para elas como
  para qualquer skill (o Travado prefere a mais forte, então costuma pegar a única).
- **Rei:** todos os inimigos. Uma chance por alvo pela fórmula de status (Precisão contra Vontade, base 80%); se pegou,
  −15% nos 7 stats por 3 turnos do afetado (uma fonte de debuff por stat).
- **Vidente:** um inimigo, Atordoado por 2 turnos. A chance vem do DOM da Mente dele (sem ou básico 100%,
  intermediário 70%, avançado 30%). Respeita a imunidade anti-cadeia: quem acabou de perder o turno por Atordoado fica
  imune.
- **Indestrutível:** até o próximo turno dele, todo dano recebido vira 0: golpe, contra-ataque, a parte do Ligado e o
  dano contínuo do início desse próximo turno. O próprio Desgaste não é dano recebido.
- **Resiliente:** cura Poder 5 em si (50% do HP máximo do nível 40 em diante; 40% até o 20). É uma cura como as outras:
  sofre a redução da Exaustão e a Ferida.
- No MVP o NPC não tem DOM. A IA sabe pontuar as skills únicas (para a simulação), mas na batalha só o jogador as tem.
