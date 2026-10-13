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

1. **IA da máquina** (MVP): como o adversário escolhe ações, dificuldades, squads de NPC.
2. Janela de reconexão e tratamento de falha de rede.
3. Valores do ranking (pontos, faixas, temporada) e histórico mínimo do ranqueado.
4. Detalhes do top 3 (janela de tempo, o que conta como "mais usado").
5. Fila de espera, tempo máximo e bots de reposição.
