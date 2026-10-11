# ORIGIN — Briefing de Personagem

> Ponto de partida da **conversa sobre personagem**: o que um personagem tem, como evolui e como isso conversa com
> as skills. Skills em [`skills_brief.md`](./skills_brief.md). Regras do jogo em [`game_design.md`](./game_design.md).
>
> Convenções: **[ENRAIZADO]** = decidido, não reabrir sem motivo forte · **[PROPOSTA]** = sugerido, falta confirmar ·
> **[ABERTO]** = a decidir · **[CONVERSA PRÓPRIA]** = adiado de propósito, será discutido separado (seção 9).

---

## 1. Anatomia do personagem [ENRAIZADO]

```
identidade   nome, linhagem, variante(s) (1, 2 ou 3), classe (tank, suporte...), família/facção (lore)
nível        0 a 100 + XP
stats        base + crescimento gradual por nível + pontos livres só nas aptidões da classe (ver 3)
traços       até 5 (skills_brief 10.1)
títulos      pertencem ao personagem (ver 6)
skills       kit básico da variante desde o nível 0 + liberadas por nível → build de 4 (skills_brief 10.5)
histórico    métricas de batalha que liberam traços e dão XP (ver 7)
extras       despertar (ver 6); DOM (ver dom_brief.md); arma viva, contrato (conversa própria, ver 9)
```

---

## 2. Stats [ENRAIZADO]

São **7**:

| Stat | Função | Ligação |
|---|---|---|
| **HP** | Vida | Custo da Fundamental (HP máximo) e da Elemental (HP atual) |
| **Ataque** | Escala o dano das skills | Base da fórmula de dano |
| **Defesa** | Reduz o dano recebido | Custo da Material; força do Defender |
| **Velocidade** | Fila em timeline | D30 |
| **Precisão** | Chance de acertar e de aplicar status | Custo da Vetorial |
| **Esquiva** | Contraparte da precisão | Disputa com a Precisão; custo da Biológica |
| **Vontade** | Resiste a status e debuffs | Contra-jogo para controle; custo da Psíquica |

- **Um único Ataque.** Não há separação físico x variante: os traços diferenciam pelo tipo de skill.
- **Sem mana.** O custo das skills é o Desgaste em stats, **um stat por linhagem** (skills_brief 9.4, D59). Ataque
  e Velocidade não são custo de nenhuma linhagem.
- **Piso do Desgaste [ENRAIZADO]:** cada stat tem um **mínimo durante a batalha**; o Desgaste nunca leva o stat
  abaixo dele (o usuário não se mata nem zera a própria Defesa por custo). Valores dos pisos **[ABERTO]**.
- **Acerto [ENRAIZADO o princípio]:** conta a **Precisão de quem ataca contra a Esquiva de quem defende**. Precisão
  baixa tem menos sucesso contra Esquiva alta; Precisão alta acerta com facilidade contra Esquiva baixa. A regra é
  **a mesma para skill individual e de área**. Fórmula **[ABERTO]**.
- **O que a Vontade resiste** (só aplicação de status, ou também controle/empurrão): **[ABERTO]**.
- Fórmula de dano e valores numéricos: **[ABERTO]**.

---

## 3. Distribuição de stats [ENRAIZADO]

Problema: distribuição livre deixa um personagem feito para defender virar tank e atacante ao mesmo tempo.

Solução: **pontos livres limitados às aptidões da classe**.

- **Todos os stats crescem gradualmente** a cada nível, seguindo o perfil da classe (tank cresce mais em HP e Defesa).
- **Em alguns níveis** o personagem ganha **pontos livres** (quais níveis e quantos: **[ABERTO]**).
- Cada classe tem **3 aptidões**: os únicos stats que aceitam pontos livres (ex.: tank = HP, Defesa, Vontade). Há
  **teto por stat**. O tank **nunca** coloca ponto livre em Ataque.
- O jogador escolhe *que tipo* de tank quer, mas o tank nunca vira atacante.
- **Redistribuição grátis fora da batalha**, como a build de skills.
- No **ranqueado** todos têm a mesma quantidade de pontos (nivelamento, seção 4).
- Aptidões e teto são definidos por classe/personagem (dados do admin).
- Stat final = **base fixa + crescimento por nível + pontos livres**. As proporções (ex.: ~85% base / ~15% livres, que
  eram exemplo), o teto e o ritmo de ganho são **[ABERTO]**.

---

## 4. Nível [ENRAIZADO]

- Vai de **0 a 100**.
- **Kit básico desde o nível 0:** cada variante tem **skills default** (básicas) que o personagem já tem ao nascer.
  Seguem o risco x retorno: custo baixo, ganho baixo. Não existe ataque básico grátis (D38). O kit pode ser
  **padronizado**: igual, com o mesmo dano, para todos os personagens da mesma classe. Quantas skills tem o kit:
  **[ABERTO]**.
- Cada nível dá **crescimento de stats** (seção 3).
- **Skills novas liberadas em marcos** de nível (ex.: 10, 25, 40, 60, 80, 100; marcos exatos **[ABERTO]**).
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
- **Vantagem de quem tem mais traços é aceita**, inclusive no ranqueado e nos bônus de campo (que exigem traços).
  Quem leva personagem sem traços para o ranqueado sabe que está em desvantagem.

---

## 6. Despertar e aprimoramento [ENRAIZADO]

- **Aprimoramento** é o gênero: formas de evoluir o personagem além do nível. **Despertar** é uma delas; as outras
  (DOM, fechado em [`dom_brief.md`](./dom_brief.md); armas vivas, conversa própria na seção 9).
- **Despertar** = evolução da variante (ex.: fogo → fogo azul). **Não pode ser algo que qualquer personagem consiga.**
- As regras valem juntas:
  1. **Só alguns personagens têm despertar.** Está na ficha desde a criação; a maioria nunca desperta.
  2. **Exige nível alto + evento único** (missão de história, chefe). **Títulos** (do personagem) **aumentam a
     chance**, não garantem.
  3. **Mais poder = mais custo:** a skill despertada é mais forte e o Desgaste também sobe (risco x retorno).
  4. **Vale no ranqueado.** O equilíbrio vem do custo da regra 3.
- **[ABERTO]** Nível mínimo, quais eventos, o que exatamente muda nas skills.

---

## 7. XP e histórico [ENRAIZADO o princípio]

- O XP vem de **batalhas**, medido por **métricas de contribuição**, não só por abates: dano causado, dano mitigado
  (tankar), cura, abates etc. O mesmo histórico alimenta as metas de traço.
- **Classes diferem no ritmo:** suporte sobe mais devagar que as demais. Isso é aceito como natural do gênero.
- **O que conta:** batalhas **contra a máquina (PvE)** e **PvP** contam. **Amistosa (contra amigo) não conta** para
  XP nem para histórico (evita farm combinado).
- **[ABERTO]** Fórmula, peso de cada métrica e curva de XP por nível; como compensar a desvantagem do suporte sem
  virar farm.

---

## 8. Mais variantes, mais custo [ENRAIZADO o princípio]

- Ter **2 variantes** (ou 3, raríssimo) dá **mais opções e variações** de skill, mas **com mais custo**: ex.: a
  skill passa a gerar **2 Desgastes**. Segue a mesma lógica do despertar: mais poder, mais custo.
- **[ABERTO]** Como exatamente o custo extra se aplica, e se vale para toda skill ou só para as combinadas.

---

## 9. Conversas próprias (adiadas de propósito)

Cada uma é complexa o bastante para uma conversa só dela. **Lembrar o usuário de abrir estes assuntos.** Detalhes,
lore existente e perguntas em [`open_topics.md`](./open_topics.md).

1. **Arma viva e contrato com animal** (skills_brief 10.6). Incluir: o companheiro ocupa célula, bloqueia, pode ser
   alvo? A arma ocupa um dos 4 slots ou adiciona um? Mexe no D11.
2. ~~**DOM**~~ fechado (`dom_brief.md`). Caminhos alternativos (Pacto, Materiais, Enxerto, Rede, Selo) seguem
   adiados.
3. **Família/facção com efeito mecânico.** Existe na história e o usuário quer levar para o jogo, mas ainda não sabe
   como equilibrar. Conversa própria.

---

## 10. Pendências

1. Fórmula de dano e valores dos stats; fórmula de acerto (Precisão x Esquiva); pisos do Desgaste.
2. Valores da distribuição de stats (seção 3): níveis que dão ponto livre, teto, proporção.
3. ~~Custo da Biológica, Psíquica e Elemental~~ → fechado (skills_brief 9.4).
4. Marcos de liberação de skill e tamanho do kit básico (seção 4).
5. Despertar: nível mínimo, eventos e o que muda nas skills (seção 6).
6. XP: fórmula, pesos das métricas, curva (seção 7).
7. Custo extra de 2 ou 3 variantes (seção 8).
8. Conversas próprias da seção 9.
