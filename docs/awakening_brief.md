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
- **Só personagens com exatamente 1 variante** podem despertar (seção 3.2).
- O sentido do lore (`world_build.md` 3.2 "≥95% de sincronização" e 5 "estágios dos Primordiais") **é só flavor**.
  No jogo vale esta regra única. A identidade visual do despertar dos Primordiais (cor, pressão, camada, alcance)
  é a forma narrativa dele.

## 3. Como acontece [ENRAIZADO]

Processo todo **oculto** ao jogador ("no escuro"):

1. **Gatilho:** o personagem chega ao nível mínimo **[PLACEHOLDER: 80]**.
2. **Elegibilidade:** o sistema olha se a variante tem despertar. Se não tem, nada acontece.
3. **Sorteio:** se tem mais de um, o sistema **sorteia com pesos**. Os pesos favorecem o despertar que **combina com
   os melhores stats** do personagem (ex.: forte em dano, plasma de dano recebe mais peso). Nunca garantido.
4. **Missões ocultas:** definido o despertar, o sistema abre **missões que o jogador não vê**, ligadas ao perfil
   dele (ex.: "abater 1000 inimigos", "uma partida com mais de 5000 de dano").
5. **Liberação:** cumpridas as missões, o despertar é desbloqueado e as skills entram no pool do personagem.

### 3.1 Regras de apoio [ENRAIZADO]

- **Cada despertar tem um perfil** (dano, defesa, controle, cura...) com pesos por stat, na mesma lógica do elo do
  equipamento vivo (alto/baixo relativo ao personagem, `living_gear_brief.md` 4.1).
- As **missões** vêm do mesmo perfil do despertar sorteado.
- **O que conta:** PvP e PvE; **amistosa não conta** (D54), para evitar farm combinado.
- **Servidor decide:** sorteio e progresso das missões ficam no servidor (D33).
- **Sangue puro** (D65): acesso maior, por exemplo **peso maior** ou **missões mais leves** (a definir).

### 3.2 Quem não desperta [ENRAIZADO]

- **Só quem tem exatamente 1 variante.** Na lore, **2 e 3 variantes não conseguem despertar.**
- **Sem variante** também não (não há o que evoluir).
- Isso é o contrapeso natural do D52: mais variantes dão mais opções e custam mais **e** fecham o despertar.

## 4. No ranqueado [ENRAIZADO]

- O despertar vale (D56), mas o ranqueado nivela por faixa (D63): numa faixa com nível **abaixo do mínimo do
  despertar**, o personagem **não usa** as skills despertadas. Em faixas altas (ex.: platina, nível 100) vale pleno.
- **Razão:** liberar tudo desde o início faz o jogador novo não entender o jogo nem por que perde, e sair. As faixas
  baixas ensinam o jogo por camadas e as altas liberam o resto.

## 5. Pendências

1. Nível mínimo final e valores dos pesos.
2. Catálogo de despertares por variante (fogo azul, plasma, ...) e seus perfis.
3. Lista de missões ocultas por perfil e limiares (anti-farm).
4. Como o sangue puro entra (peso x missão mais leve).
5. Quantas skills o despertar traz e como entram nas 4 do D43.
6. Se o jogador recebe alguma dica de que **está** a caminho do despertar (hoje: nenhuma).
