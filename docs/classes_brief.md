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
- Nenhuma classe é melhor que outra: todas têm o **mesmo orçamento de poder** (~670 no nível 100, contando HP/5; D91 ajustou Velocidade, Precisão, Esquiva e Vontade).
  Artilharia (~640) é um pouco menor porque a área compensa (D36).
- As classes **variam por personagem**: o admin ajusta os stats de cada personagem dentro da classe (ex.: um
  atacante que defende mais e dá menos dano).

## 2. As 8 classes [ENRAIZADO a lista; valores PLACEHOLDER]

Perfil padrão no **nível 100** (já com pontos livres na distribuição inicial):

| Stat | Vanguarda | Atirador | Executor | Controlador | Suporte | Artilharia | Guardião | Tático |
|---|---|---|---|---|---|---|---|---|
| **HP** | 700 | 420 | 400 | 520 | 500 | 500 | 780 | 480 |
| **Ataque** | 100 | 125 | **140** | 80 | 70 | **140** | 60 | 75 |
| **Defesa** | **120** | 60 | 55 | 85 | 80 | 70 | **140** | 75 |
| **Velocidade** | 75 | 95 | **115** | 90 | 105 | 65 | 70 | **110** |
| **Precisão** | 85 | **125** | 110 | 115 | 85 | 110 | 70 | 105 |
| **Esquiva** | 55 | 90 | **115** | 75 | 100 | 65 | 50 | 90 |
| **Vontade** | 95 | 85 | 55 | **125** | **130** | 90 | **115** | 120 |

| Classe | Função de guerra | No jogo |
|---|---|---|
| **Vanguarda** | Infantaria | Aguenta e bate de verdade; segura a primeira célula |
| **Atirador** | Fogo de precisão | Precisão e Ataque altos, frágil; atinge de trás |
| **Executor** | Operações especiais | O mais rápido e o que mais bate, o mais frágil; reposicionamento e infiltração |
| **Controlador** | Negação de área | Vontade e Precisão para aplicar e manter status; bate pouco |
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

Fórmula D68, 8 classes, stats da seção 2 (D91). Média das 64 combinações: **11,0%** (~9,8% com ~89% de acerto).

| Atacando ↓ / Alvo → | Vang. | Atir. | Exec. | Contr. | Supo. | Artil. | Guard. | Tát. |
|---|---|---|---|---|---|---|---|---|
| **Vanguarda** | 6,5 | 14,9 | 16,1 | 10,4 | 11,1 | 11,8 | 5,3 | 11,9 |
| **Atirador** | 9,1 | 20,1 | 21,7 | 14,3 | 15,2 | 16,0 | 7,6 | 16,3 |
| **Executor** | 10,8 | 23,3 | 25,1 | 16,8 | 17,8 | 18,7 | 9,0 | 19,0 |
| **Controlador** | 4,6 | 10,9 | 11,9 | 7,5 | 8,0 | 8,5 | 3,7 | 8,6 |
| **Suporte** | 3,7 | 9,0 | 9,8 | 6,1 | 6,5 | 7,0 | 3,0 | 7,0 |
| **Artilharia** | 10,8 | 23,3 | 25,1 | 16,8 | 17,8 | 18,7 | 9,0 | 19,0 |
| **Guardião** | 2,9 | 7,1 | 7,8 | 4,8 | 5,1 | 5,5 | 2,3 | 5,6 |
| **Tático** | 4,1 | 9,9 | 10,8 | 6,8 | 7,3 | 7,8 | 3,4 | 7,8 |

Leitura: a Vanguarda tira ~15% de um backline e quase não morre; os especialistas em dano são frágeis entre si
(20 a 25%). Executor e Artilharia têm o mesmo Ataque (140): a Artilharia compensa com Velocidade menor e Poder
menor por alvo (área). Vigiar na hora das skills.

## 5. Pendências

1. Poder das skills de área (Artilharia) e das skills de assinatura de Guardião e Tático (conversa de skills).
2. Habilidades de assinatura de Guardião (interceptar) e Tático (reposicionar aliados).
3. Ajuste fino por personagem (admin) e por dados de uso, depois de simular batalhas.
