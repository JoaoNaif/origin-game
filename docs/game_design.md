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
| D13 | **Desgaste = risco x retorno** (lógica de mercado financeiro): quanto mais forte a skill, maior o risco/custo; skills básicas têm risco baixo e ganho baixo. Skills muito fortes têm risco alto (resolve A3, conceito; detalhes na conversa de skills) | DECIDIDO |
| D14 | **Diversidade por design:** o custo escalonado evita que todo personagem tenha os mesmos ataques; o valor de cada um depende da squad que o acompanha | DECIDIDO |
| D15 | **Vitória:** derrotar todos os inimigos (por ora; objetivos alternativos ficam para depois) (resolve A4) | DECIDIDO |
| D16 | **Sem vantagem/desvantagem entre linhagens.** Cada linhagem tem um **padrão de custo** (ex.: Fundamental = HP, Biológica = velocidade), com exceções permitidas | DECIDIDO |
| D17 | **Ordem de trabalho:** primeiro fechar o jogo e o combate por completo, depois desenhar os personagens finais. Antes disso, só poucos personagens de teste | DECIDIDO |
| D19 | **Troca de posição durante o combate** é permitida e **custa a ação do turno** do personagem. Variações (trocar com aliado, só adjacente, skills que reposicionam) ficam para a conversa de skills | DECIDIDO |
| D20 | **Cada jogador tem a sua própria grade 3x3**, uma de frente para a outra | DECIDIDO |
| D21 | **Distância e bloqueio importam:** skill corpo a corpo não atinge quem está atrás de outro personagem vivo ("não passa por cima"); skills à distância e de linha/coluna podem alcançar. Personagem derrotado deixa de bloquear | DECIDIDO (princípio; regras exatas na conversa de skills) |
| D22 | **Melee atinge apenas a célula-alvo selecionada, e só se ela estiver exposta** (primeira célula ocupada da **linha**, sem passar por cima de ninguém; a linha vai da frente para o fundo, ver D35). Exceções ficam por conta de skills específicas | DECIDIDO |
| D23 | **Equilíbrio melee x ranged pelo risco x retorno:** corpo a corpo tem mais retorno por ter acesso limitado; à distância tem menos retorno e/ou mais risco. Ranged nunca pode ser estritamente superior | DECIDIDO (princípio) |
| D24 | **Sistema de skills:** o que já está enraizado está registrado em [`skills_brief.md`](./skills_brief.md), que é o ponto de partida da conversa de skills | DECIDIDO |
| D25 | **6 linhagens:** Elemental, Psíquica, Biológica, Material, Vetorial, Fundamental. Personagem sem linhagem (raro) usa skills none (mais fracas, custo baixo; as mais fortes têm cooldown curto) | DECIDIDO |
| D26 | **Skill tem custo e cooldown** (cooldown em turnos do próprio personagem). **Cura é efeito à parte**; buff e debuff seguem o mesmo padrão | DECIDIDO |
| D27 | **Traços** do personagem influenciam status e skills (por tipo e variante). Imutáveis, limite 5 (ver D39), adquiridos ao longo do tempo | DECIDIDO |
| D28 | **Campo de batalha:** gerado pela seed, visível no início, bônus de status a todos que cumprem os traços exigidos. Skill pode trocá-lo por N turnos, depois volta ao inicial | DECIDIDO |
| D29 | **Termos:** linhagem = categoria do poder (Elemental...); variante = o poder em si (fogo, tempo...) e também quem tem poder | DECIDIDO |
| D30 | **Fila em timeline** (contador por velocidade). Empate: vai primeiro quem tem a maior média de stats; se ainda empatar, sorteio via seed | DECIDIDO |
| D31 | **Duração de efeitos** conta em turnos do próprio personagem afetado. **Sem ressurreição** | DECIDIDO |
| D32 | **Desgaste e debuffs valem só dentro da batalha.** Cura não passa do HP máximo; escudo é efeito separado | DECIDIDO |
| D33 | **Seed só no servidor**, nunca enviada ao cliente | DECIDIDO |
| D34 | **Alcance e área são eixos separados.** Área: individual, linha, coluna, área (= grade inteira). Nenhum custo deve mexer muito na velocidade (a Biológica deixa de custar velocidade, ajusta D16) | DECIDIDO |
| D35 | **Orientação da grade:** a **linha** vai da frente para o fundo; as **colunas** são as posições de profundidade (1ª coluna = frente) | DECIDIDO |
| D36 | **Queda de dano na linha:** 100% / 60% / 30%, contada por personagem atingido (não por célula). Skills **perfurantes** não têm queda e custam mais. Skills de **área** (grade inteira) atingem todos sem queda, com custo maior | DECIDIDO |
| D37 | **Empilhamento:** a mesma skill renova a duração (não soma); fontes diferentes somam até um teto; buff e debuff no mesmo atributo se somam direto | DECIDIDO |
| D38 | **Sem ação possível** (skills em cooldown ou caras demais): o personagem pode **Defender** (recebe menos dano até o próximo turno). Não existe ataque básico grátis | DECIDIDO |
| D39 | **Traços:** limite de 5 (ajustável). Ao bater uma meta do histórico, até 3 opções (sorteadas se houver mais); escolhe 1 ou descarta. Também por eventos | DECIDIDO |
| D40 | **Campos de batalha** são criados pelo admin (dados); cada um define traços exigidos e bônus. A duração do campo trocado é da skill | DECIDIDO |
| D41 | Personagem **só usa skills das suas próprias variantes** (2 variantes é possível; 3 é raríssimo). Skills liberadas por nível | DECIDIDO |
| D42 | **Reposicionamento:** mover só para adjacente (custa o turno); trocar com aliado faz os dois perderem a ação; skills de empurrar/puxar/trocar existem; não pode empurrar para célula ocupada nem para fora da grade | DECIDIDO |
| D43 | **4 skills por personagem** em batalha, montadas pelo jogador fora da partida a partir das skills liberadas; travadas durante a batalha | DECIDIDO |
| D44 | **Traços:** com 5 ocupados não há oferta; oferta descartada não volta. **Empurrão barrado:** o movimento falha, o resto da skill acontece | DECIDIDO |
| D45 | **Personagem:** detalhes em [`character_brief.md`](./character_brief.md). **7 stats:** HP, Ataque, Defesa, Velocidade, Precisão, Esquiva, Vontade. Sem mana | DECIDIDO |
| D46 | **Nível 0 a 100:** stats crescem pelo perfil do personagem; skills liberadas em marcos. **Ranqueado nivela** (por faixa de ranking, ver D63); casual e PvE usam o nível real | DECIDIDO |
| D47 | **Traços:** bônus moderado, podem ter lado negativo, divididos em categorias (combate, postura, origem). Sem traço de nascença | DECIDIDO |
| D48 | **Distribuição de stats:** base fixa pelo perfil + pontos livres só nas **3 aptidões** do personagem, com teto por stat. Pontos crescem com o nível; redistribuição grátis fora da batalha | DECIDIDO |
| D49 | **Despertar** (ver D67, que ajusta esta linha): exige nível alto; a skill despertada é mais forte e com mais Desgaste | DECIDIDO |
| D50 | **Kit básico:** cada variante tem skills default, que o personagem já tem no nível 0. Seguem o risco x retorno; continua sem ataque básico grátis (D38) | DECIDIDO |
| D51 | **Crescimento:** todos os stats sobem gradualmente por nível (perfil da classe). Em alguns níveis há pontos livres, aplicáveis só nas **aptidões da classe** (esclarece D48) | DECIDIDO |
| D52 | **Mais poder, mais custo:** 2 ou 3 variantes dão mais opções e variações, mas custam mais (ex.: 2 Desgastes). O despertar segue a mesma lógica. Detalhes abertos | DECIDIDO (princípio) |
| D53 | **Piso do Desgaste:** cada stat tem um mínimo durante a batalha; o Desgaste não passa dele. Valores abertos | DECIDIDO |
| D54 | **XP por métricas de batalha:** dano, mitigação, cura, abates etc., não só abates. Suporte sobe mais devagar (aceito). **Amistosa (contra amigo) não conta** para XP nem histórico; PvE e PvP contam | DECIDIDO |
| D55 | **Títulos pertencem ao personagem**, não à conta | DECIDIDO |
| D56 | **Despertar vale no ranqueado.** Aprimoramento é o gênero (despertar, DOM, armas vivas); só o despertar está detalhado | DECIDIDO |
| D57 | **Vantagem por traços é aceita**, inclusive no ranqueado e nos bônus de campo (sem traço de nascença) | DECIDIDO |
| D58 | **Acerto:** Precisão de quem ataca contra a Esquiva de quem defende, igual para skill individual e de área. Fórmula aberta | DECIDIDO (princípio) |
| D59 | **Custo por linhagem, um stat cada:** Fundamental = HP máximo, Elemental = HP atual, Material = Defesa, Vetorial = Precisão, Psíquica = Vontade, Biológica = Esquiva. Ataque e Velocidade não são custo (fecha A3c; ajusta D16) | DECIDIDO |
| D60 | **DOM:** 4 pilares (Mente, Coração, Corpo, Aura) x 3 níveis (básico, intermediário, avançado). Básico e intermediário = aumento de stats. Avançado = **título** (extra, fora dos 5 traços de D39) + **uma skill única**, de **uso único por batalha**, fora das 4 skills de D43. **Sem custo nem Desgaste** (exceção consciente a D52): o custo é a manutenção (D61). Pode ter até os 4 pilares, raríssimo (tão raro quanto 3 variantes) | DECIDIDO |
| D61 | **DOM se conquista e se perde por métricas de batalha**, uma meta por pilar (formas diferentes de ganhar). Cair abaixo da meta numa janela de batalhas faz perder **um nível** por vez (representa o treino que parou). Cada pilar usa **várias métricas** com teto por métrica, para não favorecer uma só classe (fórmula aberta). Sem variante: meta menor. **Ranqueado** ganha e perde mais; casual e PvE bem menos; amistosa não conta (D54) | DECIDIDO (princípio) |
| D62 | **Armas e armaduras vivas:** **passiva** (bônus moderado + efeito leve da variante), fora dos 4 slots (D43). **Um slot de equipamento vivo por personagem** (arma ou armadura, por ora). Grau (Escudeiro a Divino) por variante x afinidade do material. **Elo** (pleno, parcial, sem elo) definido por **requisitos de perfil de stats** do equipamento (alto/baixo relativo ao personagem), fixo na batalha. Sem elo nunca compensa; custo só dentro da batalha (D32). Obtido por eventos, baús e recompensas de ranking. Ver [`living_gear_brief.md`](./living_gear_brief.md) | DECIDIDO |
| D63 | **Ranqueado por faixa de ranking** (altera D46): o nível de nivelamento depende da faixa (ex.: platina = todos nível 100 com DOM e equipamentos no máximo; prata = nível 20 com limitações). **DOM e equipamento vivo valem e o grau influencia**; a paridade vem da faixa, não de teto. Casual e PvE usam o nível real. Faixas e limitações abertas | DECIDIDO (princípio) |
| D64 | **Contratos com bestas:** **invocação** de uso único por batalha numa célula livre; entra na fila com Velocidade própria, bloqueia e pode ser alvo; sai após N turnos ou ao morrer, sem matar o dono (D31). **3 contratos** (Dominância, Mestre, Igualdade) mudam o comportamento da besta. **Sagradas** só por evento, uma por personagem. **1 besta por personagem, 2 com o traço Domador.** Obtenção por eventos. Vale no ranqueado (D63). **Salvaguardas:** a invocação ocupa 1 dos 4 slots (D43), teto de bestas em campo por squad (placeholder 2) e duração limitada. Ver [`beast_contracts_brief.md`](./beast_contracts_brief.md) | DECIDIDO |
| D65 | **Família/ancestralidade = traço de Origem** (D47), só vale para a variante da família. **Sangue puro** (Primordiais) dá **acesso maior ao despertar** (D49) e redução pequena do custo da própria variante, **sem stat geral**. Fora da família: traço **Prodígio** (menos eficiência, mais flexível). Bônus do mesmo tamanho para todas (D16, D14). **Nocthar:** variante definida pelo admin na criação, sem mudar o código. **Hyperion** liga ao campo de batalha (D28). Ver [`family_faction_brief.md`](./family_faction_brief.md) | DECIDIDO |
| D66 | **Organizações** (Banco Central, Celestes, Sombra, Crônica, Registro): associação da **conta**, **fora do combate**, com bônus de economia, eventos e visibilidade, e só efeito **indireto** na batalha. Uma ativa por vez, com reputação e custo de troca; organizações rivais viram inimigas nos eventos. Valores e eventos abertos | DECIDIDO (princípio) |
| D67 | **Despertar (ajusta D49):** evolução da variante, **um só**, sem estágios. **Todos com 1 variante podem, nada garante:** depende de o admin ter criado um despertar para a variante. **2 ou 3 variantes e sem variante não despertam** (contrapeso do D52). No nível mínimo (placeholder 80) o sistema sorteia, com pesos pelos melhores stats, o despertar da variante e abre **missões ocultas** ligadas ao perfil dele. Dá **skills da nova variante**, mais fortes e com mais Desgaste (D52). Vale no ranqueado, sujeito às faixas (D63): faixa que nivela abaixo do nível mínimo não usa as skills despertadas (o jogo se revela por camadas). **"Éon" é descartado** como termo. Ver [`awakening_brief.md`](./awakening_brief.md) | DECIDIDO |
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
| ~~A3c~~ | ~~Tabela de padrões de custo por linhagem~~ | **Fechada (D59)**; tabela em `skills_brief.md` 9.4. Faltam só os valores (dependem de A8) |
| A8 | **Fórmula de dano** e valores dos stats | Stats definidos (D45); falta a fórmula. Bloqueia valores de custo, dano e buffs |
| A5 | **Estrutura do PvP:** ao vivo, relógio de turno, ranqueado, regras fixas | |
| A6 | **Modelo de progressão:** conta, personagens, skills, equipamento | |
| A7 | **Conflitos do `world_build.md`** (seção 13) que afetam dados do jogo | Decidir só os que importam para o jogo |
| A9 | ~~Arma viva, contrato com animal e DOM~~ fechados (D60 a D64). Restam os caminhos Enxerto, Rede, Selo, Materiais | Conversa própria futura. Ver [`open_topics.md`](./open_topics.md) |
| A10 | ~~Família/facção com efeito mecânico~~ | Fechada (D65, D66, [`family_faction_brief.md`](./family_faction_brief.md)). Restam valores e eventos |

## 5. Próximos tópicos de brainstorm

1. ~~Loop de combate: turno, ordem de ação, grade e posição.~~ Base fechada (D10 a D12, D15); falta A2b.
2. **Sistema de skills (conversa exclusiva, prioridade máxima):** estrutura, custo, recarga, alcance, área, efeitos, variações e a curva risco x retorno.
3. Desgaste: como o risco se manifesta (ver A3b). Entra na conversa de skills.
4. Linhagens: ~~tabela de padrões de custo (A3c)~~ fechada (D59); DOM fechado (D60, D61, [`dom_brief.md`](./dom_brief.md)). Sem vantagem entre linhagens (D16). Índice completo do que está em aberto: [`open_topics.md`](./open_topics.md).
5. ~~Composição e sinergias de facção~~ fechado (D65, D66).
6. PvP: modos, ranking e regras de equilíbrio.
7. Progressão e história: títulos, aprimoramento de skills, missões.
8. Modo PvE: IAs de chefe (ex.: líder da Sombra).
9. Arquitetura técnica e estrutura do repositório.
