# ORIGIN — Briefing de Personagem

> Ponto de partida da **conversa sobre personagem**: o que um personagem tem, como evolui e como isso conversa com
> as skills. Skills em [`skills_brief.md`](./skills_brief.md). Regras do jogo em [`game_design.md`](./game_design.md).
>
> Convenções: **[ENRAIZADO]** = decidido, não reabrir sem motivo forte · **[PROPOSTA]** = sugerido, falta confirmar ·
> **[ABERTO]** = a decidir · **[CONVERSA PRÓPRIA]** = adiado de propósito, será discutido separado (seção 9).

---

## 1. Anatomia do personagem [ENRAIZADO]

```
identidade   nome, linhagem, variante(s) (1, 2 ou 3), classe (tank, suporte...), família (traço de Origem, ver family_faction_brief.md)
nível        0 a 100 + XP
stats        base + crescimento gradual por nível + pontos livres só nas aptidões da classe (ver 3)
traços       até 5 (skills_brief 10.1)
títulos      pertencem ao personagem (ver 6); título do DOM avançado é campo extra, fora dos 5 traços (dom_brief 8.6)
skills       kit básico da variante desde o nível 0 + liberadas por nível → build de 4 (skills_brief 10.5)
histórico    métricas de batalha que liberam traços e dão XP (ver 7)
extras       despertar (ver 6); DOM (ver dom_brief.md); arma viva (ver living_gear_brief.md), contrato (ver beast_contracts_brief.md)
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
  abaixo dele (o usuário não se mata nem zera a própria Defesa por custo). **Piso = 80%** do stat base (ver `skills_brief.md` 9.4b), no máximo 20% de perda (D91).
- **Acerto [ENRAIZADO o princípio]:** conta a **Precisão de quem ataca contra a Esquiva de quem defende**. Precisão
  baixa tem menos sucesso contra Esquiva alta; Precisão alta acerta com facilidade contra Esquiva baixa. A regra é
  **a mesma para skill individual e de área**. Fórmula **[ABERTO]**.
- **O que a Vontade resiste [ENRAIZADO]:** a **aplicação de status hostil** e o **reposicionamento forçado**. Não
  resiste a dano direto, debuff de stat nem Desgaste (`skills_brief.md` 11.9).
- **Fórmula de dano [ENRAIZADO a forma]:**

  ```
  Dano = Poder da skill × Ataque × Ataque / (Ataque + Defesa)
  ```

  Razão, não subtração: dano nunca zera; o equilíbrio fica igual em qualquer nível (ajuda o ranqueado por faixa,
  D63); o Desgaste em Ataque/Defesa age de forma suave. **Sem variação aleatória** de dano e **sem crítico** como stat.
  Ordem de aplicação: dano base, queda da linha (100/60/30), buffs e debuffs (teto, D37), Defender, escudo, HP.
- **Acerto [ENRAIZADO a forma]:** `Chance = base da skill × 2 × Precisão / (Precisão + Esquiva)`, com **piso e teto**
  (**30% a 100%**, D91). **Base da skill normal = 80%** (acerto médio ~89%). Errar é decidido pela seed (D8).
- **Duração alvo da batalha:** **10 a 15 rodadas** (pode passar), cerca de **8 a 10 minutos** em média. Um golpe médio
  tira em torno de **8 a 10% do HP máximo** do alvo com stats iguais (média de 11% com Poder 1,0, ~9,8% com acerto; kit básico Poder ~0,8). Valores dos stats: **fechados em D91** (`classes_brief.md` 2).

---

## 3. Distribuição de stats [ENRAIZADO]

Problema: distribuição livre deixa um personagem feito para defender virar tank e atacante ao mesmo tempo.

Solução (ajustada por D70, ver [`classes_brief.md`](./classes_brief.md)): **pontos livres com teto por stat, definido
pela classe** (estilo posição de NBA 2K). A regra antiga de "3 aptidões" foi substituída.

- **Todos os stats crescem gradualmente** a cada nível, seguindo o perfil da classe (tank cresce mais em HP e Defesa).
- **Em alguns níveis** o personagem ganha **pontos livres** (**a cada 10 níveis, 10 concessões de 1,5% do orçamento total, ~10 pontos cada**, D91).
- Cada classe tem um **teto por stat** (nos 7). Os pontos livres vão em **qualquer stat, até o teto**: o stat que
  define a classe tem teto alto, os demais têm teto baixo. Quem é Vanguarda não vira Executor.
- O jogador escolhe *que tipo* de Vanguarda quer (Guardião ou Bruto), mas a classe limita até onde vai.
- **8 classes** (Vanguarda, Atirador, Executor, Controlador, Suporte, Artilharia, Guardião,
  Tático): ver [`classes_brief.md`](./classes_brief.md).
- **Redistribuição grátis fora da batalha**, como a build de skills.
- No **ranqueado** todos têm a mesma quantidade de pontos (nivelamento, seção 4).
- O teto é definido por classe e ajustado por personagem (dados do admin).
- Stat final = **base fixa + crescimento por nível + pontos livres**. As proporções (ex.: ~85% base / ~15% livres, que
  eram exemplo, agora confirmadas), o teto e o ritmo de ganho **fechados em D91**: crescimento linear de 34% (nível 0) a 100%; teto ×1,25 nos picos de HP, Defesa, Precisão, Esquiva e Vontade, ×1,15 em Ataque e Velocidade, ×1,10 nos demais.

---

## 4. Nível [ENRAIZADO]

- Vai de **0 a 100**.
- **Kit básico desde o nível 0:** cada variante tem **skills default** (básicas) que o personagem já tem ao nascer.
  Seguem o risco x retorno: custo baixo, ganho baixo. Não existe ataque básico grátis (D38). O kit pode ser
  **padronizado**: igual, com o mesmo dano, para todos os personagens da mesma classe. Quantas skills tem o kit:
  **4 skills, todas da variante** (D92), com o papel da classe; ver `skills_brief.md` 12.6.
- Cada nível dá **crescimento de stats** (seção 3).
- **Skills novas a cada 5 níveis (D77):** bloco de 3 sorteadas, o jogador escolhe 1; as escolhidas ficam guardadas
  e o jogador monta as 4 de batalha. Cada skill tem nível mínimo. Ver [`progression_brief.md`](./progression_brief.md).
- **PvP (opção C, ajustada por D63):** no **ranqueado**, o nível é **nivelado pela faixa de ranking** (ex.: platina =
  todos nível 100; prata = nível 20, com limitações), não por um nível único. O nível real só libera skills, e a
  vantagem de quem joga mais fica nos traços, no DOM, no equipamento vivo e nas opções de build. No **casual e no
  PvE**, vale o nível real.

---

## 5. Traços [ENRAIZADO]

Complementa skills_brief 8.4 e 10.1.

- **Bônus moderado:** é um diferencial, nunca o que decide a partida. Tamanho varia por traço.
- **Traços podem ter lado negativo** (ex.: **Berserker**: +dano corpo a corpo, -defesa). Segue o risco x retorno.
- **Categorias** (o campo de batalha pode pedir uma categoria inteira):
  - **Combate:** Guerreiro, Artista Marcial...
  - **Postura:** Furtivo, Tank...
  - **Origem:** Sobrevivente, Veterano...
- **Sem traço de nascença:** todos os 5 slots são conquistados, **exceto o de família**, que vem do modelo e ocupa 1 dos 5 (D105).
- **Vantagem de quem tem mais traços é aceita**, inclusive no ranqueado e nos bônus de campo (que exigem traços).
  Quem leva personagem sem traços para o ranqueado sabe que está em desvantagem.

---

## 6. Despertar e aprimoramento [ENRAIZADO]

- **Aprimoramento** é o gênero: formas de evoluir o personagem além do nível. **Despertar** é uma delas; as outras
  são o DOM ([`dom_brief.md`](./dom_brief.md)), o equipamento vivo
  ([`living_gear_brief.md`](./living_gear_brief.md)) e os contratos ([`beast_contracts_brief.md`](./beast_contracts_brief.md)).
- **Despertar** = evolução da variante (ex.: fogo → fogo azul ou plasma). **Um só por personagem, sem estágios.**
  Detalhes em [`awakening_brief.md`](./awakening_brief.md). Resumo:
  1. **Todos com 1 variante podem, nada garante:** depende de o admin ter criado um despertar para a variante.
     Quem tem 2 ou 3 variantes (ou nenhuma) **não desperta**.
  2. **Nível 80**, depois sorteio (chance maior para o que combina com os melhores stats) e **missões ocultas**,
     ligadas ao perfil do despertar sorteado e diferentes por personagem.
  3. **Mais poder = mais custo:** a skill despertada é mais forte e o Desgaste também sobe (risco x retorno).
  4. **Vale no ranqueado.** O equilíbrio vem do custo da regra 3 e das faixas (D63).
- **[ABERTO]** Só o catálogo do admin e o modelo das missões (`awakening_brief.md` 5).

---

## 7. XP e histórico [ENRAIZADO o princípio]

- O XP vem de **batalhas**, medido por **métricas de contribuição**, não só por abates: dano causado, dano mitigado
  (tankar), cura, abates etc. O mesmo histórico alimenta as metas de traço.
- **Classes diferem no ritmo:** suporte sobe mais devagar que as demais. Isso é aceito como natural do gênero.
- **O que conta:** batalhas **contra a máquina (PvE)** e **PvP** contam. **Amistosa (contra amigo) não conta** para
  XP nem para histórico (evita farm combinado).
- **[ENRAIZADO a forma]** Fórmula, curva e regras de XP em [`progression_brief.md`](./progression_brief.md) 1.1
  (D76): métricas por participação, suporte com retorno decrescente, catch-up. **[ABERTO]** os valores.

---

## 8. Mais variantes, mais custo [ENRAIZADO o princípio]

- Ter **2 variantes** (ou 3, raríssimo) dá **mais opções e variações** de skill, mas **com mais custo**: ex.: a
  skill passa a gerar **2 Desgastes**. Segue a mesma lógica do despertar: mais poder, mais custo.
- **Ressonância (D97):** a skill cobra 100% na linhagem própria e uma fração nas outras: **60% com 2 variantes; 40% em cada uma com 3**. Desgaste total 1,6x e 1,8x, espalhado em mais stats. Vale para toda skill (não existem skills mistas, D41).
- **Kit básico:** 4 skills divididas entre as variantes (2 e 2; com 3 variantes, 2/1/1 com a principal ficando com 2).
- **Pool de ofertas:** os blocos de 3 sorteiam da união dos pools das variantes.
- Equipamento vivo e DOM não mudam.

---

## 9. Conversas próprias (adiadas de propósito)

Cada uma é complexa o bastante para uma conversa só dela. **Lembrar o usuário de abrir estes assuntos.** Detalhes,
lore existente e perguntas em [`open_topics.md`](./open_topics.md).

1. ~~**Arma viva**~~ fechada (`living_gear_brief.md`). ~~**Contrato com animal**~~ fechado
   (`beast_contracts_brief.md`).
2. ~~**DOM**~~ fechado (`dom_brief.md`). Materiais fechado (D104). Enxerto, Rede e Selo seguem
   adiados.
3. ~~**Família/facção**~~ fechada (`family_faction_brief.md`): família é traço de Origem; organizações são da conta,
   fora do combate.

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
