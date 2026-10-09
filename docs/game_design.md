# ORIGIN — Game Design (documento vivo)

> Registro das decisões de design do jogo. O mundo está em `world_build.md`; aqui fica **como o jogo funciona**.
> Convenções: **[DECIDIDO]** = fechado · **[PROPOSTA]** = sugerido, falta confirmar · **[ABERTO]** = precisa de decisão.

---

## 1. Visão

Jogo de **estratégia por turnos com esquadrão de personagens**, focado em montar formação, ler a composição do inimigo e dominar as skills. Referências: Naruto Online, Monster Legends, Pokémon, Hearthstone, Dragon City.

O prazer central é **quebrar a cabeça**: descobrir formações, personagens e skills que respondam a um problema.

## 2. Decisões tomadas

| # | Decisão | Estado |
|---|---|---|
| D1 | Combate **por turnos** | DECIDIDO |
| D2 | **Decisões manuais** a cada turno (liberdade e dinamismo acima de automação) | DECIDIDO |
| D3 | Plataforma inicial: **desktop** (web app primeiro, empacotar com Electron/Tauri depois) | DECIDIDO |
| D4 | Stack: **TypeScript**, servidor **NestJS**, motor de combate em pacote puro separado | DECIDIDO |
| D5 | Início com **poucos personagens**, só o suficiente para testar o combate | DECIDIDO |
| D6 | Terá **história**, ligada às estruturas do mundo (facções, organizações), não ao enredo | DECIDIDO |
| D7 | **PvP competitivo** é parte central | DECIDIDO |
| D8 | O motor de combate é **determinístico e sem interface** (mesma seed + mesmas ações = mesmo resultado) | DECIDIDO |
| D9 | O servidor é a **autoridade** do combate; o cliente só envia ações e exibe o resultado | DECIDIDO |
| D10 | **Ordem de turno:** fila por velocidade, cada personagem age no seu turno (resolve A1) | DECIDIDO |
| D11 | **Grade 3x3** por jogador; o jogador escolhe **4 personagens** e monta a formação livremente nas 9 células (resolve A2, parcial) | DECIDIDO |
| D12 | **A posição importa:** skills podem ter efeito por área na grade (ex.: afetar a linha ou a coluna do personagem; quem está fora não recebe). **É só um exemplo**: os tipos de área reais serão definidos na conversa de skills. O princípio fechado é que a formação é pensada junto com as skills | DECIDIDO (princípio) |
| D13 | **Desgaste = risco x retorno** (lógica de mercado financeiro): quanto mais forte a skill, maior o risco/custo; skills básicas têm risco baixo e ganho baixo. Skills roubadas e muito fortes têm risco alto (resolve A3, conceito; detalhes na conversa de skills) | DECIDIDO |
| D14 | **Diversidade por design:** o custo escalonado evita que todo personagem tenha os mesmos ataques; o valor de cada um depende da squad que o acompanha | DECIDIDO |
| D15 | **Vitória:** derrotar todos os inimigos (por ora; objetivos alternativos ficam para depois) (resolve A4) | DECIDIDO |
| D16 | **Sem vantagem/desvantagem entre linhagens.** Cada linhagem tem um **padrão de custo** (ex.: Fundamental = HP, Biológica = velocidade), com exceções permitidas | DECIDIDO |
| D17 | **Ordem de trabalho:** primeiro fechar o jogo e o combate por completo, depois desenhar os personagens finais. Antes disso, só poucos personagens de teste | DECIDIDO |
| D19 | **Troca de posição durante o combate** é permitida e **custa a ação do turno** do personagem. Variações (trocar com aliado, só adjacente, skills que reposicionam) ficam para a conversa de skills | DECIDIDO |
| D20 | **Cada jogador tem a sua própria grade 3x3**, uma de frente para a outra | DECIDIDO |
| D21 | **Distância e bloqueio importam:** skill corpo a corpo não atinge quem está atrás de outro personagem vivo ("não passa por cima"); skills à distância e de linha/coluna podem alcançar. Personagem derrotado deixa de bloquear | DECIDIDO (princípio; regras exatas na conversa de skills) |
| D22 | **Melee atinge apenas a célula-alvo selecionada, e só se ela estiver exposta** (primeira célula ocupada da coluna, sem passar por cima de ninguém). Exceções ficam por conta de skills específicas | DECIDIDO |
| D23 | **Equilíbrio melee x ranged pelo risco x retorno:** corpo a corpo tem mais retorno por ter acesso limitado; à distância tem menos retorno e/ou mais risco. Ranged nunca pode ser estritamente superior | DECIDIDO (princípio) |
| D24 | **Sistema de skills:** o que já está enraizado está registrado em [`skills_brief.md`](./skills_brief.md), que é o ponto de partida da conversa de skills | DECIDIDO |
| D25 | **6 variantes:** Elemental, Psíquica, Biológica, Material, Vetorial, Fundamental. Personagem sem variante (raro) usa skills none (mais fracas, custo baixo, sem cooldown) | DECIDIDO |
| D26 | **Skill tem custo e cooldown** (cooldown em turnos do próprio personagem). **Cura é efeito à parte**; buff e debuff seguem o mesmo padrão | DECIDIDO |
| D27 | **Traços** do personagem influenciam status e skills (por tipo e variante). Imutáveis, limite ~5 (a definir), adquiridos ao longo do tempo | DECIDIDO |
| D28 | **Campo de batalha:** gerado pela seed, visível no início, bônus de status a todos que cumprem os traços exigidos. Skill pode trocá-lo por N turnos, depois volta ao inicial | DECIDIDO |
| D18 | **Estrutura do código** segue o padrão do ZapWave (clean architecture, NestJS). Documento vivo, vai mudar (ver `CLAUDE.md`) | DECIDIDO |

## 3. Princípio da progressão por história

A história existe para dar **vantagens off-combate que ajudam indiretamente no combate**. Ela nunca dá status direto.

- Exemplo: derrotar o líder da Sombra concede o título "Matador da Sombra". O título **aumenta a chance** de aprimorar uma skill, mas não garante o aprimoramento.
- Quem joga mais tem vantagem (é lógico e desejado), mas **o teto precisa ser alcançável**.

Ferramentas para manter a vantagem alcançável (a avaliar):

- **Pity / chance crescente:** cada falha aumenta a chance da próxima tentativa.
- **Retorno decrescente:** os primeiros títulos ajudam muito, os seguintes ajudam cada vez menos.
- **Teto de vantagem total:** a soma das vantagens tem limite fixo.
- **Catch-up:** quem começa depois evolui mais rápido nas etapas iniciais.

Tipos de vantagem off-combate a explorar:

- Chance de sucesso em aprimoramento de skill.
- Redução de custo ou tempo de treino e pesquisa.
- Acesso a informação (por exemplo, ver parte da composição inimiga).
- Acesso a conteúdo (variações de skill, itens, personagens).
- Prestígio e cosméticos.

## 4. Em aberto (a decidir)

| # | Pergunta | Observação |
|---|---|---|
| A2b | **Regras finas de alcance e bloqueio:** lista exata de tipos de alcance, skills que reposicionam (empurrar, puxar, trocar), variações da troca de posição, risco de "turtling" (formação que ninguém consegue romper) | Resolver na conversa de skills (ver `skills_brief.md`) |
| A3b | **Mecânica do Desgaste:** como o risco se manifesta (custo em HP, velocidade, chance de falha, dano acumulado entre combates?) e como o "retorno" é medido | Conceito fechado (D13). **Conversa exclusiva sobre skills**, ponto central do jogo |
| A3c | **Tabela de padrões de custo por variante** (Elemental, Material, Vetorial, Biológica, Psíquica, Fundamental) e quais exceções são permitidas | Derivado de D16 |
| A5 | **Estrutura do PvP:** ao vivo, relógio de turno, ranqueado, regras fixas | |
| A6 | **Modelo de progressão:** conta, personagens, skills, equipamento | |
| A7 | **Conflitos do `world_build.md`** (seção 13) que afetam dados do jogo | Decidir só os que importam para o jogo |

## 5. Próximos tópicos de brainstorm

1. ~~Loop de combate: turno, ordem de ação, grade e posição.~~ Base fechada (D10 a D12, D15); falta A2b.
2. **Sistema de skills (conversa exclusiva, prioridade máxima):** estrutura, custo, recarga, alcance, área, efeitos, variações e a curva risco x retorno.
3. Desgaste: como o risco se manifesta (ver A3b). Entra na conversa de skills.
4. Linhagens: tabela de padrões de custo (A3c) e o papel do DOM. Sem vantagem entre linhagens (D16).
5. Composição e sinergias de facção.
6. PvP: modos, ranking e regras de equilíbrio.
7. Progressão e história: títulos, aprimoramento de skills, missões.
8. Modo PvE: IAs de chefe (ex.: líder da Sombra).
9. Arquitetura técnica e estrutura do repositório.
