# ORIGIN — Classes (brief)

> Especializações de combate do personagem e o modelo de distribuição de stats por teto. Decisões em `game_design.md`
> (D69, D70). Stats e fórmulas em [`character_brief.md`](./character_brief.md) 2 e 3.
> **[ENRAIZADO]** = decidido · **[PLACEHOLDER]** = número provisório · **[ABERTO]** = a decidir.
> **Valores do nível 100 fechados em D91.**

---

## 1. Princípios [ENRAIZADO]

- Origin é um contexto de **guerra** (não de RPG de fantasia): as classes são **funções militares**, com os poderes
  como diferencial.
- A classe é um **perfil de stats** (quanto bate, quanto aguenta, quão rápido). **Não define alcance nem área**:
  isso é propriedade de cada **skill** (D21 a D23, D36).
- Nenhuma classe é melhor que outra: o **orçamento de poder** (nível 100, contando HP/5) é ajustado por classe, pela simulação, para compensar o quanto cada ponto rende (D122, D142).
- As classes **variam por personagem**: o admin ajusta os stats de cada personagem dentro da classe (ex.: um
  atacante que defende mais e dá menos dano).

## 2. As 8 classes [ENRAIZADO a lista; valores PLACEHOLDER]

Perfil padrão no **nível 100** (já com pontos livres na distribuição inicial). **Orçamento por classe (D122, D142, D144):** Executor
595, Artilharia 615, Atirador 634, Suporte 680, Vanguarda 695, Guardião 696, Tático 706, Controlador 710 (a simulação mostrou que
os pontos das classes só de ataque rendem mais e os das demais, menos):

| Stat | Vanguarda | Atirador | Executor | Controlador | Suporte | Artilharia | Guardião | Tático |
|---|---|---|---|---|---|---|---|---|
| **HP** | 700 | 420 | 400 | **650** | 500 | 500 | 780 | **630** |
| **Ataque** | 105 | 105 | **115** | 105 | 80 | **115** | 70 | **105** |
| **Defesa** | **120** | 60 | 55 | 85 | 80 | 70 | **140** | 75 |
| **Velocidade** | 80 | 85 | **100** | 90 | 105 | 65 | 80 | **110** |
| **Precisão** | 100 | **125** | **105** | 115 | 85 | 110 | 85 | 105 |
| **Esquiva** | 55 | 90 | **85** | 75 | 100 | 65 | 50 | 90 |
| **Vontade** | 95 | 85 | 55 | **110** | **130** | 90 | **115** | **95** |

| Classe | Função de guerra | No jogo |
|---|---|---|
| **Vanguarda** | Infantaria | Aguenta e bate de verdade; segura a primeira célula |
| **Atirador** | Fogo de precisão | Precisão alta, frágil; atinge de trás |
| **Executor** | Operações especiais | Rápido e de golpe forte, o mais frágil; reposicionamento e infiltração |
| **Controlador** | Negação de área | Vontade e Precisão para aplicar e manter status |
| **Suporte** | Médico de combate | Cura, escudo e buffs de sustentação; Vontade e Velocidade altas |
| **Artilharia** | Cerco, fogo pesado | Dano em **área** (linha, coluna, grade), lento, caro; compensa o orçamento menor |
| **Guardião** | Escolta, muralha | **Intercepta** golpes, cobre aliados, absorve dano por eles; bate pouco |
| **Tático** | Comando, estratégia | **Manipula formação e fila**: reposiciona aliados, adianta a vez, buffs de squad |

**Fora por ora:** Reconhecimento (vira skill/variação de Controlador ou Executor) e Soldado/versátil.

**Protótipo (D5):** só as 5 primeiras classes. As 3 últimas entram no roster final.

## 3. Distribuição por teto (estilo NBA 2K) [ENRAIZADO]

Substitui a regra antiga de "3 aptidões" (D48, D51):

- Cada classe tem um **teto por stat**, nos 7 stats.
- O jogador distribui os **pontos livres** em **qualquer stat**, **até o teto**.
- Stats que definem a classe têm **teto alto**. Os demais têm **teto baixo**, para ninguém "fazer tudo".
- **Orçamento fixo** de pontos livres: 15% do total (10 concessões de 1,5% do orçamento, ~10 pontos cada, D91). Os tetos barram a especialização
  cruzada.
- **Teto (D91):** pico da classe = ×1,25 em HP, Defesa, Precisão, Esquiva e Vontade, mas **×1,15 em Ataque e Velocidade** (Ataque vale ao quadrado, Velocidade multiplica ações); demais stats = ×1,10.
- **Redistribuição grátis fora da batalha**. No ranqueado todos têm o mesmo orçamento (D63).
- Variações dentro da classe nascem da distribuição: o **Guardião** é uma Vanguarda com tudo em Defesa e
  Vontade; o **Bruto** reforça o Ataque.

## 4. Referência: dano de um golpe `Poder 1,0` no nível 100 (% do HP do alvo)

Fórmula D68, 8 classes, stats da seção 2 (D144), sem a escala de nível. Média das 64 combinações: **10,4%** (~9,5% com ~91% de acerto).

| Atacando ↓ / Alvo → | Vang. | Atir. | Exec. | Contr. | Supo. | Artil. | Guard. | Tát. |
|---|---|---|---|---|---|---|---|---|
| **Vanguarda** | 7,0 | 15,9 | 17,2 | 8,9 | 11,9 | 12,6 | 5,8 | 9,7 |
| **Atirador** | 7,0 | 15,9 | 17,2 | 8,9 | 11,9 | 12,6 | 5,8 | 9,7 |
| **Executor** | 8,0 | 18,0 | 19,4 | 10,2 | 13,6 | 14,3 | 6,6 | 11,0 |
| **Controlador** | 7,0 | 15,9 | 17,2 | 8,9 | 11,9 | 12,6 | 5,8 | 9,7 |
| **Suporte** | 4,6 | 10,9 | 11,9 | 6,0 | 8,0 | 8,5 | 3,7 | 6,6 |
| **Artilharia** | 8,0 | 18,0 | 19,4 | 10,2 | 13,6 | 14,3 | 6,6 | 11,0 |
| **Guardião** | 3,7 | 9,0 | 9,8 | 4,9 | 6,5 | 7,0 | 3,0 | 5,4 |
| **Tático** | 7,0 | 15,9 | 17,2 | 8,9 | 11,9 | 12,6 | 5,8 | 9,7 |

Leitura: a Vanguarda tira ~15% de um backline e quase não morre; os especialistas em dano são frágeis entre si
(16 a 19%). Executor e Artilharia têm o maior Ataque (115): a Artilharia compensa com Velocidade menor e Poder menor por
alvo (área).
Vigiar na hora das skills.

## 5. Pendências

1. Poder das skills de área (Artilharia) e das skills de assinatura de Guardião e Tático (conversa de skills).
2. Habilidades de assinatura de Guardião (interceptar) e Tático (reposicionar aliados).
3. Ajuste fino por personagem (admin) e por dados de uso, depois de simular batalhas.
