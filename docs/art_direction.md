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
   traço, luz e proporção. A cor do Ecko mudou (era violeta, agora prata): refaça só os detalhes dele no mesmo chat em
   que ele foi feito, pedindo "mesmo personagem, mesma pose e enquadramento; troca todos os detalhes violeta por prata;
   o efeito na lâmina vira um brilho prateado frio".
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

Executor, antimatéria. Arma **(decidido)**: lâmina curta e reta, preta fosca, com a borda distorcendo a luz em brilho
prateado.

```
Character: Ecko Nocthar, adult man, commander and founder of CORE. Absolute control on the outside, silent instability
inside; he leads by inevitability.
Appearance: medium brown skin, mixed-race, almost Latino features. Short neat black hair. A gaze that evaluates before
speaking; never looks relaxed.
Silhouette: tall and contained, firm shoulders, no wasted gestures, arms close to the body.
Clothing: long fitted black coat with a high collar over dark tactical layers, small silver details and trims.
Signature color: black with silver #C0C6CC (rim light in cold silver).
Signature object: his personal weapon, a matte black short straight blade held low in his right hand; along its edge
the light bends with a faint cold silver distortion (antimatter). It looks heavy, as if few are allowed to hold it.
Expression: total calm, jaw slightly clenched.
```

### Lucky · `lucky.png`

Atirador, relâmpago e tempo. Arma **(decidido)**: revólver de cano longo no coldre; faíscas azuladas na mão livre.

```
Character: Lucky, young man around 20, charismatic, light and protective; a hero tired of being a symbol. Ecko's
relative: the same black hair.
Appearance: fair skin, black hair like Ecko's (slightly messier), open face.
Silhouette: athletic and light, weight on the front foot, always about to move.
Clothing: dark royal blue jacket over tactical gear, sleeves rolled up.
Signature color: dark royal blue #1F3A93.
Signature object: a worn, frayed blue cloth band tied around his left upper arm, a symbol for others.
A long-barreled revolver in a hip holster; tiny blue-white electric sparks crackle between the fingers of his free hand.
Expression: easy smile, but his eyes drift away, far off, as if no one is watching.
```

### Kael · `kael-vaz.png`

Vanguarda, explosão e endurecimento (skills de soco). Arma **(decidido)**: manoplas de aço.

```
Character: Kael, adult man, CORE's right hand. Military discipline in constant war; he fears being useless more than
dying.
Appearance: very tall and strong, viking-like, blond hair, full thick beard, war scars on his face and arms.
Silhouette: broad and square, like a shield standing upright, feet planted wide; clearly the biggest of the squad.
Clothing: heavy military coat with a fur-lined collar, rugged and practical, steel plates on shoulders and forearms;
no fantasy armor, no horned helmet.
Signature color: yellow #E8B923 (deep warm yellow, not neon).
Signature object: an old military dog tag on a chain over his chest, worn from use. Heavy steel gauntlets on both
fists, a faint heat haze near the knuckles (explosive punches).
Expression: furrowed brow, the look of someone who never left the war.
```

### Derik · `derik-okoro.png`

Vanguarda, DOM do corpo e regeneração. Sem arma: luta com o corpo.

```
Character: Derik, adult man, CORE's left hand and the group's clown; the one who cannot be killed (regeneration).
Appearance: Black man, hair in braids, loose and sloppy clothes, a few scars that look already healed.
Silhouette: slouched and relaxed, loose shoulders, one hand in a pocket, the other always busy.
Clothing: oversized dark red jacket open over a loose shirt, cargo pants, rolled sleeves.
Signature color: dark red #8B1A1A.
Signature object: a coin he flips across his knuckles without noticing. No weapon: he fights with his body.
Expression: a constant crooked smile; when it disappears, everyone notices.
```

### Sunna Glassier · `sunna.png`

Controladora, gelo (linhagem Glassier, povo polar). Sem arma: gelo na mão.

```
Character: Sunna Glassier, adult woman, the strongest woman of Carmesin and the one with the highest power control in
CORE. Elegant, ironic and controlling. Glassier lineage (ice, polar people).
Appearance: fair skin, long straight silver hair, eyes entirely pale light blue. Fine frost patterns on her fingertips
and on her clothes.
Silhouette: slender and upright, chin slightly raised, composed hands.
Clothing: tailored long coat in cold white with ice-blue details, elegant high-quality fabric, not armor.
Signature color: cold white #F4F6F8 and ice blue #8FCBEA (the ice blue is clearly visible, so she never reads as
plain white).
Signature object: a family brooch of cold crystal at her collar. Thin wisps of cold mist and a few small ice crystals
forming around one hand.
Expression: an ironic half smile, the look of someone who already won the conversation.
```

### Nox · `nox.png`

Executora, sombra (linhagem Hyperion: tatuagens de ancoragem). Arma **(decidido)**: lâmina curta escura na cintura.

```
Character: Nox, adult woman, petite (clearly an adult, not a child). Spy and assassin of the Hyperion lineage
(shadow manipulation). Introspective and curious; she seeks understanding, not power.
Appearance: shoulder-length black hair with strands hiding part of her face, attentive eyes, thin dark geometric
tattoos on her forearms and neck.
Silhouette: small and slightly hunched, shoulders turned inward.
Clothing: black hooded stealth jacket with purple details, fitted layers, soft boots, small pouches.
Signature color: black and purple #6A2C91 (rim light in purple so she does not disappear).
Signature object: a worn notebook full of drawings and maps held against her chest. A short dark blade at her hip.
Expression: neutral and attentive, with a spark of curiosity at something new.
```

### Gaia · `gaia.png`

Guardiã, terra. Defesa **(decidido)**: placas de pedra no antebraço, como escudo natural.

```
Character: Gaia, adult woman, Carmesin's best defender and the heart of CORE; she consciously chooses hope.
Appearance: medium brown skin (mixed-race), brown hair in a loose braid, soft face, simple clothes with natural
details (a leaf, a flower, woven plant fiber).
Silhouette: rounded and welcoming, open and solid stance, someone who comes close to people.
Clothing: simple layered clothes in earth tones with plant-fiber details, sturdy boots, rough stone plates fused along
her left forearm like a natural shield (earth).
Signature color: earth tones, warm soil brown #7A5A3A and clay #A0704A, with small touches of living green.
Signature object: a small talisman of dried plants on a cord around her neck, kept since before the war.
Expression: a genuine smile, but her eyes show she knows what the world is.
```

### Kara · `kara.png`

Suporte, ilusão. Cabelo **(decidido)**: escuro, preso.

```
Character: Kara, adult woman, CORE's "older sister": illusion, interrogation and strategy. She dreams of
civilization, not only victory.
Appearance: elegant and organized, dark hair neatly pinned up, a gaze that sweeps the room looking for who is not okay.
Silhouette: fluid, with long flowing fabrics (a sash, long coat tails) that seem to move.
Clothing: refined emerald green long coat with flowing tails over fitted clothes.
Signature color: emerald green #138A5E.
Signature object: a hand mirror held in one hand, the air around it shimmering with a faint distortion (illusion).
Expression: serene on the outside, a storm kept in her eyes.
Background exception: if a transparent background is impossible, use flat solid magenta #FF00FF instead of green.
```

### Tyir Ossvald · `tyir-ossvald.png`

Tático, resistência física e mental; o mais velho. Cabelo **(decidido)**: grisalho.

```
Character: Tyir Ossvald, man around 55, the oldest and most experienced member, master of war strategy. "Victory
without humanity is worth nothing."
Appearance: stubble, wrinkles, graying hair, rumpled clothes.
Silhouette: heavy, drooping shoulders, relaxed, yet the stance hints he can switch to war mode in an instant.
Clothing: rumpled gray officer's coat, gray layers, an old map case at the hip; everything leans to gray.
Signature color: gray #7D838A.
Signature object: an old chipped mug in one hand, the coffee about to spill.
Expression: the gentle tiredness of a kind uncle, eyes that harden when he gets serious.
```

### Isis Maccarthy · `isis-maccarthy.png`

Artilharia, telecinese, combate aéreo. Munição **(decidido)**: pequenas peças de metal flutuando; óculos de aviador.

```
Character: Isis Maccarthy, young adult woman, telekinesis, aerial and long-range combat. Intense and explosive; she
lives for Ecko's approval.
Appearance: red hair, wild and messy, slightly disheveled clothes, aviator goggles on her head.
Silhouette: small and full of movement, always leaning forward.
Clothing: orange cropped jacket over mismatched layers.
Signature color: orange #F07A1A.
Signature object: a bracelet of braided cord on her wrist, a gift from a CORE member. Several small metal objects
(steel balls, bolts) float around her open hand, held by telekinesis.
Expression: a face too open, the emotion of the moment written on it.
```

### Tank Valen · `tank-valen.png`

Guardião, **sem variante** (só DOM): o único sem nenhum efeito de poder.

```
Character: Tank Valen, young man around 18, the youngest member and the future of CORE. He has no power at all; he
is a prodigy of pure human potential. Humble, disciplined and constant: effort still matters.
Appearance: brown hair, body built by training, calloused hands, marks of effort.
Silhouette: compact and solid, low wide base, guard stance of someone who can take weight.
Clothing: simple training clothes in beige, sleeveless top, worn pants and boots.
Signature color: beige #D9C3A0.
Signature object: bandaged wrists and patched training gloves.
Important: no power effects, no glow, no particles; he is pure human effort.
Expression: focused and humble, the look of someone still learning.
```

### Rolf Eidvar · `rolf-eidvar.png`

Atirador, alma; rastreador e batedor. **Cego**: usa uma bandana sobre os olhos e rastreia pela alma, não pela vista.
Arma **(decidido)**: rifle longo com luneta nas costas. Bandana **(decidido)**: tecido branco quente, igual ao casaco.

```
Character: Rolf Eidvar, adult man, CORE's best tracker and scout. He is blind: he senses people and places through
the soul, not through sight. Gentle, calm, obsessed with cleanliness and driven by guilt.
Appearance: blond hair neatly combed, a clean warm white cloth blindfold tied over his eyes, the knot at the back of
his head, the eyes never visible. Impeccable, spotless clothes, hands too well kept.
Silhouette: tall and thin, slow measured posture.
Clothing: immaculate warm white long coat with light tactical straps, a long scoped rifle slung on his back.
Signature color: warm white #F2EFE8 (no blue at all, so he never reads like Sunna).
Signature object: a white handkerchief in his hands, wiping his fingers.
Expression: a sad peace, head slightly tilted as if listening, someone who weighs every word.
```
