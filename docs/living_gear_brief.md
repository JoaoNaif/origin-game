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
- **Um único slot de equipamento vivo por personagem, por ora:** ou arma **ou** armadura. Um segundo slot fica
  para depois **[ABERTO]**.
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
- **Todos os requisitos cumpridos = pleno.** **Maioria = parcial.** Menos que isso = sem elo.
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

1. Valores: poder por grau, elo parcial e sem elo, custo do elo pleno (dependem de A8).
2. Lista de requisitos possíveis e quantos por grau.
3. Efeitos leves por variante (catálogo de passivas).
4. Segundo slot (arma **e** armadura)?
5. Divino: custo e como se obtém.
6. Mercado e modelo de progressão (A6).
7. Companheiro/contrato **não** entra aqui (conversa 1.3).
8. Cada equipamento tem uma **lista de títulos que ajudam o elo** (D81): cada título da lista **vale por um
   requisito cumprido** (4.1). Falta o teto de substituições [PLACEHOLDER: 1] e as listas.
