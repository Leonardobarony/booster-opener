# Phase 1 Data Model: Abertura de Boosters Pokémon TCG

Todas as entidades abaixo são estruturas de dados em memória/JSON — não há schema de banco de
dados, consistente com o Princípio I (Front-End Puro) e II (Persistência Client-Side).

## Carta (Card)

Representa uma carta colecionável individual do catálogo (gerado por `download_cards.py` em
`assets/cards.json`).

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string | sim | Identificador único da carta na fonte original (ex.: `"sv3pt5-1"`). Chave primária. |
| `name` | string | sim | Nome de exibição da carta (usado na ordenação alfabética, FR-022). |
| `rarityFolder` | string (enum) | sim | Uma das 7 categorias: `01_comum`, `02_incomum`, `03_raras`, `04_duplo_raras`, `05_arte_secreta`, `06_duplo_arte_secreta`, `07_legendaria`. |
| `imagePath` | string | sim | Caminho relativo do `.jpg` a partir da raiz do site (ex.: `assets/01_comum/sv3pt5-1.jpg`). |

**Regras de validação**:
- `id` é único em todo o catálogo (chave de deduplicação para `download_cards.py` — FR-016).
- `rarityFolder` DEVE ser um dos 7 valores válidos; cartas com raridade não mapeada são
  excluídas do manifesto (ver research.md §3) e nunca participam de sorteios.

**Ciclo de vida**: Imutável em runtime — só é criada/atualizada quando `download_cards.py` é
reexecutado. Uma carta pode desaparecer de `assets/cards.json` numa atualização futura sem afetar
cópias já registradas na Coleção do Jogador (FR-018) — a relação entre Coleção e Catálogo é por
`id` solto, nunca por referência viva.

---

## Categoria de Raridade (RarityTier)

Configuração estática (não persistida; hardcoded em `src/boosters/draw.js`), não um dado do
usuário. Representa cada uma das 7 classificações e as regras de sorteio associadas.

| Campo | Tipo | Descrição |
|---|---|---|
| `folder` | string | Identificador/pasta (ex.: `03_raras`). Chave. |
| `displayName` | string | Nome exibido na UI (ex.: "Rara"). |
| `order` | integer (1–7) | Posição na ordem crescente de raridade (usada em FR-007 e FR-022). |

**Tabelas de probabilidade** (não fazem parte da entidade em si, mas referenciam `folder`):

- Posição 5: `{ "02_incomum": 0.90, "03_raras": 0.10 }`
- Posição 6: `{ "03_raras": 0.60, "04_duplo_raras": 0.25, "05_arte_secreta": 0.10, "06_duplo_arte_secreta": 0.045, "07_legendaria": 0.005 }`

**Regra derivada**: `totalCount` (quantidade de cartas existentes naquela raridade) e
`obtainedCount` (quantidade de cartas distintas que o jogador já possui naquela raridade) são
sempre **calculados** a partir do Catálogo e da Coleção — nunca armazenados como campo próprio,
para nunca ficarem dessincronizados (usados em FR-021/SC-007).

---

## Pacote (Booster Pack)

Estrutura efêmera — existe apenas durante uma abertura, nunca é persistida.

| Campo | Tipo | Descrição |
|---|---|---|
| `slots` | array de 6 `PackSlot` | As 6 cartas sorteadas, já ordenadas por raridade crescente (FR-007). |

**PackSlot**:

| Campo | Tipo | Descrição |
|---|---|---|
| `position` | integer (1–6) | Posição original do sorteio (1–4 Comum, 5, 6). |
| `card` | Carta | A carta sorteada para esta posição. |
| `isNew` | boolean | `true` se esta é a primeira cópia que o jogador já obteve desta carta (FR-020), calculado no momento em que o slot é confirmado na Coleção. |

**Regras de validação**:
- Os 6 `card.id` dentro de `slots` DEVEM ser todos distintos (FR-002) — garantido pelo algoritmo
  de sorteio (research.md §2), que exclui cartas já usadas nas posições anteriores do mesmo pacote.
- `slots` DEVE estar ordenado por `RarityTier.order` crescente antes de ser entregue à camada de
  revelação (FR-007).

**Ciclo de vida**: Criado por `drawPack()`, consumido posição a posição pela animação de
revelação (`reveal.js`), e descartado após a última carta ser confirmada na Coleção. Se a página
for recarregada no meio da revelação, o pacote em andamento é perdido (Assumption do spec) — não
há estado de pacote parcial persistido.

---

## Coleção do Jogador (Player Collection)

Único dado persistido, em `localStorage` sob a chave `pokemon-tcg-collection:v1`.

```json
{
  "version": 1,
  "cards": {
    "sv3pt5-1": 3,
    "sv3pt5-42": 1
  }
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `version` | integer | Versão do schema, permite migração futura sem quebrar coleções existentes. |
| `cards` | objeto `{ [cardId: string]: copies: integer }` | Para cada carta já obtida ao menos uma vez, quantas cópias o jogador possui. Cartas nunca obtidas simplesmente não têm chave (não existe `0` explícito). |

**Regras de validação**:
- `copies` é sempre um inteiro ≥ 1 (uma entrada só existe se já foi obtida ao menos uma vez —
  FR-010).
- Uma entrada em `cards` cujo `id` não existe mais em `assets/cards.json` (carta removida da
  fonte, FR-018) permanece válida e intocada; a UI deve tolerar exibir uma carta "órfã" (ex.: sem
  imagem/nome resolvido) sem quebrar a listagem.

**Operações** (expostas por `src/collection/store.js`):
- `addCard(id) → { isNew, copies }`: incrementa `cards[id]` (cria com `1` se não existir);
  retorna se era a primeira cópia (FR-020).
- `getCopies(id) → integer`: `cards[id] ?? 0`.
- `getEntries() → Array<{ id, copies }>`: usado pela tela de coleção, cruzado com o Catálogo para
  exibir nome/imagem/raridade e aplicar filtro (FR-012) e ordenação (FR-022).
- `getProgress() → { total: {obtained, total}, byRarity: { [folder]: {obtained, total} } }`: usado
  por FR-021/SC-007 — cruza `Object.keys(cards)` com o Catálogo agrupado por `rarityFolder`.

**Ciclo de vida**: Criada implicitamente (objeto vazio) na primeira leitura se a chave não existir
no `localStorage` (edge case "coleção vazia"). Atualizada de forma incremental a cada carta
confirmada durante a abertura de um pacote (FR-010). Nunca é limpa automaticamente pelo sistema;
só desaparece se o próprio usuário limpar os dados do navegador (edge case coberto no spec).

---

## Relacionamentos

```text
Catálogo (assets/cards.json)
  └── 1..N Carta ──────────────┐
                                 │ referenciada por id (fraca, não FK viva)
Coleção do Jogador (localStorage)
  └── 1..N entrada (cardId → copies)

Pacote (efêmero)
  └── exatamente 6 PackSlot
        └── 1 Carta (do Catálogo, no momento do sorteio)
```

A relação entre Coleção e Catálogo é deliberadamente **fraca** (por `id` textual, nunca por
referência de objeto) para satisfazer FR-018: o Catálogo pode mudar entre execuções do
`download_cards.py` sem exigir nenhuma migração da Coleção já persistida.
