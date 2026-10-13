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

### 1.2 Curva de nível [ENRAIZADO]

- Níveis de **0 a 100**. Início rápido (ensina o jogo), **últimos níveis muito difíceis**, para o personagem não
  estagnar nem a progressão ficar sem graça depois de um tempo.
- Valores da curva [PLACEHOLDER].

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

**Implicação para o admin:** cada variante precisa de um **pool grande** (algumas dezenas de skills), com skills de
vários níveis mínimos, para que as ofertas sejam variadas.

### 1.4 Pontos livres [ENRAIZADO]

- **A cada 10 níveis** (10, 20, ..., 100): 10 concessões, todas do mesmo tamanho [PLACEHOLDER ~1,5% do stat base].
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
- **Randoms** (ex.: Yuki Glassier, uma Glassier com poder de gelo) são modelos com **muitas instâncias**; as passivas
  deles vêm do pool da família/variante/classe.

**Raridade [ENRAIZADO]:** em vez de "comum, raro, épico" (muito batido), usar a
**Classificação de perigo da Sombra** (`world_build.md` 6), que a lore já tem e é aplicada só a guerreiros:
**Discreto, Contínuo, Diferenciável, Não-Linear, Caótico** (5 níveis). Na lore só 2 indivíduos da geração do Ecko
chegaram a Caótico, o que casa com "Ecko é raro". Raridade **não** dá mais poder (orçamento igual, D69).

**Obtenção [ENRAIZADO a lista, detalhes ABERTOS]:** por **várias formas**: **história, eventos, baús, premiações
(ranking) e eventos únicos**. Cada personagem tem seu caminho; os mais raros tendem a vir de eventos e premiações.

Tópicos a discutir **na parte 2** (marcados como **pendentes**; o usuário parou aqui):

1. Distribuir os personagens na **classificação de raridade** (fechada); peso de cada caminho de obtenção.
2. Regras da **passiva**: quantas por personagem (hoje 1), catálogo de gatilhos e efeitos que o motor aceita, e como
   evitar passiva dominante sem custo (contra-jogo, dados de uso).
3. Inventário, economia, mercado, baús e pity, aprimoramento de skill, modelo de negócio.

### 2.3 Pendências da parte 2 [PENDENTE, retomar depois]

**Personagens (fechado até aqui):** sem único, raridade, passiva por personagem (D78), obtenção por várias formas.

**Ainda pendente (o usuário deixou para depois):**

1. **Mercado** (compra e venda entre jogadores, o que pode ser negociado).
2. **Inventário** (armas, armaduras, bestas, títulos: onde moram, limites).
3. **Economia** (existe moeda? origem e destino).
4. **Baús** (tipos, gatilhos pós-partida, tabela de sorte, **pity**, recompensas de ranking).
5. **Aprimoramento de skill** (títulos aumentam a chance de aprimorar, seção 3 do `game_design.md`).
6. **Modelo de negócio.**
7. Detalhe dos caminhos de obtenção de personagens (peso de cada um) e o que é exclusividade.
8. Distribuir os personagens da lore nos 5 níveis de raridade (Discreto a Caótico).
