# ORIGIN — XP, nível e progressão (brief)

> XP, curva de nível, liberação de skills e pontos livres (parte 1), mais o registro do modelo de personagens
> (parte 2, ainda não desenhada). Decisões em `game_design.md` (D76, D77).
> Personagem em [`character_brief.md`](./character_brief.md) 4 e 7.
> **[ENRAIZADO]** = decidido · **[PLACEHOLDER]** = número provisório · **[ABERTO]** = a decidir.

---

## Parte 1. XP, nível e skills

### 1.1 Fonte de XP [ENRAIZADO]

| Regra | Valor |
|---|---|
| Base | A **vitória** dá XP base; as **métricas** somam por **participação** (parte do total, como no DOM) |
| Métricas | Dano, mitigação, cura, escudo, buff, debuff, abates... **cada classe tem as métricas próprias** |
| **Suporte** | Métricas de suporte (cura, escudo, buff, debuff) **pesam igual ao dano**, com **retorno decrescente** por métrica (sobe devagar, aceito, sem virar farm) |
| **Modo e dificuldade** | **Ranqueado** e **adversário mais forte** rendem mais. **PvE** tem retorno decrescente contra o **mesmo NPC** |
| **Quem recebe** | Os **4 que entraram**, proporcional à participação |
| **Catch-up** | Personagem **abaixo do nível médio da conta** ganha bônus de XP |
| **Amistosa** | Não conta (D54) |

**Valores (D92, placeholder aprovado):**

| Item | Valor |
|---|---|
| Pool por batalha | Vitória 400 XP, derrota 160 XP (40%) |
| Divisão entre os 4 | 40% igual, 60% proporcional às métricas |
| Peso das métricas | Dano 1,0 · cura 1,0 · escudo 1,0 · mitigação 0,8 · buff/debuff 0,4 do ganho · abate 10% do HP do abatido; retorno decrescente (expoente 0,85) |
| Amistosa | 0 (D54) |
| PvE Iniciante / Intermediário / Avançado / Mestre / Grão-mestre | ×0,6 / ×0,8 / ×1,0 / ×1,2 / ×1,4 |
| Ranqueado | ×1,5 |
| Mesmo NPC | −10% por repetição nas últimas 10 batalhas, piso ×0,4 |
| Catch-up | +2% por nível abaixo da média da conta, máx. +50% |

### 1.2 Curva de nível [ENRAIZADO]

- Níveis de **0 a 100**. Início rápido (ensina o jogo), **últimos níveis muito difíceis**, para o personagem não
  estagnar nem a progressão ficar sem graça depois de um tempo.
- **Curva (D92):** custo de n para n+1 = `70 × (1 + n/25)²` XP (~71.500 acumulado no nível 100; referência PvE Avançado ×1,0). **Meta (D91):** nível 100 em ~1.000 batalhas por personagem (~150 h); XP por nível convexo.
- **Ganho de stat (D91):** linear, 34% dos stats do nível 100 no nível 0, mais os pontos livres. A dificuldade fica no XP, não no stat.

### 1.3 Skills a cada 5 níveis [ENRAIZADO]

- **A cada 5 níveis** (5, 10, ..., 100): um **bloco de 3 skills sorteadas** pelo sistema; o jogador **escolhe 1**.
- **Nunca** aparece uma skill que o personagem **já tem**.
- Cada skill tem **nível mínimo**: nunca aparece uma com nível mínimo acima do nível do personagem.
- **As skills escolhidas ficam guardadas** (acumulam). O jogador **monta as 4 de batalha fora da partida**, a partir
  das que já tem (D43). Nada é descartado depois de escolher outra.
- Total: **kit básico** (nível 0, D50) **+ 20 escolhas** até o nível 100, mais skills de despertar (D67) e de DOM
  avançado (D60).
- Só vêm skills das **próprias variantes** do personagem (D41).
- **As 2 não escolhidas voltam ao pool** e podem reaparecer em ofertas futuras (diferente dos traços, D44).

**Sorteio com favorecimento leve às skills recém-liberadas:**

```
peso = 1 + 0,30 × max(0, 1 − (nível atual − nível mínimo da skill) / 10)
```

- Skill que **acabou de liberar** (nível mínimo = nível atual): peso **1,30**.
- Skill liberada **5 níveis atrás**: peso **1,15**.
- Skill liberada **10 níveis ou mais atrás**: peso **1,00** (peso base).
- O sorteio escolhe as 3 **sem repetição** dentro do bloco, proporcional ao peso.
- Efeito pequeno de propósito: as novas aparecem um pouco mais (cerca de 3 a 5 pontos percentuais de chance a mais
  no conjunto), mas as antigas continuam saindo com frequência [PLACEHOLDER: 0,30 e janela de 10 níveis].

**Na prática (D135):** o bloco oferece o que tiver (1 ou 2 com pool curto; nível sem nenhuma elegível não gera
bloco), fica numa fila sem prazo e não dá para recusar.

**Implicação para o admin:** cada variante precisa de um **pool grande** (algumas dezenas de skills), com skills de
vários níveis mínimos, para que as ofertas sejam variadas.

### 1.4 Pontos livres [ENRAIZADO]

- **A cada 10 níveis** (10, 20, ..., 100): 10 concessões, todas do mesmo tamanho (**1,5% do orçamento total, ~10 pontos cada, 100 no total**, D91).
- Vão em qualquer stat **até o teto da classe** (D70). Redistribuição grátis fora da batalha.
- Motivo: na faixa **prata** (nível 20, D63) já há 2 concessões e o jogador pode montar uma build.

### 1.5 Metas de traço [ADIADO para conversa com o admin]

Os traços (D39) são ofertados quando o personagem bate uma **meta do histórico** (ex.: "finalizou 1.000 inimigos").
A **lista de métricas e metas** por categoria (Combate, Postura, Origem) fica para ser definida **com o admin**. No MVP
os traços são atribuídos direto no `seed.ts`.

---

## Parte 2. Conta e personagens (ainda não desenhada) [REGISTRO]

### 2.1 A conta (definida)

A conta guarda: **inventário, moeda, organização, reputação, ranking**. (Títulos continuam do personagem, D55.)

### 2.2 Personagens: raridade e passivas [ENRAIZADO a direção]

- **Personagem único (um só no mundo) foi descartado**: causaria vantagem permanente e "personagem morto" quando o
  dono para de jogar, e não cria variedade (todo mundo quer o mesmo).
- Alguns personagens (**Ecko**, **Lucky**) devem ser **difíceis de adquirir**. Termo: **raridade** (quão difícil) e,
  se necessário, **exclusividade** (só por um caminho específico). Raridade **não** dá mais poder: o orçamento é o mesmo
  (D69); o raro tem **identidade** (passiva, skills de pool próprio).
- **Todo personagem tem uma passiva atrelada**, definida no modelo (template). Ela diferencia personagens da mesma classe
  e família (ex.: Yuki Glassier x Sunna Glassier, ambas de gelo), e **não ocupa** slot de skill nem de traço.
- A passiva **não custa orçamento de stats**: é **identidade vinda da história/lore**, não bônus numérico. O equilíbrio
  vem de ela ser **lateral** (muda como se joga), **com contra-jogo**, e do ajuste do admin pelos dados de uso.
- **Exemplos do usuário:** **Ecko** (antimatéria apaga matéria inanimada com facilidade, a viva custa mais): "**ignora
  escudos e bate na vida**". **Lucky** (raio e tempo): "**a cada 3 turnos, reduz em 1 a recarga de todas as skills
  que estão recarregando**".
- **Quatro formatos** que o motor precisa aceitar: **permanente** (altera uma regra), **condicional** (por estado ou
  posição), **periódica** (a cada N turnos do próprio personagem, D31) e **reativa** (ao ocorrer um evento: abater,
  ser atingido, curar).
- **Randoms** (ex.: Yuki Glassier, uma Glassier com poder de gelo) são modelos com **muitas instâncias**; a passiva é
  **criada pelo admin e fixa no modelo** (todas as Yuki Glassier têm a mesma). Ver 2.11 (D83).

**Raridade [ENRAIZADO, revisado em D86]:** escala **E, D, C, B, A, S, SS**, fixa no modelo (fácil de entender só de
ver). A **Classificação de perigo da Sombra** (Discreto a Caótico, `world_build.md` 6) virou a **periculosidade**,
própria de cada personagem e que pode subir (2.13). Raridade **não** dá mais poder (orçamento igual, D69).

**Obtenção [ENRAIZADO a lista, detalhes ABERTOS]:** por **várias formas**: **história, eventos, baús, premiações
(ranking) e eventos únicos**, além do mercado. Detalhe em 2.10 (D82).

Tópicos a discutir **na parte 2** (marcados como **pendentes**; o usuário parou aqui):

1. Distribuir os personagens na **classificação de raridade** (fechada); peso de cada caminho de obtenção.
2. Regras da **passiva**: quantas por personagem (hoje 1), catálogo de gatilhos e efeitos que o motor aceita, e como
   evitar passiva dominante sem custo (contra-jogo, dados de uso).
3. Inventário, economia, mercado, baús e pity, aprimoramento de skill, modelo de negócio.

### 2.3 Pendências da parte 2 [PENDENTE, retomar depois]

**Personagens (fechado até aqui):** sem único, raridade, passiva por personagem (D78), obtenção por várias formas.

**Mercado, inventário, economia e baús: fechados (D79).** Ver 2.4 a 2.7.
**Aprimoramento de skill e títulos: fechados (D80).** Ver 2.8 e 2.9.
**Obtenção de personagens e exclusividade: fechadas (D82).** Ver 2.10.
**Regras da passiva: fechadas (D83).** Ver 2.11.
**Modelo de negócio: fechado o princípio (D84).** Ver 2.12.

**Ainda pendente (o usuário deixou para depois):**

Nada. **Parte 2 fechada** (D79 a D86); restam só valores (placeholders) e o funcionamento detalhado do mercado.

### 2.4 Mercado [ENRAIZADO o princípio, detalhes ADIADOS]

- Compra e venda **entre jogadores** de personagens, armas, armaduras e outros itens (referência: mercado do FIFA).
  Objetivo: quem não conseguiu um personagem pela sorte consegue pela compra.
- Etapa **avançada**: o funcionamento (leilão, preço, listagem, limites) fica para depois.
- **Item vinculado pode ser vendido.** Ao vender:
  - **Personagem** vai **com nível, skills e aprimoramentos** (é o que dá valor). **Títulos e traços conquistados se perdem** (D80, D86; o traço de Origem fica):
    conquista de quem jogou e não podem ser comprados. **O DOM também se perde** inteiro (D81, `dom_brief.md` 5).
  - A **arma/armadura equipada não vai junto**: volta ao inventário do vendedor.
  - Os **contratos com bestas se desfazem** (a besta é perdida, ver 2.5).
  - Equipamento vendido ou trocado de personagem **zera o elo** (o elo é por personagem, `living_gear_brief.md`).
- **Taxa sobre cada venda** (saída de moeda, ver 2.6), cobrada pelo **Banco Central**. Conta associada ao Banco Central
  paga **taxa menor** (`family_faction_brief.md` 3.2).

### 2.5 Inventário e Elenco [ENRAIZADO]

- **Inventário** é da **conta**: armas, armaduras e bestas que **ainda não estão vinculadas** a um personagem.
- **Limite fixo:** 30 espaços, expansível até 100 (D100, Parte 3).
- Item pode ser **descartado** ou **vendido ao sistema** (vira moeda), para o inventário nunca travar.
- **Contrato desfeito = besta perdida**: ela **não volta** ao inventário. A interface pede confirmação clara.
- **Personagens não ficam no inventário**: moram no **Elenco**, lugar separado, **sem limite** por ora.

### 2.6 Economia [ENRAIZADO]

- **Uma moeda só** no início.
- **Origem:** batalhas (ranqueado rende mais, contra a máquina rende menos), eventos, venda ao sistema e no mercado.
  **Derrota rende menos** que a vitória, mas rende.
- O **retorno decrescente contra o mesmo NPC** (D76) vale também para a **moeda**: impede farm da máquina.
- **Destino:** mercado, baús e aprimoramento.
- **Saídas de moeda** contra inflação: taxa do mercado (2.4) e compra de baús.

### 2.7 Baús [ENRAIZADO]

- **Níveis de baú** usam a escala de raridade: **E, D, C, B, A, S, SS** (D86; antes Discreto a Caótico).
- **Sem teto por baú**: **qualquer baú pode dar qualquer item de qualquer raridade**; o que muda é a **porcentagem**
  (baú ruim tem chance muito menor de algo raro). Referência: Clash Royale. Mantém o "tentar a sorte".
  Exceção: grau **Divino** continua fora dos baús (`living_gear_brief.md` 3).
- **Obtenção:**
  - Os **mais básicos** podem ser **comprados com moeda** e têm **chance de cair no fim da batalha**.
  - Os **mais raros e exclusivos** vêm de **eventos** e do **ranqueado** (a raridade do baú sobe com a posição no
    ranking).
- **Sem pity automático.** No lugar, **missões** visíveis que dão baús (ex.: "abra 100 baús → ganhe 1 baú Caótico").
- **Personagens em baú:** **qualquer personagem pode vir de qualquer baú**, exceto os marcados como **exclusivos**
  (2.10). O raro num baú comum tem chance **baixíssima**. Um exclusivo **pode** entrar nos baús depois, se o admin
  quiser (ver 2.10).
- Valores fechados em D100 (Parte 3, 3.5).

### 2.8 Aprimoramento de skill [ENRAIZADO]

- O aprimoramento dá **mais potência** à skill. Nada de efeito novo, área ou mecânica extra (isso viraria outra skill).
- **Um aprimoramento só** por skill, por ora (básica → aprimorada).
- **Custo da tentativa:** **materiais** (Fragmentos de Éon por linhagem, D104, 3.9) **+ moeda**.
- É uma **tentativa com chance**. **Na falha, perde só o custo**: a skill não regride nem quebra.
- **Chance fixa**: não cresce com as falhas (sem pity). A ideia é ser **difícil**.
- **Títulos** aumentam a chance, mas **cada skill indica qual(is) título(s) a ajudam**; os outros títulos não contam.
  Assim, acumular títulos não facilita aprimorar tudo.
- **Ranqueado:** skill aprimorada vale, **limitada pela faixa** (D63).
- O aprimoramento **vai junto** com o personagem vendido (2.4).
- Valores fechados em D100 (Parte 3, 3.6).

### 2.9 Títulos [ENRAIZADO a direção]

- **Pertencem ao personagem** (D55). Vêm de feitos da história, de eventos, do ranqueado por temporada e do DOM
  avançado (D60).
- **Nunca dão stat direto.** Funcionam como a **reputação do personagem**.
- Efeitos:
  - **Aprimoramento de skill:** o título certo aumenta a chance de aprimorar a skill ligada a ele (2.8).
  - **Elo da arma viva e contrato com besta** (D81): mesma ideia das skills. **Cada equipamento e cada besta tem uma
    lista de títulos que ajudam** a firmar o elo ou o contrato; os outros títulos não contam. **Cada título da lista
    vale por um requisito cumprido** (determinístico, sem chance). Ex.: arma pede 3 requisitos, o personagem cumpre
    2 e tem 1 título da lista → elo pleno. [PLACEHOLDER] Máximo de requisitos substituídos por título: 1.
- **Perdem-se na venda** do personagem (2.4), assim como o **DOM inteiro** (D81).

### 2.10 Obtenção de personagens e exclusividade [ENRAIZADO]

- **Personagens iniciais:** a conta começa com **personagens fixos, um de cada classe** (8, D69). Depois o jogador vai
  trocando conforme consegue outros.
- **Baús:** qualquer personagem não exclusivo pode vir de qualquer baú, por porcentagem (2.7).
- **História:** capítulos e missões podem dar personagens [ABERTO o detalhe].
- **Exclusivos:** personagem marcado como exclusivo de **evento** ou de **ranking** (premiação) **não vem de baú**.
  - O admin **pode** liberá-lo nos baús depois, **sem prazo definido** (decisão do admin). Não é regra.
  - Exclusivos **por mérito** (ranking) tendem a **nunca** entrar em baú.
- **Repetido** (personagem que a conta já tem, incluindo randoms do mesmo modelo) **vira moeda**. Randoms teriam muita
  oferta e pouca demanda no mercado, então não faz sentido guardar a cópia.
- **Mercado:** personagem **exclusivo** (de evento **ou** de ranking) **não pode ser vendido**: é conquista, como
  títulos e DOM. A trava é do **modelo**: quando o admin libera o exclusivo nos baús, ele deixa de ser exclusivo e
  **passa a poder ser vendido**.

### 2.11 Regras da passiva [ENRAIZADO]

- **Uma passiva por personagem**, **criada pelo admin** e **fixa no modelo**. Objetivo: **unicidade**, mais diversidade
  de personagens na batalha.
- **Sempre condicional ou lateral:** a passiva **nunca** é aumento de status puro (ex.: "+10% de dano" está fora).
- **Gatilhos e efeitos: catálogo aberto**, crescendo caso a caso conforme o admin cria passivas. O motor precisa de um
  modelo **extensível** de gatilho + efeito. Lista inicial:
  - **Gatilhos:** início do turno, ao atacar, ao ser atingido, ao abater, ao curar, ao entrar no Desgaste, HP abaixo
    de X%, posição na grade, ao entrar um campo de batalha, ao sofrer um status negativo específico.
  - **Efeitos:** ignorar escudo, mexer na recarga, aplicar status, curar, mudar a ordem na fila, reduzir dano.
- **Despertar** pode dar uma passiva nova a **alguns** personagens. Não é regra: depende do personagem.
- **Visível** ao adversário antes e durante a partida.
- **Vale no ranqueado** (todo personagem tem uma). Ajuste pelo admin com dados de uso (2.2).
- **Passiva do personagem + passiva da arma viva: se acumulam.** Efeitos **iguais** não
  somam (vale o mais forte), seguindo o limite de fontes de `skills_brief.md` 11.10.

### 2.12 Modelo de negócio [ENRAIZADO o princípio, implementação FUTURA]

- **No início, nada é pago.** A venda entra só em **etapas avançadas** do projeto.
- **Forma:** **comprar a moeda do jogo** com dinheiro real. **Sem segunda moeda**: com a moeda comprada, o jogador
  adquire o que quiser (baús, mercado, espaço no inventário, aprimoramento).
- **Pode ser comprado** (via moeda): **baús**, **espaço no inventário**, itens e personagens no **mercado**.
- **Pagar acelera, não exclui:** quem paga consegue **mais rápido**, mas **nada** que quem joga de graça não consiga.
  Aceito de propósito: o jogo precisa dos jogadores que gastam mais.
- **Comprar no mercado com moeda comprada** é aceito (forma indireta de comprar personagem com dinheiro).
- **Nunca se compra** (é conquista, já decidido): **títulos** (D80), **DOM** (D81), **personagens exclusivos** de
  evento e ranking (D82), grau **Divino** e **bestas sagradas** (só por evento único).
- **Futuro:** skins/cosméticos e **passe de temporada** (trilha gratuita + paga).

### 2.13 Distribuição dos personagens na raridade [ENRAIZADO]

- **Quem vira personagem jogável e em qual nível: decisão do admin.** Não há tabela fixa no doc.
- No jogo a raridade mede **dificuldade de obter**, não perigo; haverá **mais personagens de topo que a lore** e a
  proporção por nível não segue a lore. (Na lore, o outro Caótico da geração do Ecko é o **Draxler**; sem efeito no jogo.)
- **Randoms** ficam nos níveis **baixos**.
- Os **personagens iniciais** (um por classe, D82) são **randoms**.
- Os de topo **podem sair de baú** (com chance baixíssima), **exceto** os exclusivos de evento ou ranking, que só
  entram se o admin liberar (2.10).

**Duas escalas separadas (D86):**

| | Raridade | Periculosidade |
|---|---|---|
| Escala | **E, D, C, B, A, S, SS** | **Discreto, Contínuo, Diferenciável, Não-Linear, Caótico** (lore) |
| De quem é | Do **modelo** | De **cada personagem** (instância) |
| Muda? | **Fixa** | **Sobe**, **nunca cai** |
| Mede | Dificuldade de obter | O perigo que o personagem já mostrou ao mundo |
| Usada em | Baús, mercado | Requisitos (abaixo) |

- **Periculosidade não dá stat.** Serve de **requisito**: libera **eventos** e certos **traços** (ex.: traço que exige
  Não-Linear). Resolve o caso do Tank: o personagem cresce em perigo, como na lore.
- **Nível inicial** de periculosidade: definido pelo admin no modelo.
- **Como sobe:** principalmente **liderar o ranking do ranqueado** e **missões que dão periculosidade**. **Vencer
  batalhas sobe pouco.** [PLACEHOLDER] valores.
- **Venda:** a periculosidade **volta ao nível inicial do modelo** (é conquista, como título e DOM).
- **Traços na venda:** os traços **conquistados se perdem**; o traço de **Origem** (família)
  fica, pois é do modelo. Isso evita vender personagem com traço que exige periculosidade alta.

---

## Parte 3. Valores da economia (D100)

**[PLACEHOLDER aprovado]**, ajustar com simulação. **Âncora:** 1 dia de jogo ≈ 10 batalhas ≈ **1.000 moedas (M)**.

### 3.1 Moeda por batalha

- **Base:** vitória **130 M**, derrota **70 M** (média ~100 M).
- **Modificadores** (iguais aos do XP): ranqueado ×1,5 · casual ×0,8 · PvE Iniciante / Intermediário / Avançado /
  Mestre / Grão-mestre ×0,6 / 0,8 / 1,0 / 1,2 / 1,4 · amistosa 0.
- **Mesmo NPC:** −10% por repetição nas últimas 10 batalhas, piso ×0,4.
- Ancora o empréstimo do Banco Central (3 dias de ganho médio = ~3.000 M; até 10.000 M com reputação).

### 3.2 Inventário

**30 espaços** no início. Compra de **+5 espaços** por vez com preço crescente (300, 600, 1.000, 1.500, 2.000 M,
e assim por diante), até **100**. Equipamento e besta ocupam 1 espaço cada.

### 3.3 Venda ao sistema e repetido que vira moeda

| Raridade | E | D | C | B | A | S | SS |
|---|---|---|---|---|---|---|---|
| Valor (M) | 40 | 100 | 250 | 600 | 1.500 | 3.500 | 9.000 |

Equipamento e bestas seguem o mesmo valor pelo grau: Escudeiro ≈ E, Cavaleiro ≈ C, Mestre ≈ A, Rei ≈ SS.

### 3.4 Mercado

- **Taxa:** **10%** sobre cada venda; associado ao Banco Central **6%**. O calote dobra (20% e 12%, D89).
- **Preço fixo apenas** no início (leilão depois). Listagem de **48 h**, no máximo **10 listagens ativas** por conta.
- **Preço mínimo** de listagem = valor de venda ao sistema (evita lavagem de moeda).
- **Item comprado só pode ser revendido após 24 h** (anti-especulação).

### 3.5 Baús

Porcentagem por raridade do item (peso proporcional a `q^r`, com `q` crescendo por nível do baú):

| Baú (q) | Item E | D | C | B | A | S | SS |
|---|---|---|---|---|---|---|---|
| E (0,30) | 70,0 | 21,0 | 6,3 | 1,9 | 0,6 | 0,2 | 0,05 |
| D (0,40) | 60,0 | 24,0 | 9,6 | 3,8 | 1,5 | 0,6 | 0,25 |
| C (0,50) | 50,4 | 25,2 | 12,6 | 6,3 | 3,1 | 1,6 | 0,8 |
| B (0,65) | 36,8 | 23,9 | 15,5 | 10,1 | 6,6 | 4,3 | 2,8 |
| A (0,80) | 25,3 | 20,2 | 16,2 | 13,0 | 10,4 | 8,3 | 6,6 |
| S (1,00) | 14,3 | 14,3 | 14,3 | 14,3 | 14,3 | 14,3 | 14,3 |
| SS (1,30) | 5,7 | 7,4 | 9,6 | 12,5 | 16,2 | 21,1 | 27,5 |

- **Compráveis:** E por **300 M**, D por **1.000 M**, C por **3.500 M**. De B a SS: eventos, ranqueado e missões.
- **Retorno** se tudo fosse vendido ao sistema: ~32%, 16% e 8% do preço (sempre saída de moeda).
- **Drop no fim da batalha** (vitória; derrota metade): baú E **20%**, D **5%**, C **1%**.
- **Recompensa do ranqueado** (fim de temporada): Bronze baú D · Prata C · Ouro B · Platina A · Lenda S.
- **Missões de baú** (exemplos; as definitivas são do admin): abrir 100 baús dá 1 baú A; vencer 50 ranqueadas dá 1
  baú C.

### 3.6 Aprimoramento de skill

- **Ganho:** **+15% de Poder** (ou de efeito, em buff, cura e escudo). Sem efeito novo.
- **Chance:** base **25%**; cada título certo **+10 pontos**, no máximo 2 títulos (até **45%**).
- **Custo da tentativa** (falha perde só o custo):

| Tipo da skill | Moeda | Materiais (genéricos) |
|---|---|---|
| Básica | 300 | 3 |
| Padrão | 500 | 5 |
| Reforçada | 1.000 | 8 |
| Forte | 2.000 | 12 |
| Final | 4.000 | 20 |

Aprimorar uma Final sem título custa ~16 dias de jogo (difícil de propósito).

### 3.7 Periculosidade

Pontos: **+1 por vitória ranqueada**, **+50** por fim de temporada no top 100, **+200** no top 10, **+100 a +300**
por missão (admin). Limiares de cada nível: **500 / 1.500 / 4.000 / 10.000**. Nunca cai; volta ao inicial na venda.

### 3.8 Fora de escopo agora

Compra de moeda com dinheiro real (futuro). O caminho "Materiais" foi fechado em D104 (3.9).

### 3.9 Materiais: Fragmentos de Éon (D104)

**[PLACEHOLDER aprovado]**. Recurso do aprimoramento de skill (3.6); não é segunda moeda (D84).

- **Tipos:** 6 **Fragmentos de Éon**, um por linhagem (Elemental, Material, Vetorial, Psíquica, Biológica,
  Fundamental), mais o **Fragmento Neutro** para skills none. Aprimorar uma skill gasta fragmentos **da linhagem dela**
  (quantidades de 3.6).
- **Guarda:** contadores na conta, **limite de 500 por tipo**, **sem ocupar espaço** do inventário (3.2).
- **Origem:** no fim da batalha, vitória **2** fragmentos, derrota **1**, multiplicado pelo modificador do modo (o
  mesmo da moeda, 3.1; amistosa 0). A fração é resolvida pela seed (ex.: 1,2 vira 1 e 20% de chance de um 2º).
  **Tipo:** sorteado entre os personagens da squad que entrou; com 2 variantes, entre as duas; sem variante, Neutro.
  Também vêm de baús, eventos e caças (bônus dos Celestes, D101). Média ~15 por dia (10 batalhas).
- **Compra do sistema:** **200 M** por fragmento, sem limite. **Venda ao sistema:** **40 M**. **Mercado entre
  jogadores:** negociável em lotes, com a mesma taxa (3.4).
- **Referência:** aprimorar uma Final (20 fragmentos + 4.000 M por tentativa, chance 25%, até 45% com 2 títulos)
  leva ~11 dias de farm com squad de uma linhagem; comprar tudo custa ~28 dias de ganho no pior caso. Farmar rende
  mais que comprar.
- **Adiados (depois do MVP):** os caminhos Enxerto, Rede e Selo da lore.
