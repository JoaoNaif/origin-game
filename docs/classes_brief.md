# ORIGIN — Classes (brief)

> Especializações de combate do personagem e o modelo de distribuição de stats por teto. Decisões em `game_design.md`
> (D69, D70). Stats e fórmulas em [`character_brief.md`](./character_brief.md) 2 e 3.
> **[ENRAIZADO]** = decidido · **[PLACEHOLDER]** = número provisório · **[ABERTO]** = a decidir.

---

## 1. Princípios [ENRAIZADO]

- Origin é um contexto de **guerra** (não de RPG de fantasia): as classes são **funções militares**, com os poderes
  como diferencial.
- A classe é um **perfil de stats** (quanto bate, quanto aguenta, quão rápido). **Não define alcance nem área**:
  isso é propriedade de cada **skill** (D21 a D23, D36).
- Nenhuma classe é melhor que outra: todas têm o **mesmo orçamento de poder** (~670 no nível 100, contando HP/5).
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
| **Velocidade** | 70 | 95 | **125** | 95 | 110 | 60 | 65 | **120** |
| **Precisão** | 85 | **125** | 105 | 110 | 85 | 110 | 70 | 100 |
| **Esquiva** | 55 | 90 | **110** | 75 | 95 | 70 | 50 | 90 |
| **Vontade** | 100 | 85 | 55 | **125** | **130** | 90 | **120** | 115 |

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
- **Orçamento fixo** de pontos livres por nível (~15% do total [PLACEHOLDER]). Os tetos barram a especialização
  cruzada.
- Teto sugerido **[PLACEHOLDER]**: stats-pico = base ×1,25; demais = base ×1,10.
- **Redistribuição grátis fora da batalha**. No ranqueado todos têm o mesmo orçamento (D63).
- Variações dentro da classe nascem da distribuição: o **Guardião** é uma Vanguarda com tudo em Defesa e
  Vontade; o **Bruto** reforça o Ataque.

## 4. Referência: dano de um golpe `Poder 1,0` no nível 100 (% do HP do alvo)

Com a fórmula D68, para as 5 classes do protótipo:

| Atacando ↓ / Alvo → | Vanguarda | Atirador | Executor | Controlador | Suporte |
|---|---|---|---|---|---|
| **Vanguarda** | 6,5% | 14,9% | 16,1% | 10,4% | 11,1% |
| **Atirador** | 9,1% | 20,1% | 21,7% | 14,3% | 15,2% |
| **Executor** | 10,8% | 23,3% | 25,1% | 16,8% | 17,8% |
| **Controlador** | 4,6% | 10,9% | 11,9% | 7,5% | 8,0% |
| **Suporte** | 3,7% | 9,0% | 9,8% | 6,1% | 6,5% |

Leitura: a Vanguarda tira ~15% de um backline (não é insignificante) e quase não morre; os especialistas em
dano são frágeis entre si (20 a 25%).

## 5. Pendências

1. Valores finais das 8 classes (a tabela acima é proposta) e o ajuste do orçamento da Artilharia.
2. Tetos por stat de cada classe (placeholder ×1,25 / ×1,10) e o orçamento de pontos livres por nível.
3. Em quais níveis há pontos livres (character_brief 3).
4. Habilidades de assinatura de Guardião (interceptar) e Tático (reposicionar aliados), na conversa de skills.
5. Tabela de dano para Artilharia, Guardião e Tático (depende de Poder das skills de área).
