# ORIGIN — Briefing de Personagem

> Ponto de partida da **conversa sobre personagem**: o que um personagem tem, como evolui e como isso conversa com
> as skills. Skills em [`skills_brief.md`](./skills_brief.md). Regras do jogo em [`game_design.md`](./game_design.md).
>
> Convenções: **[ENRAIZADO]** = decidido, não reabrir sem motivo forte · **[PROPOSTA]** = sugerido, falta confirmar ·
> **[ABERTO]** = a decidir.

---

## 1. Anatomia do personagem [ENRAIZADO]

```
identidade   nome, linhagem, variante(s) (1, 2 ou 3), família/facção (lore)
nível        0 a 100 + XP
stats        base do personagem + crescimento por nível + pontos livres (ver 3)
traços       até 5 (skills_brief 10.1)
skills       liberadas por nível → build de 4 (skills_brief 10.5)
histórico    métricas que liberam traços (abates, dano mitigado...)
extras       despertar, arma viva, contrato (depois)
```

---

## 2. Stats [ENRAIZADO]

São **7**:

| Stat | Função | Ligação |
|---|---|---|
| **HP** | Vida | Custo da Fundamental (HP máximo) |
| **Ataque** | Escala o dano das skills | Base da fórmula de dano |
| **Defesa** | Reduz o dano recebido | Custo da Material; força do Defender |
| **Velocidade** | Fila em timeline | D30 |
| **Precisão** | Chance de acertar e de aplicar status | Custo da Psíquica e da Vetorial |
| **Esquiva** | Contraparte da precisão | Disputa com a Precisão |
| **Vontade** | Resiste a status e debuffs | Contra-jogo para controle; custo da Biológica |

- **Um único Ataque.** Não há separação físico x variante: os traços diferenciam pelo tipo de skill.
- **Sem mana.** O custo das skills é o Desgaste em stats (skills_brief 9.4).
- **Custo da Biológica:** **Vontade** (sobrecarga metabólica deixa o corpo vulnerável a status). **[PROPOSTA]**
  Alternativa: reduzir a cura recebida.
- Fórmula de dano e valores numéricos: **[ABERTO]**.

---

## 3. Distribuição de stats [ENRAIZADO]

Problema: distribuição livre deixa um personagem feito para defender virar tank e atacante ao mesmo tempo.

Solução: **pontos livres limitados às aptidões**.

- **Base fixa** pelo perfil do personagem: a maior parte do poder (~85%).
- Cada personagem tem **3 aptidões**: os únicos stats que recebem pontos livres (ex.: tank = HP, Defesa, Vontade).
- **Pontos livres** (~15% do total) vão só para as aptidões, com **teto por stat**.
- **Os pontos crescem com o nível** (ex.: 1 ponto a cada 3 níveis). No ranqueado, todos têm a mesma quantidade
  (nivelamento, seção 4).
- **Redistribuição grátis fora da batalha**, como a build de skills.

O jogador escolhe *que tipo* de tank quer, mas o tank nunca vira atacante. Aptidões e teto são definidos por
personagem (dados do admin). **[ABERTO]** Valores exatos (%, teto, ritmo de ganho).

---

## 4. Nível [ENRAIZADO]

- Vai de **0 a 100**.
- Cada nível dá **crescimento de stats** seguindo o **perfil** do personagem (tank cresce mais em HP e Defesa).
- **Skills liberadas em marcos** de nível (ex.: 1, 10, 25, 40, 60, 80, 100; marcos exatos **[ABERTO]**).
- **PvP (opção C):** no **ranqueado**, todos são **nivelados** para o mesmo nível (ex.: 100); o nível real só libera
  skills, e a vantagem de quem joga mais fica nos traços e nas opções de build. No **casual e no PvE**, vale o nível real.

---

## 5. Traços [ENRAIZADO]

Complementa skills_brief 8.4 e 10.1.

- **Bônus moderado:** é um diferencial, nunca o que decide a partida. Tamanho varia por traço.
- **Traços podem ter lado negativo** (ex.: **Berserker**: +dano corpo a corpo, -defesa). Segue o risco x retorno.
- **Categorias** (o campo de batalha pode pedir uma categoria inteira):
  - **Combate:** Guerreiro, Artista Marcial...
  - **Postura:** Furtivo, Tank...
  - **Origem:** Sobrevivente, Veterano...
- **Sem traço de nascença:** todos os 5 slots são conquistados.

---

## 6. Despertar [ENRAIZADO]

- Evolução da variante (ex.: fogo → fogo azul). **Não pode ser algo que qualquer personagem consiga.**
- As três regras valem juntas:
  1. **Só alguns personagens têm despertar.** Está na ficha desde a criação; a maioria nunca desperta.
  2. **Exige nível alto + evento único** (missão de história, chefe). Títulos **aumentam a chance**, não garantem.
  3. **Despertar tem custo:** a skill despertada é mais forte e o Desgaste também sobe (risco x retorno).
- **[ABERTO]** Nível mínimo, quais eventos, o que exatamente muda nas skills.

---

## 7. Pendências

1. Fórmula de dano e valores dos stats.
2. Valores da distribuição de stats (seção 3).
3. Confirmar o custo da Biológica (Vontade x cura recebida).
4. Marcos de liberação de skill.
5. Despertar: nível mínimo, eventos e o que muda nas skills (seção 6).
6. Arma viva e contrato com animal (skills_brief 10.6).
