# Direção de arte dos personagens

> Imagens dos 12 personagens da CORE, geradas por IA. Primeira fase: **uma imagem por personagem** (corpo inteiro,
> fundo transparente), usada como boneco de batalha (com animação em CSS no front) e, recortada, como retrato nos menus.
> Ilustração grande (splash) e ícones de skill ficam para depois. Tudo parte da lore (`world_build.md` e o seed) e das
> fichas visuais do usuário (seção 4); o que não está em nenhuma das duas e foi decidido aqui está marcado como
> **(decidido)**, para ajustar conforme as imagens saem.

## 1. Decisões de estilo

| Assunto | Decisão | Por quê |
|---|---|---|
| Proporção | Normal, adulta (~7,5 cabeças de altura), sem chibi | Escolha do usuário |
| Traço | Anime semi-realista: contorno limpo, sombra em 2 a 3 tons (cel shading) com um pouco de degradê pintado | Lê bem pequeno (~150 px na batalha) e não envelhece rápido |
| Luz | Principal suave de cima à esquerda, preenchimento frio fraco da direita, e um **contorno de luz na cor do personagem** | A mesma luz em todos faz os 12 parecerem do mesmo jogo; o contorno colorido separa o boneco do fundo escuro da batalha e reforça a cor dele |
| Cores | Roupa e pele em tons terrosos, um pouco dessaturados; **a cor do personagem é o acento mais forte** | O mundo é pós-Colapso e fragmentado; e, se só a cor dele grita, os 12 não se confundem |
| Mundo | Militar do início do séc. XX com equipamento tático moderno; nada de armadura de fantasia, neon sci-fi, runas ou círculos mágicos | Regra de ouro 1 (não existe magia) e seção 7 (tecnologia) do `world_build.md` |
| Poderes | Aparecem pouco, como fenômeno físico (faísca, gelo, distorção), perto da mão | O boneco precisa de silhueta limpa; efeito grande o CSS ou a skill fazem depois |
| Marca da CORE **(decidido)** | Um emblema geométrico pequeno no ombro ou no peito de todos | Une a squad visualmente; a lore não descreve uniforme |
| Armas | As que existem são de metal escuro com gravações finas (mesma mão: Drev Kovarik) | `world_build.md` 9.3: cada membro tem arma própria forjada por ele |
| Pose | Corpo inteiro, 3/4 virado para a **direita**, parado em guarda calma, os dois pés no chão | Animação de respirar precisa de pose estável; o inimigo é o mesmo boneco espelhado no CSS |
| Fundo | Transparente; se a ferramenta não der, **verde de chroma key** liso `#00FF00` (na Kara, que é verde, **magenta** `#FF00FF`). Sem sombra no chão, sem cenário | O front põe a sombra e o cenário. Nenhum personagem usa esse verde, então ele sai limpo tanto nos escuros (Ecko, Nox) quanto nos claros (Sunna, Rolf, Tank) |
| Arquivo | PNG, quadrado, um por personagem, com o nome da `key` do seed (`ecko-nocthar.png`), em `origin-front/public/characters/` | O front acha a imagem pela mesma chave do modelo |

**Cores que precisam de atenção** (parecidas de longe):

- **Sunna e Rolf** (os dois brancos): a Sunna é branco **frio** com azul-gelo forte e cabelo prateado longo; o Rolf é
  branco **quente**, sem azul, loiro, com a bandana nos olhos e o rifle nas costas.
- **Ecko e Nox** (os dois com preto): o Ecko é alto com **prata**; a Nox é pequena com **roxo**.
- **Gaia, Tank e Tyir** (os três neutros): a Gaia é terra quente com detalhes de planta; o Tank é bege claro com
  bandagens; o Tyir é cinza. Quem os separa é a silhueta (acolhedora, compacta, pesada) e o objeto.

**Tom de pele e cabelo:** vêm das fichas do usuário. Definidos: Ecko pardo, quase latino, cabelo preto; Lucky branco,
cabelo preto como o do Ecko (o parentesco aparece aí); Kael loiro, estilo viking; Derik negro, cabelo em tranças;
Sunna pele branca, cabelo longo prateado; Nox cabelo preto na altura do ombro; Gaia parda, cabelo castanho; Isis ruiva;
Tank cabelo castanho; Rolf loiro. **Em aberto:** a pele de Kael, Nox, Kara, Tyir, Isis, Tank e Rolf, e o cabelo da
Kara e do Tyir (no prompt, cabelo escuro na Kara e grisalho no Tyir, **(decidido)**).

## 2. Como usar

1. **Âncora de estilo: a imagem aprovada do Ecko** (`origin-front/public/characters/ecko-nocthar.png`). Ela vale pelo
   traço, luz e proporção. A cor e a arma do Ecko mudaram (era violeta, agora prata; a lâmina reta virou uma harpe):
   refaça no mesmo chat em que ele foi feito, pedindo "mesmo personagem, mesma pose e enquadramento; roupa toda preta;
   troca todos os detalhes violeta por prata; a lâmina reta vira uma harpe (espada com gancho de foice nas costas da
   lâmina, perto da ponta), com um brilho prateado frio distorcendo o ar em volta".
2. **Os outros 11:** um chat novo para cada um. Anexe a imagem do Ecko e cole, nesta ordem: a frase abaixo, o **bloco de
   estilo** (seção 3) e o bloco do personagem (seção 4).
   `Use the attached image only as the style reference (rendering, lighting, line quality, proportions), not as the character design.`
3. **Ajustes:** peça em português até gostar ("mesmo personagem, só deixa o casaco mais curto").
4. **Aprove no tamanho real:** veja a imagem pequena (~150 px de altura) e ao lado das já aprovadas. Se não der para
   dizer quem é só pela silhueta e pela cor, ajuste.
5. **Fundo:** o ChatGPT e o Gemini quase sempre entregam com fundo, mesmo pedindo transparente. Não precisa refazer nem
   usar o Paint: mande a imagem com o fundo verde (ou magenta, na Kara) para o Claude, que remove o fundo e salva em
   `origin-front/public/characters/` com o nome certo.

**Checklist de cada imagem:** corpo inteiro (dos pés à cabeça, nada cortado), virado para a direita, pés no chão, fundo
transparente ou liso, sem texto nem marca d'água, a cor do personagem é o acento mais forte, o objeto marcante aparece.

## 3. Bloco de estilo (igual em todos)

```
Semi-realistic anime-style character illustration for a turn-based tactical strategy game.
Normal adult human proportions (about 7.5 heads tall), no chibi, no exaggerated features.
Clean confident lineart with medium line weight; cel shading in two to three tones with soft painterly gradients.
Lighting: soft key light from the upper left, subtle cool fill light from the right, and a thin rim light along the
whole silhouette tinted in the character's signature color.
Palette: muted, slightly desaturated earthy tones for clothing and skin; the character's signature color is the
strongest accent.
World: grounded post-collapse world; early 20th century military clothing mixed with modern tactical gear. No fantasy
armor, no sci-fi neon, no magic runes or glowing circles; powers look like real physical phenomena and stay small,
close to the hands.
The character belongs to CORE, an elite squad: a small simple geometric CORE emblem on the left shoulder or chest.
Weapons, if any, are dark gunmetal with fine engraved lines.
Composition: one single character, full body from head to feet with margin around, nothing cropped, three-quarter view
facing right, calm combat-ready idle stance with both feet on the ground.
IMPORTANT: output a PNG with a fully transparent background (real alpha channel). The background must be empty:
no gradient, no checkerboard pattern, no floor, no ground shadow, no scenery, no frame.
If a transparent background is impossible, use one flat solid chroma-key green #00FF00 background, perfectly uniform,
with nothing else on it, and no green reflections on the character. No text, no logo, no watermark. Square image.
```

## 4. Personagens

Nome do arquivo = `key` do seed. Classe e poder vêm do seed e do `world_build.md` 9.3; aparência, cor, silhueta, objeto
e expressão vêm da ficha do usuário. Armas e roupas que nenhuma das duas descreve estão marcadas como **(decidido)**.

### Ecko Nocthar · `ecko-nocthar.png`

**Ficha do usuário:** líder da CORE. Criado desde criança como guerreiro e assassino; instinto forte de liderança, um
verdadeiro rei, o que caminha na frente do seu povo. A maior característica é a **presença totalmente intimidadora**.
Luta com uma **harpe** (espada com gancho de foice perto da ponta) somada à **antimatéria**, o que o torna um combo
mortal. Roupas caracteristicamente **pretas**. Luta mais a **curta distância** e complementa como **finalizador**. Irmão
do Lucky: frio e racional, ao contrário dele.

Classe no seed: **Executor**, antimatéria. A arma mudou: a imagem
aprovada tem lâmina reta, então precisa ser refeita com a harpe (seção 2, passo 1).

```
Character: Ecko Nocthar, adult man, leader and founder of CORE. Raised from childhood as a warrior and assassin; a
born king, the one who walks in front of his people. His defining trait is a totally intimidating presence: the
room goes quiet when he stands in it.
Appearance: medium brown skin, mixed-race, almost Latino features. Short neat black hair. A cold, heavy gaze that
weighs people before speaking; never looks relaxed.
Silhouette: tall, upright and imposing, broad firm shoulders, chin level, no wasted gestures; he occupies space like
a sovereign, not a soldier.
Clothing: all black. Long fitted black coat with a high collar over black tactical layers, black gloves and boots;
only small silver trims and details break the black.
Signature color: black with silver #C0C6CC (rim light in cold silver).
Signature object: his personal weapon, a harpe: a dark gunmetal sword whose straight blade ends in a curved,
sickle-like hook projecting from its back edge near the tip, with fine engraved lines. Held low in his right hand,
point toward the ground. Along the blade the light bends with a faint cold silver distortion (antimatter), as if the
air around the metal were being erased. It looks heavy and lethal.
Expression: total calm, jaw slightly clenched, the stillness of a predator.
```

### Lucky · `lucky.png`

**Ficha do usuário:** irmão do Ecko e o **melhor artista marcial da CORE**. Luta com uma **katana**, que usa muito para
canalizar o relâmpago. Tem **duas variantes, relâmpago e tempo**. Se destaca pela habilidade e técnica, somadas a
variantes extremamente fatais. Ao contrário do Ecko (frio e racional), é **gentil e sentimental**: o contraste entre os
irmãos. A marca dele é a **versatilidade de curta e longa distância**, porque tem variantes para os dois.

Classe no seed: **Atirador** (a classe só dá os stats; as skills misturam katana de perto e relâmpago de longe), relâmpago e tempo. O revólver saiu e entrou a katana. Tempo no
visual **(decidido)**: um rastro fraco de imagem atrasada (afterimage) na borda do corpo, sem relógio nem símbolo.

```
Character: Lucky, young man around 20, Ecko's younger brother and the best martial artist of CORE. Charismatic, kind
and sentimental, protective of others; the warm contrast to his cold, rational brother. A hero tired of being a symbol.
Appearance: fair skin, black hair like Ecko's (slightly messier), open, gentle face.
Silhouette: athletic and light, a martial artist's balanced stance, weight on the front foot, always about to move.
Clothing: dark royal blue jacket over light tactical gear, sleeves rolled up, clothes that allow full movement.
Signature color: dark royal blue #1F3A93.
Signature object: a worn, frayed blue cloth band tied around his left upper arm, a symbol for others.
Weapon: a katana with a dark gunmetal blade with fine engraved lines, held in a precise, relaxed low guard; thin
blue-white electric arcs run along the blade (lightning channeled through the sword). A faint, barely visible
afterimage trails one edge of his silhouette, as if he moved a fraction of a second ahead of time.
Expression: easy, gentle smile, but his eyes drift away, far off, as if no one is watching.
```

### Kael · `kael-vaz.png`

**Ficha do usuário:** o oposto do Derik. Cumpre regras, é dedicado e responsável, com forte senso de lealdade e um
grande coração, mas **impiedoso no campo de batalha**. Tem **duas variantes, explosão e endurecimento**, e é considerado
um **híbrido perfeito**, porque as duas funcionam muito bem juntas. Está sempre na **linha de frente**: a explosão acerta
**grandes áreas**, e a resistência e durabilidade do endurecimento fazem ele não sair machucado das próprias explosões.

Classe no seed: **Vanguarda**, explosão e endurecimento. Arma **(decidido)**: manoplas de aço.

```
Character: Kael, adult man, CORE's right hand. Disciplined, rule-abiding, dedicated and responsible, deeply loyal with
a big heart, but merciless on the battlefield; the exact opposite of Derik. Always on the front line. He fears being
useless more than dying.
Appearance: very tall and strong, viking-like, blond hair, full thick beard, war scars on his face and arms.
Silhouette: broad and square, like a shield standing upright, feet planted wide; clearly the biggest of the squad.
Clothing: heavy military coat with a fur-lined collar, rugged and practical, steel plates on shoulders and forearms;
no fantasy armor, no horned helmet.
Signature color: yellow #E8B923 (deep warm yellow, not neon).
Signature object: an old military dog tag on a chain over his chest, worn from use. Heavy steel gauntlets on both
fists, a faint heat haze and a few small embers near the knuckles (explosion); on one forearm the skin looks dense and
slightly stone-gray, as if hardened (hardening).
Expression: furrowed brow, the look of someone who never left the war.
```

### Derik · `derik-okoro.png`

**Ficha do usuário:** luta de um jeito extremamente louco, sem se importar com dano nem com golpes fatais, afinal ele se
cura. Isso o torna completamente imprevisível, fora de qualquer lógica que um guerreiro já enfrentou. Carrega **duas
Desert Eagles na cintura**, mais ilustrativas, para golpes de longe; a maior parte dos ataques é **nos punhos** e no
ímpeto de ser imortal, vindo como um **trator**, sem preocupação. Divertido e carismático, mas com problemas sérios de
**vício: cigarro e álcool**.

Classe no seed: **Vanguarda**, regeneração (e DOM do corpo). Vício no visual **(decidido)**:
cigarro aceso na boca e um cantil de bolso; a moeda da ficha anterior saiu para não brigar com eles.

```
Character: Derik, adult man, CORE's left hand and the group's clown; the one who cannot be killed (regeneration).
He fights in a completely reckless, unpredictable way, ignoring wounds and lethal blows because he heals; he comes in
like a tractor. Fun and charismatic, but with serious vices (smoking and drinking).
Appearance: Black man, hair in braids, a few scars that look already healed, bruised knuckles.
Silhouette: loose and relaxed but heavy-forward, shoulders rolled, fists half-closed, the swagger of someone who does
not care about getting hit.
Clothing: oversized dark red jacket open over a loose shirt, cargo pants, rolled sleeves, loose and sloppy.
Signature color: dark red #8B1A1A.
Signature object: a lit cigarette hanging from the corner of his mouth, a thin trail of smoke; a dented metal hip flask
sticking out of a jacket pocket. Two large dark gunmetal Desert Eagle pistols holstered at his waist, one on each hip,
untouched; his fists are his real weapons.
Expression: a constant crooked smile around the cigarette; when it disappears, everyone notices.
```

### Sunna Glassier · `sunna.png`

**Ficha do usuário:** a definição de **beleza e letalidade** em batalha. Tem o **melhor controle de variante de toda a
CORE**: faz praticamente tudo com o gelo (dominar o campo, ataque individual e em área). Carrega um **florete**. Foi
treinada quando criança na **mesma organização que o Ecko**, então tem a mesma facilidade para matar.
Personalidade: **totalmente direta**, fala sem pensar; muito **orgulhosa** e **irritada**, mas com um carisma
impressionante que faz as pessoas quererem a presença dela. É justa, mas tem um senso distorcido quando se trata dos
objetivos dela: por **amor ao Ecko**, destruiria uma cidade inteira para ele não morrer; não pesa as atitudes diante
do objetivo.

Classe no seed: **Controladora**, gelo (linhagem Glassier, povo polar).

```
Character: Sunna Glassier, adult woman, the strongest woman of Carmesin and the one with the highest power control in
CORE: she can do almost anything with ice. The definition of beauty and lethality in battle. Trained as a child in
the same organization as Ecko, she kills just as easily. Blunt and direct, proud and short-tempered, yet with a
magnetic charisma that makes people want to be near her. Fair, but ruthless about her goals: out of love for Ecko she
would destroy a whole city to keep him alive. Glassier lineage (ice, polar people).
Appearance: fair skin, long straight silver hair, eyes entirely pale light blue. Fine frost patterns on her fingertips
and on her clothes.
Silhouette: slender and upright, chin slightly raised, composed hands.
Clothing: tailored long coat in cold white with ice-blue details, elegant high-quality fabric, not armor.
Signature color: cold white #F4F6F8 and ice blue #8FCBEA (the ice blue is clearly visible, so she never reads as
plain white).
Signature object: a family brooch of cold crystal at her collar. Weapon: a slender rapier with a dark gunmetal blade
and an ornate swept hilt, held elegantly low in her right hand, a thin layer of frost along the blade. Thin wisps of
cold mist and a few small ice crystals forming around her free hand.
Expression: proud and slightly annoyed, one brow raised, a sharp half smile; the look of someone who says exactly
what she thinks.
```

### Nox · `nox.png`

**Ficha do usuário:** a **mais rápida da CORE**, principalmente porque se **move pela sombra**. Muito boa em
**infiltração, furtividade e ataques surpresa**. Consegue **paralisar inimigos segurando-os pela sombra**, e as
**tatuagens do corpo viram sombra**. Carrega **duas adagas especiais** para assassinato e curta distância. Boa em
imobilizar, matar e infiltrar. Personalidade: **quieta**, gosta de **ler** e de ficar no espaço dela; responsável e
muito **gentil**, mas **odeia que invadam o espaço dela**. Gosta muito de **coisas fofas**, mas esconde de todo mundo.
Adora o **silêncio** e observar o **céu estrelado**. Coisa fofa no visual **(decidido)**: um chaveiro pequeno de pelúcia
meio escondido dentro da bolsa da cintura.

Classe no seed: **Executora**, sombra (linhagem Hyperion: tatuagens de ancoragem).

```
Character: Nox, adult woman, petite (clearly an adult, not a child). Spy and assassin of the Hyperion lineage
(shadow manipulation). The fastest member of CORE: she moves through shadows. Infiltration, stealth, surprise
attacks; she paralyzes enemies by seizing their shadows. Quiet, loves reading, silence and watching the starry sky;
responsible and very kind, but hates anyone invading her space. Secretly loves cute things and hides it from
everyone.
Appearance: shoulder-length black hair with strands hiding part of her face, attentive eyes, thin dark geometric
tattoos on her forearms and neck.
Silhouette: small and slightly hunched, shoulders turned inward.
Clothing: black hooded stealth jacket with purple details, fitted layers, soft boots, small pouches.
Signature color: black and purple #6A2C91 (rim light in purple so she does not disappear).
Signature object: two special assassination daggers with short dark gunmetal blades, one in each hand held in
reverse grip, low and ready. A small worn notebook of drawings and maps tucked into a pouch at her hip, and a tiny
cute plush keychain half hidden inside that pouch. Along one
forearm, the tattoo lines blur and smoke softly into darkness, as if turning into shadow.
Expression: neutral and attentive, with a spark of curiosity at something new.
```

### Gaia · `gaia.png`

**Ficha do usuário:** o **suporte do grupo pela terra**, tanto na defesa quanto no ataque; o grande **controle em área**
permite isso. Carrega um **cajado forjado por membros da família dela** (exceção às armas do Drev Kovarik). Luta a
**média distância**, sempre **influenciando o terreno** e criando vantagens. A **mais gentil e empática**: odeia guerra
e morte, sempre otimista, tenta ver o melhor das pessoas.

Classe no seed: **Suporte** (era Guardiã), terra. As placas de pedra no antebraço saíram para o cajado
ser o objeto marcante; a terra aparece como pedrinhas flutuando na ponta do cajado **(decidido)**.

```
Character: Gaia, adult woman, Carmesin's best defender and the heart of CORE; she supports the squad through earth,
both defensively and offensively, shaping the terrain to create advantages. The kindest and most empathetic member:
she hates war and death, stays optimistic and tries to see the best in people; she consciously chooses hope.
Appearance: medium brown skin (mixed-race), brown hair in a loose braid, soft face, simple clothes with natural
details (a leaf, a flower, woven plant fiber).
Silhouette: rounded and welcoming, open and solid stance, someone who comes close to people.
Clothing: simple layered clothes in earth tones with plant-fiber details, sturdy boots.
Weapon: a tall staff forged by her own family, dark gunmetal with fine engraved lines and warm stone inlays, wrapped
with plant fiber near the grip, held upright in her right hand; a few small pebbles and grains of soil float near
its head (earth).
Signature color: earth tones, warm soil brown #7A5A3A and clay #A0704A, with small touches of living green.
Signature object: a small talisman of dried plants on a cord around her neck, kept since before the war.
Expression: a genuine smile, but her eyes show she knows what the world is.
```

### Kara · `kara.png`

**Ficha do usuário:** **progressista**, com uma visão clara do mundo que deseja; sempre **afrontosa** e vai para o
combate, mas muito **amorosa com os seus**. Discute bastante com o Ecko pelas visões de mundo diferentes, mas é **em
quem ela mais confia**. Poderes de **ilusão**, muito mais de **suporte**: deixa os inimigos **confusos e perdidos** e
**aumenta a moral** das tropas. Também consegue pôr uma ilusão dentro da mente de alguém, fazendo a pessoa **sonhar
acordada**. Luta **corpo a corpo**, com ilusões e truques para vencer. Carrega uma **lança**.

Classe no seed: **Suporte**, ilusão. Cabelo **(decidido)**: escuro, preso. O espelho de mão da ficha
anterior virou um espelho pequeno pendurado no cinto, para a lança ocupar as mãos **(decidido)**.

```
Character: Kara, adult woman, CORE's "older sister": illusion, interrogation and strategy. Progressive, with a clear
vision of the world she wants; defiant and confrontational, always the first into the fight, yet deeply loving with
her own people. She argues often with Ecko over their different views, but he is the one she trusts most. She dreams
of civilization, not only victory.
Appearance: elegant and organized, dark hair neatly pinned up, a gaze that sweeps the room looking for who is not okay.
Silhouette: fluid, with long flowing fabrics (a sash, long coat tails) that seem to move.
Clothing: refined emerald green long coat with flowing tails over fitted clothes.
Signature color: emerald green #138A5E.
Weapon: a long spear with a dark gunmetal leaf-shaped blade with fine engraved lines, held upright beside her; the
air around the spearhead shimmers with a faint distortion, as if the blade were in two places at once (illusion).
Signature object: a small ornate mirror hanging from her belt.
Expression: confident and defiant, a slight challenging smile, warmth behind her eyes.
Background exception: if a transparent background is impossible, use flat solid magenta #FF00FF instead of green.
```

### Tyir Ossvald · `tyir-ossvald.png`

**Ficha do usuário:** o **mais experiente** da CORE. A variante de **ossos** dá a ele uma proteção invejável. A **curta
distância** é o maior poder ofensivo dele, mas as maiores qualidades são a **defesa** e principalmente a
**inteligência tática**. Antes da CORE era um **comandante muito respeitado**, considerado genial e disruptivo.
Personalidade de **redenção**: a última nação dele foi dizimada numa guerra contra outra bem mais forte; era o
esperado, mas ele ainda se culpa e tenta se redimir na CORE com o Ecko. Se vê no Ecko mais novo e não quer deixá-lo
cometer os mesmos erros: é **quase um pai para o Ecko**. Carrega uma **maça** de guerra.

Classe no seed: **Tático**, ossos (era "Resistência"). Cabelo **(decidido)**: grisalho. Ossos no visual **(decidido)**:
placas de osso cor de marfim saindo pelos nós dos dedos e pelo antebraço, para não confundir com a pedra da Gaia nem
com a pele endurecida do Kael.

```
Character: Tyir Ossvald, man around 55, the oldest and most experienced member of CORE, master of war strategy; once
a highly respected commander, considered brilliant and disruptive. His last nation was wiped out in a war against a
far stronger one; it was expected, but he still blames himself and seeks redemption in CORE. He sees his younger self
in Ecko and is almost a father to him. "Victory without humanity is worth nothing."
Appearance: stubble, wrinkles, graying hair, rumpled clothes.
Silhouette: heavy, drooping shoulders, relaxed, yet the stance hints he can switch to war mode in an instant.
Clothing: rumpled gray officer's coat, gray layers, an old map case at the hip; everything leans to gray.
Signature color: gray #7D838A.
Signature object: an old chipped mug in one hand, the coffee about to spill. In the other hand, a heavy flanged war
mace of dark gunmetal with fine engraved lines, resting on his shoulder. Ivory-white bone plates emerge from the
skin over the knuckles and along the forearm of the mace hand (bone manipulation).
Expression: the gentle tiredness of a kind uncle, eyes that harden when he gets serious.
```

### Isis Maccarthy · `isis-maccarthy.png`

**Ficha do usuário:** a **artilharia aérea** da CORE. A telecinese é absurda e cobre uma grande área do céu. Muito forte
em **combate aéreo e a distância**, mas **fraca no corpo a corpo**. A arma é uma **liga de metal** que ela esculpe na
forma que quiser: com a telecinese muda a forma e ataca de jeitos diferentes. Personalidade **moleca**, sempre se
divertindo e arrumando problema, sempre animada, rindo muito, **extrovertida**.

Classe no seed: **Artilharia**, telecinese. Óculos de aviador **(decidido)**. Liga no visual **(decidido)**:
uma massa de metal líquido flutuando acima da mão, mudando de forma (meio esfera, meio lâminas).

```
Character: Isis Maccarthy, young adult woman, CORE's aerial artillery: her telekinesis is absurd and can cover a huge
area of the sky. Deadly in aerial and long-range combat, weak in close quarters. A tomboy and a troublemaker, always
having fun, laughing a lot, extroverted and full of energy; she lives for Ecko's approval.
Appearance: red hair, wild and messy, slightly disheveled clothes, aviator goggles on her head.
Silhouette: small and full of movement, always leaning forward.
Clothing: orange cropped jacket over mismatched layers.
Signature color: orange #F07A1A.
Signature object: a bracelet of braided cord on her wrist, a gift from a CORE member. Her weapon: a mass of dark
gunmetal metal alloy floating above her open hand, held by telekinesis, mid-transformation, half a smooth liquid
sphere and half sharp blades and spikes reshaping in the air.
Expression: a wide mischievous grin, mid-laugh, the emotion of the moment written all over her face.
```

### Tank Valen · `tank-valen.png`

**Ficha do usuário:** muito **esforçado**. Por não ter nascido com variante, se esforça mais que qualquer um. Foi muito
**menosprezado**, então sempre acha que precisa se esforçar mais que todos para ser **digno de ficar na CORE**. É
sempre **respeitoso com todos**, mas tem uma **idolatria pelo Ecko**, por ele ter escolhido o Tank para a CORE e pela
força que demonstra.

Classe no seed: **Guardião**. **Sem variante** (só DOM): o único sem nenhum efeito de poder.

```
Character: Tank Valen, young man around 18, the youngest member and the future of CORE. He has no power at all; he
is a prodigy of pure human potential. Long underestimated, he trains harder than anyone to feel worthy of his place in
CORE. Humble, disciplined, always respectful to everyone; he idolizes Ecko, who chose him for CORE.
Appearance: brown hair, body built by training, calloused hands, marks of effort.
Silhouette: compact and solid, low wide base, guard stance of someone who can take weight.
Clothing: simple training clothes in beige, sleeveless top, worn pants and boots.
Signature color: beige #D9C3A0.
Signature object: bandaged wrists and patched training gloves.
Important: no power effects, no glow, no particles; he is pure human effort.
Expression: focused and determined, humble, the look of someone who still has to prove himself.
```

### Rolf Eidvar · `rolf-eidvar.png`

**Ficha do usuário:** atirador **cego**: se localiza **vendo as almas** dos inimigos. É o **ataque de longa distância**
da CORE, um atirador nato com um **rifle de precisão**, totalmente focado em letalidade a distância. Consegue **imbuir a
própria alma nas balas**, que saem muito mais fortes e destrutivas. Personalidade **calma e serena**; por **pecados
antigos** sempre coloca a própria vida em segundo lugar, sempre **disposto ao sacrifício**, e carrega essa culpa
notória no seu cerne.

Classe no seed: **Atirador**, alma. Bandana **(decidido)**: tecido branco quente, igual ao casaco.
Bala com alma no visual **(decidido)**: um cartucho com brilho branco quente fraco, que ele limpa com o lenço.

```
Character: Rolf Eidvar, adult man, CORE's long-range attacker, tracker and scout; a born sniper. He is blind: he
locates enemies by seeing their souls, not through sight. He can imbue his own soul into his bullets, making them far
more destructive. Calm and serene, obsessed with cleanliness; burdened by old sins, he always puts his own life
second and is always ready to sacrifice himself, the guilt visible at his core.
Appearance: blond hair neatly combed, a clean warm white cloth blindfold tied over his eyes, the knot at the back of
his head, the eyes never visible. Impeccable, spotless clothes, hands too well kept.
Silhouette: tall and thin, slow measured posture.
Clothing: immaculate warm white long coat with light tactical straps, a long dark gunmetal precision sniper rifle
with a scope slung on his back.
Signature color: warm white #F2EFE8 (no blue at all, so he never reads like Sunna).
Signature object: a white handkerchief in his hands, carefully wiping a single rifle cartridge that glows with a
faint warm white light (his soul imbued into the bullet).
Expression: a sad peace, head slightly tilted as if listening, someone who weighs every word.
```
