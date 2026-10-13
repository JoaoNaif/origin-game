# ORIGIN — Despertar (brief)

> Regras do despertar no jogo, decididas na conversa de pontos abertos. Decisões em `game_design.md` (D49 ajustado,
> D67). Lore em [`world_build.md`](./world_build.md) 3.2 e 5. Personagem em [`character_brief.md`](./character_brief.md) 6.
> **[ENRAIZADO]** = decidido · **[PLACEHOLDER]** = número provisório · **[ABERTO]** = a decidir.

---

## 1. O que é [ENRAIZADO]

- **Evolução da variante**: fogo vira fogo azul ou plasma (mais quente que o fogo comum).
- **Um único despertar** por personagem. **Não há estágios** no jogo.
- O efeito aparece nas **skills**: o personagem passa a ter skills da nova variante, **mais fortes que as base**.
  São skills raras, que a maioria dos personagens não tem.
- Segue o D52: skill despertada é mais forte e tem **mais Desgaste**.
- Vale no ranqueado (D56).

## 2. Quem pode [ENRAIZADO]

- **Todos podem, nada garante.** Depende de o **admin ter criado um despertar** para a variante (ex.: fogo tem;
  raio não tem ainda, e pode ganhar numa atualização). Não é uma característica do personagem em si.
- A variante pode ter **mais de um despertar** (fogo: azul e plasma).
- **Só personagens com exatamente 1 variante** podem despertar (seção 3.4).
- O sentido do lore (`world_build.md` 3.2 "≥95% de sincronização" e 5 "estágios dos Primordiais") **é só flavor**.
  No jogo vale esta regra única. A identidade visual do despertar dos Primordiais (cor, pressão, camada, alcance)
  é a forma narrativa dele.

## 3. Como acontece [ENRAIZADO]

Processo todo **oculto** ao jogador ("no escuro"):

1. **Gatilho:** o personagem chega ao **nível 80** (valor fechado por ora, ajustável).
2. **Elegibilidade:** o sistema olha se a variante tem despertar. Se não tem, nada acontece.
3. **Sorteio:** se a variante tem mais de um despertar (quantos, o admin define), o sistema **sorteia**. Cada
   despertar tem uma **chance**, e ela sobe quando combina com os **melhores stats** do personagem (ex.: forte em
   dano, o despertar de dano tem chance maior). Nunca garantido. Com um só, é ele.
4. **Missões ocultas:** definido o despertar, o sistema abre **missões que o jogador não vê**, ligadas ao perfil
   do despertar e **diferentes de personagem para personagem**, para não ficar óbvio como conseguir (ex.:
   "abater 1000 inimigos", "uma partida com mais de 5000 de dano").
5. **Liberação:** cumpridas as missões, o despertar é desbloqueado e as skills entram no pool do personagem.

**Skills do despertar:** quantas existem é o admin quem cria, e são **liberadas por nível**, como as demais skills
(D46). Não há quantidade fixa na regra.

### 3.1 Fórmula do sorteio [ENRAIZADO]

Funciona para qualquer quantidade de despertares (2, 3, 4...).

1. Cada despertar tem um **perfil**: 2 a 3 requisitos de stat ("Ataque alto", "Precisão alta"), na mesma lógica do
   elo do equipamento vivo (alto/baixo relativo ao próprio personagem, `living_gear_brief.md` 4.1).
2. **Afinidade** `a` do despertar com o personagem = fração dos requisitos que ele cumpre (de 0 a 1).
3. **Peso** do despertar = `1 + 0,5 × a`.
4. **Chance** = peso do despertar ÷ soma dos pesos de todos os despertares da variante.

Efeito: o despertar mais compatível tem **no máximo 1,5x** a chance do menos compatível, qualquer que seja o número
de despertares, e **nenhum** fica com chance zero.

| Despertares | Mais compatível (a=1), os demais (a=0) |
|---|---|
| 2 | 60% / 40% |
| 3 | 43% / 29% / 29% |
| 4 | 33% / 22% / 22% / 22% |

O fator `0,5` é o valor a ajustar para deixar o sorteio mais ou menos previsível **[PLACEHOLDER]**.

### 3.2 Regras de apoio [ENRAIZADO]

- As **missões** vêm do mesmo perfil do despertar sorteado.
- **O que conta:** PvP e PvE; **amistosa não conta** (D54), para evitar farm combinado.
- **Servidor decide:** sorteio e progresso das missões ficam no servidor (D33).
- **Sangue puro** (D65): **missões mais leves** (limiares menores, por exemplo -30% **[PLACEHOLDER]**). A chance do
  sorteio é a mesma.

### 3.3 Dica de proximidade [ENRAIZADO a ideia]

O jogador **não vê** o despertar sorteado nem as missões, mas recebe uma **dica qualitativa** de que está perto:

| Estado | Quando | O que mostra |
|---|---|---|
| **Silêncio** | Antes do nível 80, ou sem nenhuma missão cumprida | Nada |
| **Sinais** | Cumpriu cerca de 1/3 das missões | Aviso vago de que "algo desperta" |
| **Iminente** | Cumpriu cerca de 2/3 das missões **[PLACEHOLDER]** | Aviso de que está perto |

A dica **não revela** qual despertar nem quais missões faltam.

### 3.4 Quem não desperta [ENRAIZADO]

- **Só quem tem exatamente 1 variante.** Na lore, **2 e 3 variantes não conseguem despertar.**
- **Sem variante** também não (não há o que evoluir).
- Isso é o contrapeso natural do D52: mais variantes dão mais opções e custam mais **e** fecham o despertar.

## 4. No ranqueado [ENRAIZADO]

- O despertar vale (D56), mas o ranqueado nivela por faixa (D63): numa faixa com nível **abaixo do mínimo do
  despertar**, o personagem **não usa** as skills despertadas. Em faixas altas (ex.: platina, nível 100) vale pleno.
- **Razão:** liberar tudo desde o início faz o jogador novo não entender o jogo nem por que perde, e sair. As faixas
  baixas ensinam o jogo por camadas e as altas liberam o resto.

## 5. Pendências

1. **Catálogo** (admin): quais despertares cada variante tem e o perfil de cada um.
2. **Modelo das missões** (admin): quais tipos existem por perfil, como variam por personagem, limiares e anti-farm.
3. Ajuste do fator `0,5` da fórmula, do -30% do sangue puro e dos limites da dica (placeholders).
