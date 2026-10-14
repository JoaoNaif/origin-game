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
3. Valores do ranking (pontos, faixas, temporada) e histórico mínimo do ranqueado.
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

**Valores (bloqueados pelo A8, valores dos stats e pisos do Desgaste):**
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

**Próximo passo sugerido:** fechar o A8 (valores dos stats), que destrava a IA, o DOM, o equipamento vivo e os contratos.
