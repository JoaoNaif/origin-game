# ORIGIN — PvP e modos de jogo (brief)

> Estrutura do PvP, decidida na conversa própria. Decisões resumidas em `game_design.md` (D74, D75).
> Regras de combate em [`skills_brief.md`](./skills_brief.md) e [`character_brief.md`](./character_brief.md).
> **[ENRAIZADO]** = decidido · **[PLACEHOLDER]** = número provisório · **[ABERTO]** = a decidir.

---

## 0. Escopo do MVP [ENRAIZADO]

- O **foco inicial é a lógica**: o **MVP é só contra a máquina (PvE)**.
- O **PvP entra depois**, quando a lógica estiver validada (batalhas boas, nada quebrando).
- Tudo abaixo descreve o alvo do PvP, mas **não é escopo do MVP**.
- Consequência: o MVP precisa de uma **IA da máquina** (como o adversário escolhe ações), determinística pela seed
  (D8). Ver pendências.

## 1. Formato ao vivo [ENRAIZADO]

- **Jogador contra jogador, ao vivo**, no estilo de Monster Legends: chega o turno de um personagem, o dono escolhe a
  ação; a fila (D10, D30) passa para o próximo personagem, de quem for, e assim por diante.
- **Servidor é a autoridade** (D9); a seed fica só no servidor (D33).

## 2. Relógio e abandono [ENRAIZADO]

| Regra | Valor |
|---|---|
| Tempo por turno | **20 segundos** |
| Estourou o tempo sem ação | **Defender automático** (D38) e o turno passa |
| 3 turnos seguidos sem agir | **Abandono**: **W.O.** para quem abandonou |
| Punição do W.O. | **Perde os pontos** da partida. Sem suspensão |
| 4 W.O. seguidos | **1 hora** sem poder entrar em partida |

- Desconexão cai na mesma regra (turnos perdidos). Janela de reconexão **[ABERTO]**.

## 3. Pré-batalha e informação [ENRAIZADO]

1. O jogador **chama para jogar** e o sistema **acha a partida**.
2. A primeira coisa exibida é o **campo de batalha** (D28), para planejar em cima dele.
3. Aparece um **top 3 dos personagens que o adversário mais usa**, para permitir contramedida e **incentivar o
   adversário a não ficar na mesmice**.
4. Cada jogador **escolhe seus 4 personagens e a formação**, **sem ver** a do outro.
5. A formação do rival só é **revelada quando a batalha começa** (revelação simultânea).
6. **Sem pick e ban** (por ora).

**Informação:** o adversário vê **classe, nível e traços**, mas **não vê as 4 skills** de cada personagem. O "dominar
skills" fica como vantagem de quem conhece o personagem.

## 4. Modos [ENRAIZADO]

| Modo | Nivelamento | XP/histórico | Ranking |
|---|---|---|---|
| **Ranqueado** | Por **faixa** (D63) | Conta | Sim |
| **Casual** | Nível real | Conta | Não |
| **Amistosa** (contra amigo) | Nível real | **Não** conta (D54) | Não |
| **PvE** (contra a máquina) | Nível real | Conta (D54) | Não |

## 5. Matchmaking e ranking [ENRAIZADO o princípio]

- **Ranqueado:** por **pontos dentro da faixa**. **Casual:** por **nível médio da squad**.
- **Pontos** por vitória e derrota (tipo Elo), **faixas** (prata, ouro, platina...), **temporada** com reinício
  parcial. Faixas e valores [PLACEHOLDER].
- **Recompensas:** equipamento vivo de grau alto e **títulos** por temporada (liga com `living_gear_brief.md` 6).

## 6. Fim da partida e justiça [ENRAIZADO]

- **Fim forçado** na rodada 30 por % de HP total (D72). **Empate:** menor Desgaste acumulado; depois sorteio pela seed.
- **Anti-abuso:** amistosa não conta; ranqueado exige **histórico mínimo**; revelar a seed no fim (commit-reveal).
- **Replay:** sim. O motor é determinístico, então o replay é quase gratuito. Espectador **depois**.

## 7. Pendências

1. ~~**IA da máquina** (MVP)~~ **modelo fechado** (D90, seção 8). Só restam valores, ver 8.2.
2. Janela de reconexão e tratamento de falha de rede.
3. Faixas e histórico mínimo fechados em D99 (seção 9). Restam pontos do Elo, limites de pontos e temporada.
4. Detalhes do top 3 (janela de tempo, o que conta como "mais usado").
5. Fila de espera, tempo máximo e bots de reposição.

## 8. IA da máquina (MVP)

Decidido em D90. Resumo do modelo:

- **Decisão por turno:** gera ações possíveis, pontua por fatores com pesos do perfil, sorteia entre as melhores
  (`Rng` da seed, determinístico).
- **Perfis:** agressivo, cauteloso, focado em abater, equilibrado (só mudam pesos).
- **Dificuldade:** 5 níveis, Iniciante a Grão-mestre. Mudam nitidez do sorteio e quantos fatores a IA enxerga.
  **Nunca** dão bônus de stat.
- **Informação:** só o que o jogador vê. Joga com as mesmas regras (grade 3x3, 4 personagens, 4 skills).
- **Squads:** no `seed.ts` no MVP; do admin depois.
- **Ideia futura (não decidida):** previsão de 1 ou 2 turnos à frente para o Grão-mestre.
- **Leitura do jogador (decidido):** a IA registra as ações do jogador **dentro da batalha** (log) e usa na nota,
  só com o que o jogador fez e viu. A memória **não** passa entre batalhas. Níveis: Iniciante nenhuma;
  Intermediário só a última ação; Avançado padrões simples (alvo favorito); Mestre padrões e uso de skills;
  Grão-mestre tudo, incluindo reação ao estilo. Memória entre batalhas para chefes de eventos únicos: ideia futura.
  Falta só definir os fatores exatos do log e o peso na nota (valores, depois do A8).

### 8.1 Valores propostos (placeholders, ajustar com o A8)

Decisões fechadas: todas as ações candidatas entram no sorteio; recentes pesam mais no log; o Grão-mestre
escolhe sempre a melhor ação (desempate pela `Rng`); o balanceamento dos pesos fica a cargo do design e
é validado em teste. **Perfil próprio para chefes de evento: depois do MVP** (no MVP usam os 4 perfis).

**Nota normalizada:** cada fator vira 0 a 1 (dano esperado / maior dano possível, risco / vida atual etc.) e a nota
da ação é a soma ponderada pelo perfil, dividida pela maior nota do turno.

**Sorteio:** `p(ação) proporcional a exp(nota / T)`. `T` por nível (placeholder):

| Nível | T | Fatores que enxerga | Leitura do jogador |
|---|---|---|---|
| Iniciante | 1.0 | dano esperado, abate | nenhuma |
| Intermediário | 0.5 | + ameaça do alvo | última ação |
| Avançado | 0.25 | + risco próprio | padrões simples |
| Mestre | 0.1 | + defesa/cura/status, situação geral | padrões e uso de skills |
| Grão-mestre | 0 (sempre a melhor) | todos | tudo, reage ao estilo |

**Pesos dos perfis** (placeholder; fatores que o nível não enxerga valem 0):

| Perfil | Dano | Abate | Ameaça | Risco | Defesa/cura/status | Situação |
|---|---|---|---|---|---|---|
| Agressivo | 1.0 | 0.8 | 0.5 | 0.2 | 0.2 | 0.3 |
| Cauteloso | 0.5 | 0.5 | 0.5 | 1.0 | 1.0 | 0.6 |
| Focado em abater | 0.6 | 1.0 | 0.7 | 0.4 | 0.3 | 0.4 |
| Equilibrado | 0.7 | 0.7 | 0.6 | 0.6 | 0.6 | 0.6 |

**Log do jogador (dentro da batalha):**
- **Registra:** alvo escolhido, skill usada, troca de posição, defesa, e o contexto na hora (vida, Desgaste).
- **Janela:** últimas 5 ações, peso decrescente (1.0, 0.8, 0.6, 0.4, 0.2).
- **Padrão de alvo:** **2 ataques seguidos** no mesmo personagem = indício (meio peso); **3** = padrão confirmado
  (peso cheio). Ser atacado direto já conta como alvo.
- **Efeito na nota:** padrão confirmado soma bônus de proteção ao alvo previsto (e, para skills de linha/coluna,
  ao reposicionamento); o bônus escala com o nível (Avançado 0.5x, Mestre 0.75x, Grão-mestre 1.0x). Placeholder.

### 8.2 O que falta (IA da máquina)

**Valores: fechados em D103 (seção 10); calibração por simulação.**
- Pesos finais dos 4 perfis e `T` por nível: os de 8.1 são placeholders, validar em teste.
- Normalização exata de cada fator (dano, abate, ameaça, risco, defesa/cura/status, situação).
- Peso do log na nota (bônus de proteção ao alvo previsto, escala por nível).
- Janela do log e limiar de padrão (5 ações; 2 = indício, 3 = padrão): confirmar jogando.

**Depois do MVP:**
- Perfil próprio para chefes de eventos únicos.
- Previsão de 1 ou 2 turnos à frente para o Grão-mestre.
- Memória do jogador entre batalhas (descartada no MVP, ideia futura para chefes).
- Squads de NPC e perfis vindos do admin (no MVP ficam no `seed.ts`).

**Trabalho de montagem (não é decisão):**
- Squads de NPC no `seed.ts` (4 personagens, grade 3x3, 4 skills cada), cobrindo os 4 perfis e os 5 níveis.
- Implementar a estrutura (gerar ações, pontuar, sortear com `Rng`, log) com placeholders; porta `Rng` com fake fixo
  em `test/`.

**Próximo passo sugerido:** A8 fechado (D91). Seguir com curva de XP, Poder das skills e Exaustão/status, depois calibrar a IA simulando batalhas.

## 9. Faixas do ranqueado (D99)

**[PLACEHOLDER aprovado]**. As faixas baixas ensinam o jogo por camadas e as altas liberam o resto.

| | Bronze | Prata | Ouro | Platina |
|---|---|---|---|---|
| **Nível nivelado** | 10 | 20 | 50 | 100 |
| **Stats (% do nível 100)** | 41% | 47% | 67% | 100% |
| **Pontos livres** | 1 concessão | 2 | 5 | 10 |
| **DOM (nível máximo)** | desligado | básico | intermediário | avançado |
| **Equipamento vivo (grau máx.)** | desligado | Escudeiro | Cavaleiro | sem teto |
| **Contratos com bestas** | desligado | desligado | até Cavaleiro | todos (inclui sagradas) |
| **Despertar** | não | não | não | sim |
| **Skill aprimorada** | não vale | não vale | 50% do ganho | 100% |
| **Traços ativos** | 2 | 3 | 4 | 5 |

- **Acima do limite, rebaixa em vez de desligar:** DOM intermediário em Prata age como básico; arma Rei em Ouro age
  como Cavaleiro. O jogador não perde o item, só o excesso.
- **Skills:** só entram na build as de **nível mínimo ≤ nível da faixa** (bloqueia Forte na Prata, Final no Ouro e a
  despertada fora da Platina).
- **Lenda:** os melhores da temporada na Platina, mesmas regras, só reconhecimento e recompensas.
- **Histórico mínimo:** **10 batalhas** (casual ou PvE, nenhuma amistosa) para liberar o ranqueado.
- **Ficam para o ajuste fino do PvP (depois do MVP):** pontos do Elo, limites de pontos de cada faixa, temporada.

## 10. Valores da IA da máquina (D103)

**[PLACEHOLDER aprovado]**, calibrar simulando IA contra IA. Complementa 8.1 (mantém `T` por nível e pesos dos perfis).

### 10.1 Normalização: tudo em "% de HP equivalente"

Cada ação vira quantos **% de HP** ela rende, dividido por **25** (≈ maior golpe único), com teto 1.

| Fator | Como calcular |
|---|---|
| **Dano** | chance de acerto × dano em % do HP do alvo (inclui queda 100/60/30, Marcado, área somando alvos) |
| **Abate** | (dano esperado ÷ HP atual do alvo)², soma dos alvos, teto 1 |
| **Ameaça** | (Ataque × Velocidade do alvo) ÷ maior valor entre os inimigos; vale para o alvo atingido |
| **Risco** (subtrai) | 50% do custo de Desgaste ÷ folga que sobra + 50% de "HP baixo e ação ofensiva" |
| **Defesa/cura/status** | valor em % de HP equivalente (tabela abaixo) |
| **Situação** | `s` = HP% total aliado − HP% total inimigo (de −1 a 1); soma `s × abate − s × defesa` |

| Efeito | Valor (% de HP equivalente) |
|---|---|
| Cura / escudo | % do HP máx. efetivamente restaurado do aliado, ×(1 + o que falta de vida) |
| Atordoado | 11 (uma ação) |
| Travado / Preso / Exposto | 6 / 3 / 4 |
| Marcado | 5 |
| Dano contínuo | 12 |
| Buff / debuff 10 / 15 / 20% | 3 / 4,5 / 6 |
| Adiantar / atrasar a vez | X% × 11 |
| Defender | 4 |
| Mover / trocar aliado | 2 |

- **Nota final:** `nota' = (nota − mínima) ÷ (máxima − mínima)` (min-max, porque o risco pode deixar a nota negativa;
  substitui a divisão pela maior de 8.1).
- **Corte:** ações com nota' abaixo de **0,2** nunca são sorteadas, em nenhum nível.

### 10.2 Log do jogador

- **Janela:** últimas 5 ações do jogador, pesos 1,0 / 0,8 / 0,6 / 0,4 / 0,2.
- **Bônus de proteção** ao personagem focado: **+0,15 na nota** das ações que o protegem (cura, escudo, defender,
  interceptar, trocar de lugar) com 2 ataques seguidos; **+0,30** com 3. Escala por nível: Avançado ×0,5, Mestre
  ×0,75, Grão-mestre ×1,0.
- **Mestre e Grão-mestre** lembram as **skills já usadas** pelo jogador e o cooldown delas (só sabem depois do uso,
  como o jogador). Quando uma skill forte volta do cooldown, o risco do personagem exposto sobe **+0,10**.

### 10.2b Detalhes (D114)

Detalhes da IA que o 10.1/10.2 não fixavam: (1) "HP baixo" do Risco começa abaixo de **50%** e sobe em linha até 1 com HP zero; (2) Intermediário lê só a **última ação** (um ataque já é indício), bônus ×**0,25**; (3) **trocar o campo** vale a mudança do bônus dos aliados − a dos inimigos, **0,3 por ponto %**; (4) empurrar, puxar e trocar inimigo valem **2** × chance contra a Vontade; (5) o bônus do log entra **depois** da normalização, antes do corte de 0,2; (6) o +0,10 da skill forte vale para Forte, Final ou despertada **já vista e pronta**, no personagem da frente da linha ou Exposto, só em ação de skill; (7) a **Ameaça** é multiplicada pela chance de acerto. A IA usa **Rng própria** derivada da seed (o replay não roda a IA). Implementação em `engine.md` 3.13.

### 10.3 Nível dos NPCs (sem bônus de stat)

| Dificuldade | Nível dos NPCs |
|---|---|
| Iniciante | 10 a 25 |
| Intermediário | 25 a 45 |
| Avançado | 45 a 70 |
| Mestre | 70 a 90 |
| Grão-mestre | 90 a 100 (com DOM e equipamento) |

### 10.4 Metas de calibração (IA contra IA, mesmo squad)

- Um nível acima vence o anterior **~65%**; dois níveis acima **~80%**; quatro acima **≥95%**.
- Os 4 perfis, no mesmo nível, ficam entre **45% e 55%** entre si.
- Jogador humano mediano deve vencer o Iniciante em mais de 80% e o Mestre em ~40%.
- Fora da faixa: ajustar pesos e `T`, nunca os stats.
