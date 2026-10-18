# ORIGIN — Briefing de Skills

> Ponto de partida da **conversa exclusiva sobre skills**. Reúne o que já foi decidido e conversado, para a conversa não começar do zero.
> Skills são **o centro do jogo**: tudo (formação, personagem, equilíbrio, PvP) depende delas.
> Regras do jogo em [`game_design.md`](./game_design.md). Mundo e lore em [`world_build.md`](./world_build.md).
>
> Convenções: **[ENRAIZADO]** = decidido, não reabrir sem motivo forte · **[EXEMPLO]** = ideia dada para ilustrar, não é regra · **[ABERTO]** = a decidir na conversa.
> Tudo é mutável, mas o que é **[ENRAIZADO]** é a base do jogo: mudar exige discutir o impacto no resto.

---

## 1. Princípios enraizados

1. **[ENRAIZADO] Risco x retorno (lógica de mercado financeiro).** Quanto mais forte a skill, maior o risco/custo. Skills básicas: risco baixo, ganho baixo. Skills muito fortes: risco alto. Não existe skill forte e barata.
2. **[ENRAIZADO] O custo é o Desgaste.** É a tradução da regra de ouro do mundo ("poder tem custo, nunca some, só é redistribuído"). Custos preferidos do mundo: degeneração de articulações, perda de tato, esgotamento neural, envelhecimento, sobrecarga metabólica.
3. **[ENRAIZADO] Diversidade por design.** O custo escalonado existe para que nem todo personagem tenha os mesmos ataques. O valor de um personagem depende da **squad que o acompanha**, não só dele.
4. **[ENRAIZADO] Formação e skill são pensadas juntas.** A posição na grade muda o que a skill faz e quem ela alcança.
5. **[ENRAIZADO] Sem vantagem/desvantagem entre linhagens.** Não há tabela de "fogo vence gelo". A diferenciação vem de custo e de estilo.
6. **[ENRAIZADO] Ranged nunca é estritamente superior ao melee** (D23). O equilíbrio passa pelo risco x retorno.
7. **[ENRAIZADO] Decisão manual a cada turno.** Skill é escolha ativa do jogador, não automação.
8. **[ENRAIZADO] O motor é determinístico.** Nenhuma skill pode depender de `Math.random()` ou relógio: aleatoriedade vem da seed (D8).
9. **[ENRAIZADO] Poder fraco no papel pode ser letal na mão certa** (regra de ouro do mundo). Skill básica combinada com a formação certa deve poder vencer uma skill cara.

---

## 2. O tabuleiro onde a skill atua (já decidido)

- Cada jogador tem uma **grade 3x3** (9 células), uma de frente para a outra. Cada jogador escolhe **4 personagens** e os posiciona livremente.
- **Ordem de turno:** fila por velocidade; cada personagem age no seu turno.
- **Vitória:** derrotar todos os inimigos.
- **Bloqueio:** um personagem vivo bloqueia quem está atrás dele. Derrotado, deixa de bloquear.
- **Corpo a corpo** (D22): atinge só a **célula-alvo selecionada**, e apenas se ela estiver **exposta** (primeira célula ocupada da **linha**; a linha vai da frente para o fundo, ver 9.3). Não passa por cima de ninguém. Exceções só por skills específicas.
- **Troca de posição** (D19): permitida em combate e **custa a ação do turno**.

```
a - a - a      (a = célula; 3 linhas x 3 colunas por jogador; linha = frente → fundo, 1ª coluna = frente)
a - a - a
a - a - a
```

---

## 3. O que uma skill vai precisar ter (anatomia provisória)

Os campos abaixo são **o mínimo que já sabemos que existe**. O formato final é **[ABERTO]**.

### 3.1 Alcance (tipo de ataque) [ENRAIZADO que existam; lista final ABERTA]

| Tipo | Comportamento |
|---|---|
| **Corpo a corpo** | Só célula exposta; bloqueado por quem está na frente |
| **À distância** | Alcança qualquer célula, inclusive atrás de alguém |
| **Em linha** | Atinge a linha inteira do alvo |
| **Em coluna** | Atinge a coluna inteira do alvo |
| **Atravessa / perfura** | **[EXEMPLO]** Ignora o bloqueio ou passa por vários |

> Linha e coluna foram dadas como **exemplos de área**, não como regra. A lista real de tipos de área sai da conversa.

### 3.2 Área e alvo [ABERTO]

- Alvo único, aliado, inimigo, o próprio personagem, área na grade.
- A área precisa respeitar a posição: quem está fora da linha/coluna **não recebe** o efeito.
- Exemplo de buff por área: "aumenta o ataque de toda a linha do usuário". Quem está em outra linha fica sem o bônus. Isso é o que faz a formação importar.

### 3.3 Custo / Desgaste [ENRAIZADO o conceito; mecânica ABERTA]

- Custo **escala com a força** da skill (princípio 1).
- Cada **linhagem tem um padrão de custo** (D16), com exceções permitidas. Exemplos dados:
  - **Fundamental** → custo em **HP**.
  - **Biológica** → custo em **velocidade**.
  - As demais (Elemental, Material, Vetorial, Psíquica) ainda sem padrão: **[ABERTO]** (A3c).
- Como o risco se manifesta: **fechado em 9.4b** (cobra no acerto, acumula na batalha, piso de 75%, alívio por buff/cura/Defender, sem sorte).
- Skills muito fortes: custo alto (princípio 1).

### 3.4 Efeitos [ABERTO]

Tipos que já sabemos que precisam existir:

- **Dano** (e seus tipos, se houver).
- **Status:** estados sobre o personagem (ex.: lentidão, travamento, queimadura, etc., a definir).
- **Buffs:** melhoram atributos de aliados (muitas vezes por área).
- **Debuffs:** pioram atributos de inimigos.
- **Cura / regeneração** (a linhagem Biológica sugere).
- **Reposicionamento:** empurrar, puxar, trocar lugar (ver 3.6).
- **Controle de turno:** afetar a fila de velocidade (atrasar, adiantar).

Perguntas: duração dos efeitos (em turnos), se acumulam, se há limite, quem vence quando buff e debuff colidem.

### 3.5 Recarga, uso e limites [ABERTO]

- Recarga (cooldown), usos por combate, ou só o custo limitando? Hoje o custo faz esse papel; precisa decidir se basta.
- Quantas skills por personagem, e se o jogador escolhe um subconjunto antes do combate (montagem de "build").

### 3.6 Reposicionamento [ABERTO]

- Trocar de lugar com um aliado (custa a ação dos dois?), mover só para adjacente, ou **skills específicas que reposicionam** (empurrar, puxar, trocar). Esta última foi a opção que parece mais promissora por não criar uma mecânica separada.

### 3.7 Variações e aprimoramento [FECHADO, D80]

- Versão básica x versão aprimorada: **um aprimoramento só**, que dá **mais potência** (sem efeito novo).
- Cada skill indica o(s) título(s) que aumentam a **chance** de aprimorá-la; título nunca dá status direto.
  Detalhes em `progression_brief.md` 2.8.

---

## 4. Ligação com o mundo (lore) que a skill deve respeitar

- Toda habilidade precisa de **base científica/física plausível**. Não existe magia.
- **Poder é definido pela aplicação**, não só pela habilidade: o mesmo poder (fogo) vira lança-chamas, flecha ou propulsor conforme a tática.
- As **6 variantes** influenciam o tipo de custo biológico: Elemental, Material, Vetorial, Biológica, Psíquica, Fundamental.
- **DOM** (Mente, Coração, Corpo, Aura): fechado, ver [`dom_brief.md`](./dom_brief.md). O avançado dá uma skill única de uso único (5ª skill, fora das 4), sem custo.
- Pacto fechado (contratos com bestas, [`beast_contracts_brief.md`](./beast_contracts_brief.md)). Materiais fechado em D104. Enxerto, Rede e Selo adiados para depois do MVP.
- Os dois eixos de linhagem (manifestação x família ancestral) precisam de mapeamento (conflito 9 do `world_build.md`). Provavelmente resolvido junto com a tabela de padrões de custo.

---

## 5. O que a skill NÃO pode fazer

- Dar vantagem direta de tipo entre linhagens (princípio 5).
- Ser forte e barata ao mesmo tempo (princípio 1).
- Depender de aleatoriedade fora da seed (princípio 8).
- Fazer o ranged ser estritamente melhor que o melee (princípio 6).
- Tornar um personagem bom sozinho: a skill deve ganhar valor com a squad (princípio 3).

---

## 6. Riscos de design que a conversa precisa resolver

1. **Turtling:** formação que ninguém consegue romper. Precisa de skills que quebrem bloqueio.
2. **Skill dominante:** uma skill barata e forte que todos usam, matando a diversidade (princípio 3).
3. **Troca de posição abusiva:** se for barata demais, a formação inicial perde importância. Hoje custa o turno.
4. **Complexidade do motor:** área + bloqueio + troca de posição obrigam a recalcular efeitos quando alguém se move. O modelo de dados da skill precisa ser simples de resolver de forma determinística.
5. **Legibilidade para o jogador:** com custo, alcance, área e status, a UI precisa mostrar claramente o que cada skill faz antes de usar.

---

## 7. Roteiro sugerido para a conversa de skills

1. Estrutura da skill: campos e formato de dados.
2. Como o **risco x retorno** vira número (a curva).
3. Como o **Desgaste** se manifesta (A3b) e a **tabela de padrões por linhagem** (A3c).
4. Lista de tipos de **alcance e área**; regras de bloqueio e exceções.
5. Catálogo de **status, buffs e debuffs** (duração, empilhamento).
6. **Reposicionamento** e troca de posição.
7. Skills raras e sua ligação com o lore.
8. Um conjunto mínimo de skills de teste (para o protótipo, poucos personagens).

---

## 8. Decisões da conversa de skills (sessão 1)

> Termos (corrigido na sessão 2, ver 9.1): **linhagem** = categoria do poder (Elemental, Fundamental...).
> **Variante** = o poder em si (fogo, tempo...); quem tem poder também é chamado de variante no mundo.

### 8.1 Linhagens [ENRAIZADO]

São **6** (a Elemental foi adicionada). Cada uma define o tema e o padrão de custo dos poderes do personagem.

| Linhagem | Tema | Exemplos de variante |
|---|---|---|
| Elemental | Fenômenos elementais | fogo, gelo |
| Psíquica | Mente, própria ou alheia | telecinese, ilusão |
| Biológica | Bio | regeneração, veneno biológico |
| Material | Estrutura da matéria | cristalização estrutural, reconfiguração molecular |
| Vetorial | Direção e força | redirecionamento vetorial, vetor de aceleração |
| Fundamental | Base da realidade | antimatéria, tempo |

- **A linhagem é do personagem.** Ele usa as skills da sua linhagem.
- **Sem linhagem (none):** raro. Lore: no mundo Origin o poder está ligado ao cérebro; só pensar já é um custo. Por isso **só personagem sem linhagem usa skill none**.
- **Skill none:** mais fraca, custo menor. A maioria sem cooldown; as mais fortes têm cooldown, bem mais curto que o das skills de linhagem. O teto de ganho precisa ser baixo.
- Tabela de padrões de custo por linhagem: proposta em 9.4 (A3c).
- ~~Pode usar skill de outra linhagem?~~ Não: só das próprias variantes (10.3).

### 8.2 Estrutura da skill [PROPOSTA]

`linhagem · custo · cooldown · alcance · área · alvo · efeitos[]`

- **Custo** escala com a força (risco x retorno). Nada é de graça.
- **Cooldown** existe para impedir spam. Conta em **turnos do próprio personagem**, não em rodadas globais. Skill forte: custo alto e cooldown longo.
- **Alcance** e **área** são eixos separados (ver 9.3).
- **Tipo de skill** (alcance): corpo a corpo, projétil/à distância etc. Os traços olham para isto (ver 8.4).

### 8.3 Efeitos [ENRAIZADO]

- **Buff e debuff** seguem o mesmo padrão (modificador temporário de atributo, com duração).
- **Cura é um tipo de efeito à parte** (instantânea, não é buff). **Não passa do HP máximo** (9.2).
- **Escudo (shield)** é outro efeito à parte: absorve dano. É a única forma de "passar" do HP.

### 8.4 Traços [ENRAIZADO]

- Característica do **personagem**, separada da variante (ex.: furtivo, artista marcial, guerreiro).
- Influenciam **status** (guerreiro: mais força) e **skills** (artista marcial: mais dano em skills corpo a corpo). Podem olhar o **tipo de skill** e a **variante**.
- Também definem quem recebe o bônus do **campo de batalha**.
- **Imutáveis:** uma vez no personagem, não saem. Evita a corrida para coletar traços.
- **Limite por personagem:** 5 (fechado em 10.1; ajustável).
- **Como adquirir:** ver 9.6 (ideia inicial: histórico do personagem e eventos especiais). Detalhes **[ABERTO]**.

### 8.5 Campo de batalha [ENRAIZADO]

- Gerado **automaticamente** no início da partida (usa a seed, continua determinístico).
- **Visível** ao jogador no início (decisão: mostrar o campo inicial).
- Dá **bônus em status a todos** (os dois lados) que cumpram os **traços** que o campo pede. Não é bônus por variante (mantém o princípio 5).
- **Campo inicial** dura a batalha toda.
- **Skill pode mudar o campo.** O novo campo vale para todos os que cumprirem o requisito (nada de bônus exclusivo para quem acionou). Dura **N turnos** e depois volta ao campo inicial. O adversário pode trocar de novo.
- A skill de mudar campo vale pela **escolha**: quem aciona escolhe o campo que favorece a sua squad.
- Por ora é **só bônus de status**. Futuro: regras mais ricas (alcance, bloqueio etc.).
- Duração, traços e bônus: fechados em D98 (`skills_brief.md` 12.7).

### 8.6 Pontos de atenção com o lore

- ~~**Termo "variante"**~~: resolvido em 9.1 (linhagem = categoria, variante = o poder / quem tem poder). Bate com o `world_build.md`.
- **Várias variantes por personagem:** o lore diz que 94,5% têm 1 variante, 5% têm 2 e 0,1% têm 3; 0,4% não têm nenhuma (batem com a skill none ser rara). Resolvido em 10.3 e D52: pode ter 2 (3 raríssimo), com **mais opções e mais custo** (ex.: 2 Desgastes). Custo extra fechado em D97 (`character_brief.md` 8).
- **Elemental x linhagens ancestrais:** o `world_build.md` cita Gelo (ex.: "Gelo+Gelo", seção de herança) como elemento de família. Falta mapear em qual família cai cada tipo de manifestação (conflito 9 do `world_build.md`).

### 8.7 Pendências desta conversa

> Lista atualizada na 9.9.

1. ~~Tabela de padrões de custo~~ → proposta em 9.4.
2. Mecânica do Desgaste (A3b): custo imediato ou acumulado durante a batalha (já fechado: só dentro da batalha, 9.2).
3. Quantidade exata de traços por personagem (~5) e como são adquiridos.
4. Duração N do campo trocado por skill; quais traços cada campo exige; tamanho do bônus.
5. ~~Skill de outra linhagem?~~ Não (10.3). ~~Cura passa do HP máximo?~~ Não (9.2).
6. Lista final de tipos de alcance e de área; skills que reposicionam; quantas skills por personagem.

---

## 9. Decisões da conversa de skills (sessão 2)

### 9.1 Termos [ENRAIZADO]

- **Linhagem** = categoria do poder: Elemental, Psíquica, Biológica, Material, Vetorial, Fundamental.
- **Variante** = o poder em si (fogo, gelo, tempo, telecinese...). No mundo, quem tem poder também é chamado de **variante**.
- Nos dados: `lineage` (categoria) e `variant` (poder).

### 9.2 Regras de combate fechadas [ENRAIZADO]

- **Fila de turnos em timeline:** cada personagem tem um contador que avança conforme a velocidade; age quando chega a vez. Mudança de velocidade tem efeito gradual.
- **Empate na fila:** vai primeiro quem tem a **maior média de todos os stats**. Se ainda empatar, **sorteio** entre os empatados (via seed, continua determinístico).
- **Duração de efeitos** (buff, debuff, status) conta em **turnos do próprio personagem afetado**, igual ao cooldown.
- **Sem ressurreição:** personagem derrotado não volta.
- **Desgaste e debuffs valem só dentro da batalha.** Nada passa para o próximo combate.
- **Cura não passa do HP máximo.** O excesso é perdido. Escudo é efeito separado.
- **A seed fica só no servidor.** O cliente nunca a recebe (senão prevê os efeitos aleatórios). Se precisar provar que foi justa, revelar no fim da partida (commit-reveal).
- **Nenhum custo deve mexer muito na velocidade.** Velocidade já controla a fila e o cooldown; como custo, pesaria duas vezes.

### 9.3 Alcance x área [ENRAIZADO]

Dois eixos independentes:

- **Alcance** = quem pode ser escolhido como alvo: corpo a corpo (só exposto), à distância (qualquer célula), perfurante etc.
- **Área** = a forma do efeito em volta do alvo: **individual**, **linha**, **coluna**, **área** (= a **grade inteira**).

**Orientação da grade [ENRAIZADO]:** **linha** vai da frente para o fundo; as **colunas** são as posições de profundidade
(1ª coluna = frente). Ver D22 e D35 do `game_design.md`.

**Queda de dano na linha [ENRAIZADO]:** quem está na frente toma dano cheio, o próximo personagem da linha toma dano
médio e o terceiro, dano pequeno. A queda conta **por personagem atingido**, não por célula: se houver um na 1ª e outro
na 3ª, sem ninguém entre eles, o da 3ª toma dano médio. Objetivo: impedir o "tank imortal" (tank na frente + curadores
atrás) sem tornar a skill de linha forte demais.

- Valores: **100% / 60% / 30%**.
- Skills **perfurantes** (sem queda) existem, mas custam mais (risco x retorno).
- **Área (grade inteira) não tem queda:** atinge todos com o efeito cheio. O equilíbrio vem do custo (mais alcance, mais
  custo), ajustado ao criar cada skill.

### 9.4 Tabela de custo por linhagem [ENRAIZADO]

**Um stat por linhagem**, sem dois compartilhando o mesmo (exceto o HP, que tem "máximo" e "atual").
A Biológica **saiu de velocidade** (ver 9.2). Ataque e Velocidade não são custo de nenhuma linhagem.

| Linhagem | Custo no lore | Efeito no jogo |
|---|---|---|
| Fundamental | envelhecimento | **HP máximo** (cura não recupera) |
| Elemental | dano a si | **HP atual**, imediato (cura desfaz, então o valor é maior). Dano contínuo só em skills específicas |
| Material | degeneração de articulações | **Defesa** |
| Vetorial | perda de tato | **Precisão** |
| Psíquica | esgotamento neural | **Vontade** (fica vulnerável a controle) |
| Biológica | sobrecarga metabólica | **Esquiva** |

- Todo custo respeita o **piso do Desgaste** (`character_brief.md` 2): o stat nunca cai abaixo do mínimo.
- Exceções por skill continuam permitidas (D16). Os **valores** dependem da fórmula de dano (9.8).
- Ponto de atenção: a Esquiva só pesa contra Precisão alta, então a Biológica pode parecer barata. Calibrar quando a
  fórmula de acerto existir.

### 9.4b Mecânica do Desgaste [ENRAIZADO]

Fecha a pergunta A3b. O Desgaste **não é o centro do jogo**: parece pouco, mas quem sabe jogar em cima dele tem
vantagem (diferencial de nível alto), sem assustar o iniciante.

**Quando cobra**

- Cobra se a skill **produz efeito em pelo menos 1 alvo**. **Errar não cobra** (já custou turno e recarga).
- Skills sem teste de acerto (buff, cura, em si mesmo) cobram **sempre**.
- Skill de área cobra **uma vez**, não por alvo.
- Cobrou, **cobra sempre**: **sem chance de falha** nem efeito colateral aleatório (custo é lei).

**Como acumula**

- O Desgaste é um **modificador negativo no stat da linhagem** (9.4), **acumula** durante a batalha e some no fim (D32).
- **Piso: 80%** do stat base (D91): o Desgaste tira no máximo 20%. O mesmo piso para todos os stats.
- **2 variantes = 2 Desgastes** (D52, D97): cada skill cobra 100% no stat **da própria linhagem** e uma fração (**ressonância**) nas outras: 60% com 2 variantes, 40% em cada uma com 3. Ver `character_brief.md` 8.

**Curva custo × poder (convexa)** (D91)

| Poder da skill | Custo (% do stat base) |
|---|---|
| 1,0 | ~1,5% |
| 1,5 | ~4% |
| 2,0 | ~8% |

Skills básicas quase não pesam; as fortes pesam. O admin equilibra olhando **o que a skill faz** (dano, efeito,
alcance, área), não só o número.

**No piso (sem folga)**

- A skill **continua utilizável**, mas com **potência reduzida drasticamente**: dano, buff, debuff e cura rendem
  menos. Nada é gratuito, e nenhuma skill sai do personagem.
- Regra proposta [PLACEHOLDER]: com folga ≥ custo, 100%; com folga parcial, interpola; sem folga, **50%** da magnitude.
  Duração e acerto não mudam.

**Como alivia**

| Fonte | Efeito [PLACEHOLDER] |
|---|---|
| **Buff no mesmo stat** | Soma direto (D37), sem regra nova |
| **Cura** | Remove uma parte **menor** do Desgaste acumulado (~20%), para o Suporte não anular o custo (D13) |
| **Defender** | Remove um valor pequeno (~10%) |
| **Skill de recuperação** | Remove mais (~50%); marca de skill de Suporte |

**Exceções:** Fundamental reduz o **HP máximo**: cura não recupera (D59), só buff de HP máximo ou skill específica.
Elemental reduz o **HP atual**: a cura desfaz. Se o HP máximo cai abaixo do atual, o atual é cortado para o novo
máximo.

**Psíquica:** perde Vontade e fica mais fraca, **sem** vulnerabilidade total a controle.

**Outros custos fora desta tabela:** DOM não tem custo (D60); equipamento vivo no elo pleno cobra o custo da linhagem
dele em valor fixo pequeno (`living_gear_brief.md` 5); contrato Dominância cobra Vontade enquanto a besta está em
campo (`beast_contracts_brief.md` 3).

### 9.5 Personagem sem ação possível [ENRAIZADO]

Caso: todas as skills em cooldown ou caras demais. O personagem pode **Defender**: recebe menos dano até o próximo
turno. **Não existe ataque básico grátis** (quebraria o risco x retorno). Quanto reduz: depende dos stats.

### 9.5b Empilhamento de efeitos [ENRAIZADO, revisado em 11.10]

- A **mesma skill** aplicada de novo **renova a duração**, não soma.
- ~~Fontes diferentes somam até um teto; buff e debuff somam direto.~~ **Revisado (D73):** multiplicativo sobre o
  valor atual, com limite de **3 fontes** por stat (ver 11.10).

### 9.6 Traços: como adquirir [PROPOSTA]

- Pelo **histórico do personagem** (métricas acumuladas), por exemplo:
  - finalizou 100 inimigos → pode adquirir **Assassino**;
  - mitigou 100.000 de dano → pode adquirir **Tank**;
  - participou de N batalhas → pode adquirir **Sobrevivente**.
- Por **eventos especiais** que liberam traços.
- Detalhes a discutir **[ABERTO]**.

### 9.7 Outras propostas aceitas

- **Turtling:** além de skills que quebram bloqueio, o **campo de batalha** pode favorecer quem está na frente com o passar dos turnos. **[PROPOSTA]**
- **Protótipo cedo:** fechar logo um conjunto de skills de teste cobrindo as combinações de alcance e área. **Atualizado (D75):** 8 a 12 personagens de teste num `seed.ts`, cobrindo todas as classes, alcances, status e linhagens.

### 9.8 Stats do personagem [ENRAIZADO a lista; fórmula ABERTA]

Os **7 stats** estão definidos em [`character_brief.md`](./character_brief.md) 2 (HP, Ataque, Defesa, Velocidade,
Precisão, Esquiva, Vontade). **Forma da fórmula de dano e de acerto fechada** (`character_brief.md` 2, D68). Faltam
os **valores** dos stats. Bloqueiam: valores da tabela 9.4, queda de dano (9.3), buffs e debuffs.

### 9.9 Pendências

1. **Fórmula de dano** e valores dos stats (`character_brief.md` 2).
2. ~~Custo da Biológica, Psíquica e Elemental~~ → fechado em 9.4.
3. Teto do empilhamento e redução do Defender (dependem dos stats).
4. ~~Itens que continuam da 8.7~~ → resolvidos na sessão 3 (seção 10). Pendências atualizadas em 10.8.

---

## 10. Decisões da conversa de skills (sessão 3)

> Substitui o que estava **[ABERTO]** em 8.1, 8.4, 8.5, 3.5, 3.6 e 3.7 onde houver conflito.

### 10.1 Traços [ENRAIZADO]

- **Limite: 5 por personagem.** Valor ajustável se o jogo mostrar que é muito ou pouco.
- **Aquisição por meta:** ao bater uma meta do histórico (ex.: finalizou 1.000 inimigos), aparecem **até 3 traços**
  para escolher. O jogador **escolhe 1 ou descarta todos**.
  - Cada meta tem o seu conjunto de traços possíveis. Pode ter só 1 ou 2 (aparecem todos), ou mais de 3
    (ex.: 5); nesse caso, **3 são sorteados**.
- Também por **eventos especiais**.
- **Vantagem por progressão é aceita:** quem joga mais ganha mais traços.
- **Com 5 traços ocupados, não há oferta** nas novas metas.
- **Descartou, perdeu:** a oferta daquela meta não volta. Mantém o peso da escolha.

### 10.2 Campo de batalha [ENRAIZADO]

- **Campos não são fixos no código:** o **admin cria os campos** (dados, não código). O sorteio pela seed escolhe
  entre os campos cadastrados.
- Cada campo define **os traços exigidos e o bônus**.
- A **duração N** do campo trocado **é da skill** (ex.: skill forte troca por 2 turnos, uma fraca por 4).
- **Bônus em porcentagem** escala com os stats de quem o recebe.

### 10.3 Linhagem e variante nas skills [ENRAIZADO]

- Um personagem **só usa skills das suas próprias variantes**. Quem é de fogo não usa skill de água nem skill
  Fundamental.
- Alguns personagens têm **2 variantes**; em **raríssimos** casos, **3**. Cada variante dá acesso às suas skills.
- **Skills liberadas por nível do personagem.** Detalhes ficam para a conversa de personagem.
- **Não existem "skills roubadas".** O termo saiu dos docs.

### 10.4 Reposicionamento [ENRAIZADO]

- Mover só para **célula adjacente**, e custa a ação do turno.
- **Trocar com um aliado:** os **dois perdem a ação**.
- **Skills que reposicionam** (empurrar, puxar, trocar) existem e são uma peça estratégica.
- **Não pode** empurrar para célula ocupada nem para fora da grade: o movimento é barrado, mas **o resto da skill
  (dano etc.) acontece normalmente**.

### 10.5 Skills em batalha [ENRAIZADO]

- **4 skills por personagem** em batalha.
- **Build:** o personagem acumula as skills liberadas (por nível) e o jogador **monta as 4 fora da partida**. Durante a
  batalha ficam **travadas**. Um mesmo personagem pode ter papéis diferentes conforme a squad.

### 10.6 Aprimoramento do personagem e auxílio de skill [BASE da ideia, não aprofundar ainda]

Não confundir com o **aprimoramento de skill** (3.7, D80). Formas de aprimorar o personagem que vêm do lore:

- **Despertar:** evolução da própria variante (ex.: fogo → fogo azul). Raro.
- **Armas vivas:** armas que carregam uma variante. Equipadas, dão acesso a uma habilidade da arma.
- **Contratos com animais:** invocação de um companheiro para a batalha (estilo Naruto).

### 10.7 Outros

- **Lista de status:** fechada em 11.9 (6 status; a Vontade resiste a status e reposicionamento forçado).

### 10.8 Pendências

1. **Fórmula de dano** e valores dos stats (stats definidos em `character_brief.md` 2).
2. ~~Custo da Biológica, Psíquica e Elemental~~ → fechado em 9.4.
3. Teto do empilhamento e redução do Defender (dependem dos stats).
4. Lista de status (10.7).
5. Conversa de personagem **feita** (`character_brief.md`): nível, kit básico, pontos livres, XP, despertar. Sobram
   como conversas próprias: armas vivas, contratos, DOM e facção (todas já fechadas, ver `open_topics.md`) (`character_brief.md` 9).

---

## 11. Decisões da conversa de skills (sessão 4): alcance e bloqueio

> Fecha A2b (inclusive o turtling, 11.8). Substitui o que estava **[ABERTO]** em 3.1, 3.2 e 10.4 onde houver conflito.

### 11.1 Tipos de alcance [ENRAIZADO]

| Tipo | Quem pode ser alvo |
|---|---|
| **Corpo a corpo** | Só a **primeira célula ocupada** da linha (a exposta) |
| **À distância** | **Qualquer** célula, inclusive atrás de alguém |
| **Perfurante** | **Atravessa** os personagens da linha: sem bloqueio e **sem queda** (D36); custa mais |
| **Flanco** | Ignora o bloqueio da frente: atinge a **última célula ocupada** da linha (por trás) |

- O **flanco** é o contra-golpe do corpo a corpo: alcança o fundo da linha com
  poder de melee, a custo maior. É a ferramenta típica do **Executor**.
- Alcance **não é da classe, é da skill** (D69).

### 11.2 Exposição e adjacência [ENRAIZADO]

- **Exposto** = primeira célula ocupada da linha (da frente para o fundo). Linha vazia na frente: o próximo ocupado
  vira exposto.
- **Adjacente** = 4 direções (frente, trás, esquerda, direita). **Sem diagonal.**
- Derrotado **deixa de bloquear** (D21).

### 11.3 Área [ENRAIZADO]

- Skills de **área** (linha, coluna, grade) **ignoram o bloqueio**. **O atacante escolhe** a célula-alvo.
- Continuam valendo a queda 100/60/30 na linha (D36) e a regra de que a grade inteira não tem queda.

### 11.4 Skills sobre aliados [ENRAIZADO]

- **Cura, buff e escudo não sofrem bloqueio:** aliados não bloqueiam suporte. Alcançam qualquer aliado.

### 11.5 Ranged e perfurante [ENRAIZADO]

- **À distância** (D23): **menos Poder base e mais Desgaste** (D71). **Sem regra nova de posição.**
- **Perfurante:** atravessa os personagens da linha, **sem queda**, e custa mais (D36).

### 11.6 Guardião: interceptar [ENRAIZADO]

- Intercepta golpes **de alvo único**, **uma vez por rodada**, de **corpo a corpo e à distância**.
- **Não intercepta área** (linha, coluna, grade).

### 11.7 Reposicionamento, bestas e resolução [ENRAIZADO]

- **Reposicionamento:** cada tipo (empurrar, puxar, trocar, mover aliado, dash) tem **custo próprio**. A **Vontade**
  cria resistência a ser forçado, **fórmula aberta**.
- **Bestas** (D64): entram numa **célula livre escolhida** pelo jogador, **bloqueiam** e **podem ser empurradas**.
- **Resolução:** efeitos de área resolvem em **ordem fixa** (determinismo, D8) e **recalculam a cada baixa**.

### 11.8 Turtling [ENRAIZADO]

Formação que ninguém consegue romper (parede de Vanguarda e Guardião com Suporte atrás). Proteções já existentes:
queda 100/60/30, Desgaste, Defender menor que dano, perfurante e flanco. Somam-se a **pressão por rodada**:

| Rodada | Regra [PLACEHOLDER] |
|---|---|
| Até a 20 | Normal (a meta de duração é 10 a 15, podendo passar) |
| A partir da 21 | **Exaustão:** a cada rodada a **cura rende menos** (~-10%) e o **dano rende mais** (~+5%) |
| 30 | **Fim forçado:** vence quem tem **mais % de HP total** |

Só aparece depois do tempo normal: não pesa para o iniciante, só para quem tenta travar o jogo.

### 11.9 Status e Vontade [ENRAIZADO]

**Distinção:** **debuff** = número no stat (Ataque −20%); **status** = estado com regra própria.

| Status | O que faz | Observação |
|---|---|---|
| **Atordoado** | Perde a próxima ação | Recarga longa e **imunidade de 1 turno** depois (anti-cadeia) |
| **Travado** | Uma skill do alvo entra em recarga extra | Atinge o kit, não o turno |
| **Preso** | Não pode se mover nem ser movido por skill | Contra empurrar/puxar |
| **Exposto** | Vira alvo de corpo a corpo mesmo atrás de alguém | Status de formação (Executor, Controlador) |
| **Marcado** | Recebe +X% de dano de todas as fontes | Setup para o dano |
| **Dano contínuo** | Perde HP no início do turno dele (queimadura, sangramento) | Contado em turnos do afetado (D31) |

**O que a Vontade resiste:**

- **Resiste** à **aplicação** de status hostil e ao **reposicionamento forçado** (empurrar, puxar, trocar).
- **Não resiste** a dano direto, debuff de stat já aplicado nem Desgaste.
- **Fórmula** (mesma forma do acerto): `chance = base × 2 × Precisão / (Precisão + Vontade)`, com piso e teto
  (30% a 90%, D92).
- Alerta: Suporte, Controlador e Guardião têm Vontade alta; testar a resistência do Controlador.

### 11.10 Empilhamento multiplicativo [ENRAIZADO]

Substitui a soma direta de 9.5b (D37):

- Buff e debuff são **multiplicadores sobre o valor atual** do stat: Ataque 50 com −20% fica 40; mais −20% fica 32.
  Vale para buff e debuff.
- A **ordem não importa** (determinismo, D8). Buff +20% com debuff −20% dá ×0,96.
- **Limite de fontes ativas por stat:** **2 buffs e 2 debuffs** (D92; era 3). Fonte além do limite **substitui a
  mais fraca**. A mesma skill continua só **renovando a duração**.
- Com 2 fontes de 20%: máximo de ~+44% e ~−36%, sem teto em %. Magnitudes 10% / 15% / 20% (D92).
- O **Desgaste** é separado, com o piso de 75% (D71), e também multiplica.

### 11.11 Reposicionamento [ENRAIZADO]

- **Mover-se** custa a ação do turno; **trocar com aliado** faz os dois perderem a ação (D19, D42).
- **Skill que reposiciona** é uma skill normal (Desgaste e recarga). Ser empurrado **não** custa o turno do alvo.
- Não há custo extra novo.

### 11.12 Pendências

1. ~~Valores da Exaustão~~: mantidos (D92, seção 12.5).
2. ~~Valores dos status~~: fechados (D92, seção 12.4).
3. ~~Redução do Defender~~: +50% de Defesa (D92, seção 12.5).
4. Conjunto mínimo de skills de teste.

---

## 12. Valores de combate (D92)

Decididos na conversa de balanceamento. Todos **[PLACEHOLDER aprovado]**, ajustar com simulação.

### 12.1 Poder, cooldown e custo (alvo único, corpo a corpo)

| Tipo | Poder | Cooldown | Desgaste | Nível mínimo |
|---|---|---|---|---|
| Básica | 0,8 | 0 | ~1% | 0 |
| Padrão | 1,0 | 1 | 1,5% | 0 |
| Reforçada | 1,3 | 2 | ~3% | 20 |
| Forte | 1,6 | 3 | ~5% | 40 |
| Final | 2,0 | 4 | 8% | 60 |

Cooldown conta em turnos do próprio personagem (8.2). Uma rotação sempre no máximo bate no piso do Desgaste em ~6
ações: é o efeito pretendido para o nível avançado.

### 12.2 Modificadores por forma

| Forma | Poder | Custo |
|---|---|---|
| À distância | ×0,9 | ×1,25 |
| Flanco | ×1,0 | ×1,4 |
| Linha ou coluna (queda 100/60/30) | ×0,85 | ×1,3 |
| Perfurante (sem queda) | ×0,65 | ×1,5 |
| Grade inteira (sem queda) | ×0,5 | ×1,5 |

### 12.3 Cura e escudo

Poder 1,0 = **10% do HP máximo do alvo**, escalado pelo Poder da skill (não por stat do usuário).

### 12.4 Status (duração em turnos do afetado)

Chance = `base × 2 × Precisão / (Precisão + Vontade)`, piso 30%, **teto 90%**.

| Status | Efeito | Duração | Base |
|---|---|---|---|
| Atordoado | Perde a próxima ação (imunidade de 1 turno depois) | 1 | 70% |
| Travado | +2 de recarga em uma skill | n/a | 80% |
| Preso | Não move nem é movido | 2 | 80% |
| Exposto | Alvo de corpo a corpo | 2 | 85% |
| Marcado | +20% de dano recebido | 3 | 80% |
| Dano contínuo | 4% do HP máx. por turno (ignora Defesa) | 3 | 80% |

### 12.5 Empilhamento, Defender e Exaustão

- **Fontes por stat: 2 buffs e 2 debuffs** (era 3). Magnitudes **10% / 15% / 20%**. Máximo ~+44% e ~−36%.
- **Defender:** +50% de Defesa efetiva até o próximo turno do personagem, fora do limite de fontes, mais ~10% de alívio
  de Desgaste. Reduz 13% (Executor) a 19% (Vanguarda) do dano recebido.
- **Exaustão:** mantida (rodada 21, cura −10% e dano +5% por rodada, fim forçado na 30).

### 12.6 Kit básico e marcos

- **4 skills, todas da variante** do personagem; o **papel** vem da classe (um Suporte de fogo tem uma skill de
  suporte de fogo). Padronizado por classe e variante: mesmo Poder para todos da mesma combinação.
- Composição por papel: **básica** (0,8, cooldown 0), **padrão** (1,0, cooldown 1), **uma de função da classe**
  (escudo, buff, controle etc.) e **uma de assinatura da variante** (~1,0 com efeito lateral pequeno).
- **Sem variante (none, D25):** kit de 4 skills none, mais fracas e de custo menor, cooldown mais curto.
  **Aprovado:** Poder ×0,85, custo ×0,5, cooldown −1 (mín. 0).
- **Marcos:** nos níveis **50 e 100** o bloco de 3 garante ao menos uma skill **Forte ou Final** (nível mínimo
  respeitado). Pool por variante: **~30 skills ou mais**, distribuídas pelos tipos acima.

### 12.7 Campos de batalha (D98)

Os campos são dados do admin; os valores abaixo são **referência de equilíbrio** (o admin pode ajustar, mas deve
conhecer o que cada número pesa). **[PLACEHOLDER aprovado]**.

- **Bônus:** **+6% em um stat e +4% em outro** (10 pontos, igual ao DOM intermediário). Vale depois dos tetos e **não
  conta** nas 2 fontes de buff por stat (é ambiental). Multiplicativo: +6% de Ataque dá ~+9% de dano.
- **Traços exigidos:** cada campo lista **2 a 4 traços** de categorias diferentes (Combate, Postura, Origem); quem tem
  **qualquer um** recebe o bônus. Meta do admin: ~35 a 45% dos personagens qualificam. MVP (`seed.ts`): 6 campos, 3
  traços cada.
- **Troca por skill** (contada em **rodadas**, o campo é global; a skill não tem Poder, só custo e cooldown):

| Tipo da skill | Duração | Bônus na troca | Cooldown | Desgaste |
|---|---|---|---|---|
| Padrão | 4 rodadas | ×1,0 | 2 | 1,5% |
| Reforçada | 3 rodadas | ×1,25 | 3 | 3% |
| Forte | 2 rodadas | ×1,5 | 4 | 5% |

  Há **uma troca ativa por vez** (a nova substitui a anterior). Ao fim, volta ao campo inicial.
- **Sorteio inicial justo:** só entram os campos em que a diferença de personagens qualificados entre os lados é de
  **no máximo 2** (de 4). Se nenhum cumprir, a batalha começa **sem campo**. Vale para todos os modos, inclusive PvE.

### 12.8 Fila, Tático e Guardião (D102)

**[PLACEHOLDER aprovado]**.

**Barra de ação (timeline, D30):** cada personagem tem uma barra de **0 a 1000**. Todo tick soma a Velocidade; ao
chegar a 1000 ele age e subtrai 1000. Começam em 0 e o empate segue o D30. O **adiantar** do Tático nunca leva a barra
além de 1000 (impede empilhar ações extras); a sobra do tick depois de agir fica (D106).

**Tático:**

| Skill | Padrão | Reforçada | Forte | Final |
|---|---|---|---|---|
| **Adiantar a vez de um aliado** | +50% | +70% | +90% | age agora (+100%) |
| **Atrasar a vez de um inimigo** | −25% | −40% | −55% | −70% |
| Cooldown | 2 | 3 | 4 | 5 |
| Desgaste | 1,5% | 3% | 5% | 8% |

- Adiantar rende ~50% de uma ação por unidade de +50% (equivale a ~5 a 11% do HP do alvo), cerca de metade de uma
  skill de dano do mesmo tipo.
- **Atrasar** não é status (a Vontade não resiste). Tem teste de acerto normal (base 80%). O alvo fica **imune a novo
  atraso até agir**. A barra nunca fica abaixo de 0.
- **Mover aliados:** mover 1 aliado (adjacente) ou trocar 2 aliados **sem custar a ação deles**: Padrão (1,5%,
  cooldown 1). Reforçada move até 2 aliados (3%, cooldown 2).
- **Buff de squad:** magnitude **×0,7** da do buff individual (10 / 15 / 20% vira 7 / 10,5 / 14%) em todos os
  aliados, com custo **×1,3**.

**Guardião: Interceptar** (passiva de classe, não ocupa slot, automática):

- Protege os aliados **adjacentes** (4 direções).
- **Uma vez por rodada**, o primeiro golpe de alvo único (corpo a corpo ou à distância) contra um aliado adjacente é
  redirecionado para ele. O dano é calculado contra a Defesa do Guardião e qualquer status do golpe cai nele.
- **Não intercepta:** área, perfurante e flanco.
- Só funciona se o Guardião estiver vivo e não **Atordoado nem Preso**. Com mais de um Guardião, ordem fixa pela seed.
- **Sem Desgaste.** Ex.: um golpe do Executor no Atirador cai de 23% para 9% do HP do Guardião.

**Artilharia:** conferida, sem mudança. Linha Forte com 2 alvos rende Poder total ~2,2 por ação contra 1,6 do
Executor, mas o Executor age 1,77x mais; por tempo ficam ~2,8 contra ~2,2.
