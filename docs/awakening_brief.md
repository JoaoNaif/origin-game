# ORIGIN — Despertar (brief)

> Regras do despertar no jogo, decididas na conversa de pontos abertos. Decisões em `game_design.md` (D49 ajustado,
> D67). Lore em [`world_build.md`](./world_build.md) 3.2 e 5. Personagem em [`character_brief.md`](./character_brief.md) 6.
> **[ENRAIZADO]** = decidido · **[PLACEHOLDER]** = número provisório · **[ABERTO]** = a decidir.

---

## 1. O que é [ENRAIZADO]

- **Evolução da variante**: fogo vira fogo azul ou plasma (mais quente que o fogo comum).
- **Um único despertar** por personagem. **Não há estágios** no jogo.
- O efeito aparece nas **skills**: o personagem passa a ter skills da nova variante, **mais fortes que as base**.
  São skills raras, que a maioria dos personagens não tem.
- Segue o D52: skill despertada é mais forte e tem **mais Desgaste** (valores em 6.1).
- Vale no ranqueado (D56).

## 2. Quem pode [ENRAIZADO]

- **Todos podem, nada garante.** Depende de o **admin ter criado um despertar** para a variante (ex.: fogo tem;
  raio não tem ainda, e pode ganhar numa atualização). Não é uma característica do personagem em si.
- A variante pode ter **mais de um despertar** (fogo: azul e plasma).
- **Só personagens com exatamente 1 variante** podem despertar (seção 3.4).
- O sentido do lore (`world_build.md` 3.2 "≥95% de sincronização" e 5 "estágios dos Primordiais") **é só flavor**.
  No jogo vale esta regra única. A identidade visual do despertar dos Primordiais (cor, pressão, camada, alcance)
  é a forma narrativa dele.

## 3. Como acontece [ENRAIZADO]

Processo todo **oculto** ao jogador ("no escuro"):

1. **Gatilho:** o personagem chega ao **nível 80** (valor fechado por ora, ajustável).
2. **Elegibilidade:** o sistema olha se a variante tem despertar. Se não tem, nada acontece.
3. **Sorteio:** se a variante tem mais de um despertar (quantos, o admin define), o sistema **sorteia**. Cada
   despertar tem uma **chance**, e ela sobe quando combina com os **melhores stats** do personagem (ex.: forte em
   dano, o despertar de dano tem chance maior). Nunca garantido. Com um só, é ele.
4. **Missões ocultas:** definido o despertar, o sistema abre **missões que o jogador não vê**, ligadas ao perfil
   do despertar e **diferentes de personagem para personagem**, para não ficar óbvio como conseguir (ex.:
   "abater 1000 inimigos", "uma partida com mais de 5000 de dano").
5. **Liberação:** cumpridas as missões, o despertar é desbloqueado e as skills entram no pool do personagem.

**Skills do despertar:** quantas existem é o admin quem cria, e são **liberadas por nível**, como as demais skills
(D46). Não há quantidade fixa na regra.

### 3.1 Fórmula do sorteio [ENRAIZADO]

Funciona para qualquer quantidade de despertares (2, 3, 4...).

1. Cada despertar tem um **perfil**: 2 a 3 requisitos de stat ("Ataque alto", "Precisão alta"), na mesma lógica do
   elo do equipamento vivo (alto/baixo relativo ao próprio personagem, `living_gear_brief.md` 4.1).
2. **Afinidade** `a` do despertar com o personagem = fração dos requisitos que ele cumpre (de 0 a 1).
3. **Peso** do despertar = `1 + 0,5 × a`.
4. **Chance** = peso do despertar ÷ soma dos pesos de todos os despertares da variante.

Efeito: o despertar mais compatível tem **no máximo 1,5x** a chance do menos compatível, qualquer que seja o número
de despertares, e **nenhum** fica com chance zero.

| Despertares | Mais compatível (a=1), os demais (a=0) |
|---|---|
| 2 | 60% / 40% |
| 3 | 43% / 29% / 29% |
| 4 | 33% / 22% / 22% / 22% |

O fator `0,5` é o valor a ajustar para deixar o sorteio mais ou menos previsível **[PLACEHOLDER]**.

### 3.2 Regras de apoio [ENRAIZADO]

- As **missões** vêm do mesmo perfil do despertar sorteado.
- **O que conta:** PvP e PvE; **amistosa não conta** (D54), para evitar farm combinado.
- **Servidor decide:** sorteio e progresso das missões ficam no servidor (D33).
- **Sangue puro** (D65): **missões mais leves** (limiares menores, por exemplo -30% **[PLACEHOLDER]**). A chance do
  sorteio é a mesma.

### 3.3 Dica de proximidade [ENRAIZADO a ideia]

O jogador **não vê** o despertar sorteado nem as missões, mas recebe uma **dica qualitativa** de que está perto:

| Estado | Quando | O que mostra |
|---|---|---|
| **Silêncio** | Antes do nível 80, ou sem nenhuma missão cumprida | Nada |
| **Sinais** | Cumpriu cerca de 1/3 das missões | Aviso vago de que "algo desperta" |
| **Iminente** | Cumpriu cerca de 2/3 das missões **[PLACEHOLDER]** | Aviso de que está perto |

A dica **não revela** qual despertar nem quais missões faltam.

### 3.4 Quem não desperta [ENRAIZADO]

- **Só quem tem exatamente 1 variante.** Na lore, **2 e 3 variantes não conseguem despertar.**
- **Sem variante** também não (não há o que evoluir).
- Isso é o contrapeso natural do D52: mais variantes dão mais opções e custam mais **e** fecham o despertar.

## 4. No ranqueado [ENRAIZADO]

- O despertar vale (D56), mas o ranqueado nivela por faixa (D63): numa faixa com nível **abaixo do mínimo do
  despertar**, o personagem **não usa** as skills despertadas. Em faixas altas (ex.: platina, nível 100) vale pleno.
- **Razão:** liberar tudo desde o início faz o jogador novo não entender o jogo nem por que perde, e sair. As faixas
  baixas ensinam o jogo por camadas e as altas liberam o resto.

## 5. Pendências

Fechadas em D96 (seção 6) e implementadas em D151 (seção 7): catálogo `Awakening` no admin, 11 tipos de missão e 4
despertares no seed. Resta o ajuste fino por simulação, o despertar no ranqueado (faixas, quando o PvP entrar) e
despertares para as outras variantes (conteúdo do admin).

## 6. Valores (D96)

**[PLACEHOLDER aprovado]**, ajustar com simulação.

### 6.1 Skills do despertar

- **Poder ×1,25** sobre o mesmo tipo base e **Desgaste ×1,5** (D52). Ex.: Forte 1,6 / 5% vira 2,0 / 7,5%; Final
  2,0 / 8% vira 2,5 / 12%. Teto de Poder 2,5.
- **5 skills por despertar**, com nível mínimo **80, 85, 90, 95, 100**.
- Nos blocos de 3 ofertas desses níveis, **pelo menos 1 é do despertar** enquanto restarem skills dele.
- Ranqueado: a skill despertada só vale em faixa com nível **igual ou maior que o mínimo dela**.
- **Desconto na variante base (aprovado: só com 1 despertada equipada; ajustar por simulação):** o despertado paga **×0,75** de Desgaste nas
  skills não despertadas ("o corpo suporta melhor a variante normal"). Vale **só se houver pelo menos uma skill
  despertada equipada** (e liberada na faixa), para não ser vantagem gratuita. Teste: build equivalente gasta 18,4%
  contra 16,5% por 5 ações, com ~8% a mais de Poder médio (proporcional).

### 6.2 Missões ocultas

**3 missões por personagem** (1 cumprida = Sinais, 2 = Iminente, 3 = desperta). Contam a partir do nível 80.

| Tipo | Exemplo | Limiar |
|---|---|---|
| Acumulativa | Abater inimigos, ou acertar um tipo de skill | ~100 eventos (≈200 batalhas) |
| Condição repetida | Em 15 batalhas, fazer ≥40% do dano da squad (ou ≥35% da cura, ou ser o último vivo numa vitória) | 15 batalhas |
| Marco único | Numa batalha: vencer com 1 vivo, ou causar ≥60% do HP total inimigo | 1 vez |

- **Variação:** cada despertar tem um pool de ~8 modelos de missão (admin); o sistema sorteia 3 por personagem (um de
  cada tipo), pela seed do personagem.
- **Sangue puro:** −30% nos limiares (100 vira 70, 15 vira 10).
- **Duração esperada:** ~150 a 250 batalhas depois do nível 80.
- **Anti-farm:** amistosa não conta (D54); PvE só a partir da dificuldade **Intermediário**, contra NPC diferente das
  últimas 5 batalhas; PvP conta no máximo **3 batalhas por dia contra o mesmo oponente**.

### 6.3 Sorteio, dica e despertar novo

- **Fator da afinidade: 0,75** (era 0,5). Peso = `1 + 0,75 × a`; o mais compatível tem até 1,75x a chance (2
  despertares: ~64% / 36%). Nenhum fica com chance zero.
- **Dica:** mantida (Sinais com 1 missão, Iminente com 2).
- **Despertar novo:** se o admin criar um despertar para uma variante, personagens elegíveis acima do nível 80
  entram no sorteio.

## 7. Na prática (D151)

Como a regra virou código. **[PLACEHOLDER aprovado]** nos números.

### 7.1 Catálogo (admin)

Cada **despertar** (`Awakening`) é uma linha do catálogo ligada a uma **variante despertada** (a que tem
`awakensFromId`). Guarda:

- **Perfil:** 2 a 3 requisitos `{ stat, HIGH | LOW }`, sem repetir stat, no máximo 2 altos e 2 baixos.
- **Pool de missões:** lista de `{ tipo, limiar }`, sem repetir tipo, com **ao menos uma de cada categoria**.

**Alto e baixo:** cada stat final do personagem (nível, pontos livres e traços) é dividido pela **média daquele stat
nos perfis das 8 classes** (`classes_brief.md` 2). Alto = entre os 2 maiores; baixo = entre os 2 menores. Empate
segue a ordem dos stats (HP, Ataque, Defesa, Velocidade, Precisão, Esquiva, Vontade).

### 7.2 Tipos de missão

Fixos no código (cada um precisa ser medido nos eventos da batalha); o admin escolhe quais entram no pool e o limiar.

| Categoria | Tipo | O que conta | Limiar padrão |
|---|---|---|---|
| Acumulativa | `KILLS` | inimigos abatidos (o último golpe é dele) | 100 |
| | `STATUS_APPLIED` | status aplicados num inimigo que pegaram | 100 |
| | `HEAVY_HITS` | usos de skill Forte ou Final que causaram dano num inimigo | 100 |
| | `SUPPORT_ACTIONS` | curas e escudos em aliados (cada alvo conta) | 100 |
| Condição repetida | `DAMAGE_SHARE` | batalhas com ≥40% do dano da squad | 15 |
| | `SUPPORT_SHARE` | batalhas com ≥35% da cura e escudo da squad | 15 |
| | `LAST_ALIVE_WIN` | vitórias em que ele é o último vivo | 15 |
| | `MULTI_KILL` | batalhas com ≥2 abates | 15 |
| Marco único | `SOLE_SURVIVOR_WIN` | vencer sendo o único vivo | 1 |
| | `ENEMY_HP_SHARE` | causar ≥60% do HP total inimigo numa batalha | 1 |
| | `TRIPLE_KILL` | abater 3 numa batalha | 1 |

### 7.3 Fluxo

1. **Sorteio:** no fim da primeira batalha em que o personagem (1 variante, sem despertar) já está no nível 80 ou mais
   e a variante dele tem despertar. Peso `1 + 0,75 × afinidade`. Sorteia também **3 missões, uma de cada categoria**
   do pool, e guarda uma cópia (mudar o pool depois não afeta quem já sorteou). Sangue puro: limiar ×0,7, para baixo,
   mínimo 1.
2. **Missões:** contam a partir da batalha seguinte. No PvE, só a partir do **Intermediário** e contra squad de NPC
   **fora das últimas 5 batalhas** da conta. Desistência não conta.
3. **Dica:** 0 cumpridas = Silêncio, 1 = Sinais, 2 = Iminente. O jogador nunca vê o despertar nem as missões.
4. **Despertar:** com as 3 cumpridas, o personagem desperta no fim da batalha (o resultado avisa) e abre **blocos de
   recuperação**, um para cada nível de despertada já atingido (80, 85, ..., até o nível atual), cada um com **ao
   menos 1 skill despertada**. Sem despertada sobrando para aquele nível, o bloco não abre. Os blocos normais de 80 a
   100 também garantem 1 despertada enquanto restarem.

### 7.4 Conteúdo do seed

| Variante base | Despertar | Perfil | Personagem |
|---|---|---|---|
| Sombra | Sombra Abissal | Ataque alto, Velocidade alta, Defesa baixa | Nox |
| Sombra | Eclipse | Precisão alta, Vontade alta | Nox |
| Terra | Cristal | Vontade alta, HP alto, Ataque baixo | Gaia |
| Combustão | Plasma | Ataque alto, Precisão alta, Esquiva baixa | Oren Ignara |

5 skills por despertar, nos níveis 80, 85, 90, 95 e 100, com Poder ×1,25 e Desgaste ×1,5 sobre a referência do tipo e
da forma (`skillReference` com `isAwakened`). Lista em `prisma/seed/content/awakenings.ts`.
