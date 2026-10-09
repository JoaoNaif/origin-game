# ORIGIN — Briefing de Skills

> Ponto de partida da **conversa exclusiva sobre skills**. Reúne o que já foi decidido e conversado, para a conversa não começar do zero.
> Skills são **o centro do jogo**: tudo (formação, personagem, equilíbrio, PvP) depende delas.
> Regras do jogo em [`game_design.md`](./game_design.md). Mundo e lore em [`world_build.md`](./world_build.md).
>
> Convenções: **[ENRAIZADO]** = decidido, não reabrir sem motivo forte · **[EXEMPLO]** = ideia dada para ilustrar, não é regra · **[ABERTO]** = a decidir na conversa.
> Tudo é mutável, mas o que é **[ENRAIZADO]** é a base do jogo: mudar exige discutir o impacto no resto.

---

## 1. Princípios enraizados

1. **[ENRAIZADO] Risco x retorno (lógica de mercado financeiro).** Quanto mais forte a skill, maior o risco/custo. Skills básicas: risco baixo, ganho baixo. Skills roubadas e muito fortes: risco alto. Não existe skill forte e barata.
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
- **Corpo a corpo** (D22): atinge só a **célula-alvo selecionada**, e apenas se ela estiver **exposta** (primeira célula ocupada da coluna). Não passa por cima de ninguém. Exceções só por skills específicas.
- **Troca de posição** (D19): permitida em combate e **custa a ação do turno**.

```
a - a - a      (a = célula; 3 colunas x 3 linhas por jogador)
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
- Como o risco se manifesta é **[ABERTO]** (A3b). Hipóteses a discutir: custo imediato (HP/velocidade/etc.), chance de falha, desgaste acumulado dentro do combate, desgaste que persiste entre combates, efeito colateral aleatório (via seed).
- Skills **roubadas** e muito fortes: custo alto (princípio 1).

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

### 3.7 Variações e aprimoramento [ABERTO]

- Variações de uma skill (versão básica x versão aprimorada).
- Ligação com a progressão pela história: título que aumenta a **chance** de aprimorar uma skill, nunca dá status direto (`game_design.md`, seção 3).

---

## 4. Ligação com o mundo (lore) que a skill deve respeitar

- Toda habilidade precisa de **base científica/física plausível**. Não existe magia.
- **Poder é definido pela aplicação**, não só pela habilidade: o mesmo poder (fogo) vira lança-chamas, flecha ou propulsor conforme a tática.
- As **6 variantes** influenciam o tipo de custo biológico: Elemental, Material, Vetorial, Biológica, Psíquica, Fundamental.
- Há skills de DOM (Mente, Coração, Corpo, Aura) e caminhos alternativos (Pacto, Materiais, Enxerto, Rede, Selo). Podem virar fontes de skill ou de custo. **[ABERTO]**
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
7. Skills **roubadas**/raras e sua ligação com o lore.
8. Um conjunto mínimo de skills de teste (para o protótipo, poucos personagens).

---

## 8. Decisões da conversa de skills (sessão 1)

> Termo: **variante** = o que o brief chamava de "linhagem de manifestação". Daqui em diante usar **variante**.

### 8.1 Variantes [ENRAIZADO]

São **6** (a Elemental foi adicionada). Cada uma define o tema e o padrão de custo dos poderes do personagem.

| Variante | Tema | Exemplos |
|---|---|---|
| Elemental | Fenômenos elementais | fogo, gelo |
| Psíquica | Mente, própria ou alheia | telecinese, ilusão |
| Biológica | Bio | regeneração, veneno biológico |
| Material | Estrutura da matéria | cristalização estrutural, reconfiguração molecular |
| Vetorial | Direção e força | redirecionamento vetorial, vetor de aceleração |
| Fundamental | Base da realidade | antimatéria, tempo |

- **A variante é do personagem.** Ele usa as skills da sua variante.
- **Sem variante (none):** raro. Lore: no mundo Origin a variante está ligada ao cérebro; só pensar já é um custo de variante. Por isso **só personagem sem variante usa skill none**.
- **Skill none:** mais fraca, custo menor, praticamente sem cooldown. O teto de ganho precisa ser baixo.
- Tabela de padrões de custo por variante: ainda **[ABERTO]** (A3c), agora com 6 linhas.
- **[ABERTO]** Pode um personagem usar skill de outra variante (ex.: skill roubada)? Hipótese: sim, com custo alto.

### 8.2 Estrutura da skill [PROPOSTA]

`variante · custo · cooldown · alcance (tipo) · área · alvo · efeitos[]`

- **Custo** escala com a força (risco x retorno). Nada é de graça.
- **Cooldown** existe para impedir spam. Conta em **turnos do próprio personagem**, não em rodadas globais. Skill forte: custo alto e cooldown longo.
- **Área:** individual, área, linha, coluna.
- **Tipo de skill** (alcance): corpo a corpo, projétil/à distância etc. Os traços olham para isto (ver 8.4).

### 8.3 Efeitos [ENRAIZADO]

- **Buff e debuff** seguem o mesmo padrão (modificador temporário de atributo, com duração).
- **Cura é um tipo de efeito à parte** (instantânea, não é buff). **[ABERTO]** Pode passar do HP máximo? Hipótese: não.

### 8.4 Traços [ENRAIZADO]

- Característica do **personagem**, separada da variante (ex.: furtivo, artista marcial, guerreiro).
- Influenciam **status** (guerreiro: mais força) e **skills** (artista marcial: mais dano em skills corpo a corpo). Podem olhar o **tipo de skill** e a **variante**.
- Também definem quem recebe o bônus do **campo de batalha**.
- **Imutáveis:** uma vez no personagem, não saem. Evita a corrida para coletar traços.
- **Limite por personagem:** por volta de 5 (número ainda não definido). **[ABERTO]**
- **Como adquirir:** não explicado ainda. Registrado que traços são **adquiridos** ao longo do tempo. **[ABERTO]**

### 8.5 Campo de batalha [ENRAIZADO]

- Gerado **automaticamente** no início da partida (usa a seed, continua determinístico).
- **Visível** ao jogador no início (decisão: mostrar o campo inicial).
- Dá **bônus em status a todos** (os dois lados) que cumpram os **traços** que o campo pede. Não é bônus por variante (mantém o princípio 5).
- **Campo inicial** dura a batalha toda.
- **Skill pode mudar o campo.** O novo campo vale para todos os que cumprirem o requisito (nada de bônus exclusivo para quem acionou). Dura **N turnos** e depois volta ao campo inicial. O adversário pode trocar de novo.
- A skill de mudar campo vale pela **escolha**: quem aciona escolhe o campo que favorece a sua squad.
- Por ora é **só bônus de status**. Futuro: regras mais ricas (alcance, bloqueio etc.).
- **[ABERTO]** Duração exata (N), quais traços cada campo pede, tamanho do bônus.

### 8.6 Pontos de atenção com o lore

- **Termo "variante":** no `world_build.md` (3.1), "variante" é o humano que hospeda um Éon, e "linhagem" é o tipo de manifestação. Na conversa de skills, "variante" passou a nomear o **tipo** (Elemental, Psíquica etc.). Decidir se mantemos esse uso no jogo ou se voltamos a "linhagem" nos dados. **[ABERTO]**
- **Várias variantes por personagem:** o lore diz que 94,5% têm 1 variante, 5% têm 2 e 0,1% têm 3; 0,4% não têm nenhuma (batem com a skill none ser rara). Falta decidir se um personagem do jogo pode ter mais de uma variante e, se puder, como isso interage com o custo. **[ABERTO]**
- **Elemental x linhagens ancestrais:** o `world_build.md` cita Gelo (ex.: "Gelo+Gelo", seção de herança) como elemento de família. Falta mapear em qual família cai cada tipo de manifestação (conflito 9 do `world_build.md`).

### 8.7 Pendências desta conversa

1. Tabela de padrões de custo para as 6 variantes (A3c). Já fechado: Fundamental = HP, Biológica = velocidade.
2. Mecânica do Desgaste (A3b): custo imediato ou acumulado durante a batalha.
3. Quantidade exata de traços por personagem (~5) e como são adquiridos.
4. Duração N do campo trocado por skill; quais traços cada campo exige; tamanho do bônus.
5. Pode uma skill de outra variante ser usada (skills roubadas)? Cura pode passar do HP máximo?
6. Lista final de tipos de alcance e de área; skills que reposicionam; quantas skills por personagem.
