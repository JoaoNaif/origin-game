# ORIGIN — Eventos (brief)

> Regras dos eventos, decididas na conversa própria. Decisão resumida em `game_design.md` (D155; aplicação no
> servidor no D156, seção 10).
> Liga com organizações ([`family_faction_brief.md`](./family_faction_brief.md) 3 e 5), bestas
> ([`beast_contracts_brief.md`](./beast_contracts_brief.md)), equipamento vivo ([`living_gear_brief.md`](./living_gear_brief.md)),
> obtenção de personagens e economia ([`progression_brief.md`](./progression_brief.md) 2.10 e 3) e IA ([`pvp_brief.md`](./pvp_brief.md) 8).
> **[ENRAIZADO]** = decidido · **[PLACEHOLDER]** = número provisório · **[DEPOIS]** = fora do primeiro corte.

---

## 1. O que é [ENRAIZADO]

- Evento é um **momento específico**, que passa a ideia de **raridade**: não acontece sempre. Pode ser único ou se
  repetir, mas **sempre tem fim**.
- **O admin idealiza e cria** cada evento (catálogo, como despertar, equipamento e bestas). O código oferece os
  **tipos**, os **requisitos**, os **modificadores** e as **formas de recompensa**; o admin combina.
- **Duração não é fixa:** cada evento tem a sua.
- **Datas:** cada evento tem **anúncio**, **início** e **fim**. Entre o anúncio e o início ele já aparece no front
  ("começa em..."), sem permitir entrar.
- **Vários eventos ao mesmo tempo** são permitidos, sem limite; fica a cargo do admin.
- **Missões são outro sistema** (seção 9): podem ser temporárias, mas não é regra. Evento é sempre temporário.
- **Eventos ocultos** (D88, requisitos secretos revelados pelo Registro): **[DEPOIS]**.

## 2. Requisitos de entrada [ENRAIZADO]

Cada evento pode ter **nenhum ou vários** requisitos, escolhidos de uma lista fixa no código:

| Requisito | Exemplo |
|---|---|
| **Nível mínimo** (do personagem ou da conta) | "personagens nível 40+" |
| **Composição do squad** (quantos de uma classe ou papel, linhagem, família) | "4 suportes no squad" |
| **Organização** | "só membros dos Celestes" |
| **Periculosidade mínima** (D86) | "periculosidade Perigoso ou acima" |
| **Raridade máxima** | "só personagens E e D" |

Requisito de squad é conferido **ao entrar em cada batalha** do evento.

## 3. Tentativas e progresso [ENRAIZADO]

- **Limite de tentativas: o admin decide** por evento: **ilimitadas** ou **N por dia**.
- **Os personagens evoluem durante o evento** (XP, DOM, despertar etc. seguem valendo nas batalhas do evento).
- **Squad fixo ou livre: o admin decide** por evento. No fixo, o squad trava na primeira batalha do evento.
- **Evento que termina no meio:** o jogador **fica com os prêmios das etapas já vencidas** e perde só o que não
  concluiu (o prêmio principal, por exemplo).

## 4. Recompensas [ENRAIZADO]

### 4.1 O que pode ser dado

Personagem (inclusive **exclusivo**, D82), besta, equipamento vivo, moeda, fragmentos, baú, traço, título, reputação
de organização (+60 por evento, faixa 40 a 100, D101).

### 4.2 Formas de entrega (o admin combina)

| Forma | Quem recebe |
|---|---|
| **Conclusão** | quem termina o evento |
| **Etapa** | quem vence cada etapa (pisos da torre, ondas); menor que o prêmio principal |
| **Ranking** | os melhores colocados (pontos, dano, onda alcançada) |
| **Participação** | todos que jogaram, prêmio pequeno |

### 4.3 Personagem exclusivo [ENRAIZADO]

- Fica **exclusivo até o admin liberar** nos baús (D82).
- **Repetido vira moeda** pela tabela de raridade (`progression_brief.md` 3.3: E 40 M a SS 9.000 M); raro dá mais.

### 4.4 Recompensa pendente (caixa de recompensas) [ENRAIZADO, prazo PLACEHOLDER]

- Recompensa que **não cabe** (inventário cheio) vai para uma **caixa de recompensas** da conta, com **notificação**:
  o jogador **abre espaço** e retira, ou **descarta**.
- Fica guardada por **14 dias** e depois some. O **front mostra a data limite**.

## 5. Tipos de evento [ENRAIZADO]

| Tipo | Como funciona | Liga com |
|---|---|---|
| **Torre** | Pisos em sequência (ex.: 1 a 10), cada um com um squad de NPC. **Perder não faz voltar**: tenta o mesmo piso de novo. **Cada piso é uma batalha do zero** (vida e Desgaste cheios). Prêmio pequeno **por piso** e o principal no fim. **Completa uma vez** por evento | |
| **Lançamento de personagem** | Evento que traz um personagem novo; em geral ele é **obtido ao concluir**. Exclusivo até o admin liberar | D82 |
| **Caça** | Um alvo raro (besta, Extirpador) aparece por tempo limitado. Vencer a besta dá **chance de captura** (5.1) | Celestes (D101), bestas (D64) |
| **Pesquisa** | Batalhas com **modificadores** de regra (5.2) | Sombra (D101) |
| **Chefe único** | Um chefe guardado por IA de nível alto. **Cada conta tem uma tentativa só**: perdeu, acabou. Fonte do **equipamento Divino** e das **bestas sagradas** | `living_gear_brief.md`, D64 |
| **Chefe mundial** | Chefe com **vida compartilhada** por todos os jogadores; cada batalha tira um pouco. **Todos que contribuíram ganham** um prêmio, e **os que mais contribuíram ganham bônus** (ranking de dano) | |
| **Ondas** | Ondas seguidas com o **mesmo squad até o fim** (5.3). Ranking pela onda alcançada | Desgaste (risco x retorno) |
| **Ranking por pontos** | Na janela do evento, cada batalha (com alguma regra) dá pontos; os melhores ganham | |
| **Organização** | Recompensa pela **organização do jogador** e a **posição dela** (5.4) | Organizações (D66, D101) |
| **Família** | Só personagens de uma família entram, ou eles têm bônus (a "convocação da família") | `family_faction_brief.md` 2 |
| **Equipe** **[DEPOIS]** | 3 jogadores contra 3 (máquina ou jogadores). Cada jogador com **a sua grade 3x3** (12 personagens por lado); **buffs e debuffs alcançam qualquer grade**; todos jogam **ao mesmo tempo**, na ordem da Velocidade. Pede motor com várias grades e jogo em tempo real: entra com o PvP | PvP (D74) |

### 5.1 Captura na caça [PLACEHOLDER aprovado]

| Grau da besta | Chance ao vencer |
|---|---|
| Escudeiro | 100% (direto) |
| Cavaleiro | 60% |
| Mestre | 35% |
| Rei | 20% |

- Falhou: pode caçar de novo, dentro do limite de tentativas do evento.
- **+10 pontos de chance a cada falha no mesmo evento** (exceção pequena ao "sem pity" do D79, que é dos baús; zera
  quando o evento acaba).
- **Sagradas não saem de caça**: só de **chefe único**.

### 5.2 Modificadores da pesquisa [ENRAIZADO a lista]

Lista fixa no código; o admin escolhe quais valem no evento: **campo fixo**, **uma linhagem só**, **stats
nivelados**, **Exaustão mais cedo**, **sem cura**, **Velocidade igual para todos**.

### 5.3 Ondas [ENRAIZADO]

- **Passa para a onda seguinte:** vida e Desgaste de cada personagem; quem caiu segue fora.
- **Recomeça a cada onda:** status, campo, barra de ação, recargas e Exaustão (cada onda é uma batalha nova).
- **Fim:** quando o squad inteiro cai. O resultado é a onda alcançada.
- O motor passa a aceitar começar a batalha com a vida e o Desgaste vindos de fora (não muda regra).

### 5.4 Evento de organização [ENRAIZADO]

- A posição da organização sai da **média** dos pontos dos membros que participaram (um membro muito ativo pode puxar
  uma organização pequena).
- A recompensa depende da **organização do jogador** e da **posição** que ela ficou.
- **Quem não tem organização participa**, com **recompensa menor** (o admin define quanto, por evento).

## 6. O que fica com o admin

Os eventos em si (tipo, datas, requisitos, modificadores, squads de NPC e chefes, recompensas e formas de entrega,
limite de tentativas, squad fixo ou livre), a lista de pisos e ondas e o perfil de IA dos chefes.

## 7. Pendências

- **Eventos ocultos** (D88): depois.
- **Equipe 3 contra 3**: com o PvP.
- **Perfil de IA próprio para chefes** (`pvp_brief.md` 8.2): até lá, chefes usam os 4 perfis existentes (o admin escolhe perfil e nível).
- **Missões** (seção 9): conversa própria.

## 8. Ordem sugerida de implementação

1. Catálogo de eventos, datas, requisitos e caixa de recompensas.
2. Torre, lançamento de personagem, caça, pesquisa e chefe único (cabem no motor atual).
3. Ondas (vida e Desgaste vindos de fora), chefe mundial e ranking por pontos.
4. Organização (depende da camada de organizações) e família.

## 9. Missões (registro)

Sistema **separado** dos eventos. Podem ser temporárias, mas não é regra. Já citadas nos docs: missões de baú
(`progression_brief.md` 3.5), de periculosidade (3.7) e as que dão reputação (+25, D101). Detalhe numa conversa própria.

## 10. Implementação (D156)

O que o servidor faz hoje (rotas em [`api.md`](./api.md), modelos em [`data_model.md`](./data_model.md) 3.18).
**Escolhas do Claude a conferir** marcadas com (C).

- **Catálogo:** `EventTemplate` em `/admin/events`, como os outros itens; as ligações (squads de NPC, campo, traço de
  família, prêmios, besta da caça) vão pela `key` e o catálogo inteiro confere. Tipos de agora: torre, lançamento,
  caça, pesquisa e chefe único (os da seção 8, passos 1 e 2).
- **Etapas (C):** todo tipo é uma lista de **etapas em sequência**, cada uma uma batalha PvE contra o squad de NPC dela
  (mesmo motor, mesma IA, **XP e loot normais**). A torre são os pisos; o chefe único, 1 etapa; a caça, a etapa do
  alvo. Só se joga a próxima depois de vencer a anterior.
- **Tentativa (C):** conta quando a batalha começa (`POST /battles`); o limite por dia vira à **meia-noite UTC**.
- **Squad fixo (C):** os mesmos 4 personagens da primeira batalha, em qualquer posição.
- **Participação (C):** o prêmio sai na **primeira batalha terminada** no evento, vença ou perca; **desistir não conta**
  nada (nem participação, nem etapa), como o XP (D136).
- **Caça (C):** o adversário é um **squad de NPC** (a besta como unidade inimiga fica para depois). Vencer rola a captura
  (5.1); capturou = a besta entra (ou vai para a caixa) e a etapa conta; falhou = a etapa não conta e a próxima
  tentativa ganha +10 pontos.
- **Modificadores (C):** valem em **qualquer tipo** (a pesquisa é obrigada a ter ao menos um ou o campo fixo).
  **Stats nivelados** troca só o nível das unidades dos dois lados (DOM, equipamento e bestas mantêm o bônus); **Velocidade
  igual** é a média do início e ignora buffs e debuffs de Velocidade; **sem cura** zera cura de skill, passiva e
  regeneração (escudo continua). Vão na foto da batalha (`rules`), então o replay sai igual.
- **Prêmios de agora:** moeda, fragmentos, baú, personagem, equipamento e besta. Traço, título e reputação entram com
  os sistemas deles.
- **Caixa:** equipamento e besta sem espaço no inventário vão para a caixa (14 dias). Retirar pede espaço; descartar
  some sem moeda.
- **Squads de NPC (C):** os dos eventos são squads comuns do catálogo e também aparecem no PvE de sempre (não existe
  "squad só de evento" ainda).
- **Ranking, ondas, chefe mundial, organização e família:** próxima etapa (seção 8, passos 3 e 4).
