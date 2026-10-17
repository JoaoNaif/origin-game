# ORIGIN — Armas e armaduras vivas (brief)

> Regras do equipamento vivo no jogo, decididas na conversa própria. Decisões resumidas em `game_design.md` (D62, D63).
> Lore em [`world_build.md`](./world_build.md) 3.7. Personagem em [`character_brief.md`](./character_brief.md).
> **[ENRAIZADO]** = decidido · **[PLACEHOLDER]** = número provisório · **[ABERTO]** = a decidir.

---

## 1. O que é

Minério ou material **vivo**: resíduo de Éon que se vinculou a uma variante e consegue usar o poder dela. A arma
(ou armadura) **escolhe o portador**: o que importa é a compatibilidade (o **elo**) entre o portador e o equipamento,
não só a força dele. Serve para **potencializar** (variante afim) ou **compensar fraqueza** (defesa, mobilidade).

## 2. Como funciona no jogo [ENRAIZADO]

- É uma **passiva**, não uma skill. **Não ocupa** os 4 slots de skill (D43).
- **Um único slot de equipamento vivo por personagem, por ora:** ou arma **ou** armadura. Sem 2º slot (D94).
  Ver 9.1.
- Arma e armadura usam o **mesmo sistema** (grau, elo, custo).
- O efeito é um **bônus moderado** de stats mais um **efeito leve** da variante do equipamento (ex.: fogo =
  chance de queimar). O tamanho depende do **grau**.
- Pode ser usada por quem não tem variante (compensa a falta) e por quem tem (potencializa).
- Equipamento **não conta como variante do personagem** (D41): não dá skills novas, só a passiva.

## 3. Grau [ENRAIZADO a estrutura]

O grau vem de **dois fatores**: a **variante** que habita o equipamento e a **afinidade** do material com ela
(quanto do poder da variante o material consegue usar, ex.: 95% x 50%).

| Grau | Poder usado | Raridade |
|---|---|---|
| **Escudeiro** | 1–30% | Comum |
| **Cavaleiro** | 31–60% | Incomum |
| **Mestre** | 61–85% | Rara |
| **Rei** | 86–100% | Muito rara |
| **Divino** | 101%+ | Quase inexistente (só por evento único, fora dos baús) |

## 4. Elo [ENRAIZADO]

O elo é a compatibilidade entre o portador e o equipamento. Três estados:

| Elo | Poder do grau | Custo |
|---|---|---|
| **Pleno** | 100% | custo normal (seção 5) |
| **Parcial** | menor que pleno, maior que sem elo [PLACEHOLDER ~60%] | menor que sem elo, com **risco que cresce a cada turno** |
| **Sem elo** | bem menor [PLACEHOLDER ~30%] | pior, proporcional ao grau |

**Regra de balanço:** sem elo nunca compensa. Um Rei sem elo rende **menos** que um Cavaleiro com elo, e com custo
pior. Forçar é sempre uma má troca (alguém desesperado pode tentar).

### 4.1 Como se define o elo (requisitos por stats)

Cada equipamento tem **2 a 4 requisitos** de perfil de stats, no formato "stat alto" ou "stat baixo". Exemplo:
**Vontade alta, Esquiva baixa, HP alto**.

- **Alto e baixo são relativos ao próprio personagem:** alto = entre os 2 maiores dos 7 stats; baixo = entre os 2
  menores. Independe do nível e dos números da fórmula (A8).
- **Todos os requisitos cumpridos = pleno.** **Metade ou mais (não todos) = parcial** (D94). Menos que isso = sem elo.
- **Grau mais alto exige mais requisitos** (compatível é mais raro, como na lore).
- O elo é avaliado **ao montar a build** e fica **fixo na batalha** (Desgaste não muda o elo).
- Como os pontos livres se redistribuem fora da batalha (D48), buscar o elo é **decisão de build**; o requisito
  "stat baixo" é o custo real.
- **Não é matriz entre linhagens** (D16): depende do perfil de stats, não da variante do portador.

## 5. Custo [ENRAIZADO o princípio]

Segue D52 (mais poder, mais custo) e D32 (efeitos valem só na batalha). **O dano permanente da lore não entra.**

- **Elo pleno:** o **custo da linhagem do equipamento** (D59), em valor pequeno e fixo. Ex.: material Material =
  -Defesa leve **[PLACEHOLDER]**.
- **Parcial e sem elo:** penalidades **só dentro da batalha**: queda de stats e, nos graus altos, **chance de perder a
  ação**, subindo a cada turno e zerando na batalha seguinte. Determinístico via seed (D8).

| Grau | Efeito sem elo (traduzido da lore) |
|---|---|
| **Escudeiro** | queda leve de stats (dor, cansaço) |
| **Cavaleiro** | queda maior; o equipamento "puxa" o portador (perde precisão/esquiva) |
| **Mestre** | queda grande; lapsos em que **age sozinho** (chance de perder o turno) |
| **Rei** | o equipamento **domina**: chance alta de perder a ação, crescendo por turno |
| **Divino** | extremo; ainda sem resposta fechada **[ABERTO]** |

## 6. Obtenção e mercado

- **Eventos** e **baús** aleatórios ganhos **após partida**.
- **Baús específicos** e **recompensas de ranking** (topo do ranqueado) para os equipamentos melhores.
- A **sorte** faz parte: um jogador mais fraco pode conseguir um item forte.
- **Mercado (futuro):** para alguns jogadores, vender o item vale mais que usá-lo. Depende do modelo de progressão
  (A6); não bloqueia o protótipo.
- O inventário mora na **conta** (A6); o elo é por personagem.

## 7. No ranqueado

Equipamento **vale no ranqueado e o grau influencia** (sem teto), como o DOM: não se pune quem tem. A paridade vem
das **faixas** do ranqueado (D63), onde nível, DOM e equipamento escalam juntos.

## 8. Pendências

Fechadas em D94 (seção 9). Resta só o **ajuste fino por simulação** e o conteúdo do admin (catálogo de equipamentos,
requisitos e listas de títulos de cada um).

## 9. Valores (D94)

**[PLACEHOLDER aprovado]**, ajustar com simulação.

### 9.1 Slot e títulos

- **Um slot só: arma ou armadura**, sem 2º slot.
- Os **títulos são individuais de cada equipamento** (lista de 2 a 5 por equipamento, conteúdo do admin). O título é o
  que adapta o equipamento ao personagem (ex.: um tank com "Escudeiro dos Céus" usa a armadura que o pede).
- Cada título da lista vale **por um requisito cumprido**, com **teto de 1 substituição** (D81). No Rei (4
  requisitos), um título sozinho leva ao parcial; para o pleno precisa de 3 requisitos reais mais o título.

### 9.2 Bônus de stats e custo (elo pleno)

Dois stats por equipamento (principal e secundário, escolhidos pelo admin). O admin ajusta ±15% dentro do grau.

| Grau | Principal | Secundário | Em pontos | Custo do elo pleno (Desgaste no stat da linhagem) |
|---|---|---|---|---|
| Escudeiro | +3% | +2% | 5 | 1,5% |
| Cavaleiro | +5% | +3% | 8 | 2,5% |
| Mestre | +8% | +5% | 13 | 3,5% |
| Rei | +12% | +8% | 20 | 5% |
| Divino | +16% | +11% | 27 | 7% |

O custo entra no piso de Desgaste (80%, D91).

### 9.3 Elo parcial e sem elo

Efeito do equipamento (bônus e passiva): **pleno 100%, parcial 60%, sem elo 30%**. Penalidades só dentro da batalha.

| Grau | Sem elo: queda de stats | Sem elo: perder a ação (início, +por turno, máx.) | Parcial |
|---|---|---|---|
| Escudeiro | Velocidade e Esquiva −3% | nenhuma | −0,75%, sem perda de ação |
| Cavaleiro | Precisão e Esquiva −8% | nenhuma | −2%, sem perda de ação |
| Mestre | todos −6% | 3%, +3%, 25% | todos −1%; 1%, +1%, 8% |
| Rei | todos −9% | 6%, +5%, 45% | todos −1,5%; 2%, +2%, 15% |
| Divino | todos −12% | 10%, +8%, 60% | todos −2%; 3%, +3%, 20% |

- **Regra de balanço:** Rei sem elo rende menos que Cavaleiro com elo, e com penalidades pesadas.
- **Parcial vale a pena nos graus baixos.** Do Mestre para cima fica neutro a negativo (só o pleno compensa).
  Intencional; validar em simulação.

### 9.4 Requisitos

- **Quantos por grau:** Escudeiro 2 · Cavaleiro 2 · Mestre 3 · Rei 4 · Divino 4.
- **Tipos:** "stat alto" (entre os 2 maiores) ou "stat baixo" (entre os 2 menores), em qualquer dos 7 stats; nunca o
  mesmo stat nos dois sentidos. Do Mestre para cima, **pelo menos 1 requisito "baixo"**.
- **Parcial = cumprir metade ou mais, mas não todos** (1 de 2, 2 de 3, 2 de 4). Substitui o "maioria" de 4.1.

### 9.5 Passivas por linhagem (valor no grau Rei)

Multiplicador por grau: Escudeiro ×0,4 · Cavaleiro ×0,6 · Mestre ×0,8 · Rei ×1,0 · Divino ×1,25.

| Linhagem | Efeito leve (Rei) |
|---|---|
| Elemental | 15% de chance de aplicar Dano contínuo ao causar dano |
| Material | −10% do dano recebido de golpes de alvo único |
| Vetorial | Ignora 10% da Defesa do alvo |
| Psíquica | +15% de Vontade contra aplicação de status |
| Biológica | Regenera 2% do HP máximo por turno |
| Fundamental | Escudo inicial de 5% do HP máximo |

### 9.6 Divino

Valores nas tabelas acima. Só por **evento único** (chefes guardados pela IA de nível alto), fora dos baús.
**Vinculado à conta e não vendável** (senão a venda quebra a economia).

### 9.7 Sem variante

Personagem sem variante recebe o **bônus de stats do equipamento ×1,25**. A regra de elo não muda.
