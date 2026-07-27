# Contrato: `src/boosters/draw.js`

Módulo puro (sem acesso a DOM/`localStorage`), consumido por `src/app.js` e testado diretamente
por `tests/unit/draw.test.js` via `node --test`. É a implementação do Princípio III (Distribuição
Probabilística Testável).

## `drawPack(catalog, rng) → PackSlot[6]`

**Entradas**:

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `catalog` | `Carta[]` | Catálogo completo (de `assets/cards.json`), já carregado em memória. |
| `rng` | `() => number` | Função que retorna um float em `[0, 1)`. Em produção, um PRNG seedado com `Date.now()`; em testes, seedado com um valor fixo para reprodutibilidade. |

**Saída**: array de exatamente 6 objetos `{ position, card }`, ordenados por raridade crescente
(ver `data-model.md` → Pacote).

**Pré-condições**:
- `catalog` DEVE conter ao menos 1 carta em cada uma das 7 categorias usadas pelas tabelas de
  probabilidade (posições 5 e 6), e ao menos 6 cartas na categoria Comum (para preencher as
  posições 1–4 sem repetição — FR-002). Caso contrário, `drawPack` lança um erro explícito em vez
  de retornar um pacote incompleto ou com repetição.

**Pós-condições / invariantes testados**:
1. `slots.length === 6`.
2. Todos os `slots[i].card.id` são distintos (FR-002).
3. `slots[0..3].card.rarityFolder === "01_comum"` sempre (FR-004).
4. Ao longo de N execuções (N ≥ 10.000) com `rng` real (não seedado fixo), a distribuição de
   `slots[4].card.rarityFolder` converge para `{02_incomum: 90%, 03_raras: 10%}` dentro de ±2pp
   (FR-005, SC-002).
5. Ao longo de N execuções, a distribuição de `slots[5].card.rarityFolder` converge para
   `{03_raras: 60%, 04_duplo_raras: 25%, 05_arte_secreta: 10%, 06_duplo_arte_secreta: 4.5%,
   07_legendaria: 0.5%}` dentro de ±2pp (FR-006, SC-002).
6. Dentro de uma raridade sorteada, ao longo de N execuções, cada carta elegível daquela raridade
   é escolhida com frequência aproximadamente uniforme (FR-019).
7. `slots` está ordenado por `RarityTier.order` crescente (FR-007).

## `pickRarityForPosition(position, rng) → rarityFolder`

Função auxiliar pura usada internamente por `drawPack`; exposta também para testes unitários
isolados da tabela de probabilidade, sem precisar de um catálogo real.

## `pickCardForRarity(catalog, rarityFolder, excludeIds, rng) → Carta`

Função auxiliar pura: filtra `catalog` por `rarityFolder`, remove `excludeIds`, e escolhe um
elemento com probabilidade uniforme usando `rng()`. Lança erro se o pool filtrado estiver vazio.
