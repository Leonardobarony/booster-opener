# Contrato: `src/collection/store.js`

Camada de persistência da Coleção do Jogador. Único módulo autorizado a ler/escrever a chave
`pokemon-tcg-collection:v1` do `localStorage` (Princípio II). Testado por
`tests/unit/store.test.js` via `node --test` com um mock de `localStorage` em memória.

## `addCard(cardId) → { isNew: boolean, copies: number }`

Incrementa a contagem de cópias da carta `cardId` em 1 (cria a entrada com `copies = 1` se for a
primeira vez). Retorna `isNew: true` se, antes desta chamada, o jogador não possuía nenhuma cópia
(FR-010, FR-020).

**Pós-condições**:
- Chamado 1x → `{ isNew: true, copies: 1 }`.
- Chamado novamente para o mesmo `cardId` → `{ isNew: false, copies: 2 }`.
- Persiste a mudança em `localStorage` de forma síncrona antes de retornar (se a página for
  fechada logo em seguida, a cópia não se perde).

## `getCopies(cardId) → number`

Retorna `0` se a carta nunca foi obtida, caso contrário a contagem atual. Nunca lança erro para um
`cardId` desconhecido.

## `getEntries() → Array<{ id: string, copies: number }>`

Retorna todas as entradas da coleção, na ordem em que estão armazenadas (a ordenação por raridade
+ nome, FR-022, é responsabilidade de `collection/view.js`, que cruza este retorno com o Catálogo).

## `getProgress(catalog) → Progress`

```ts
type Progress = {
  total: { obtained: number; total: number };
  byRarity: {
    [rarityFolder: string]: { obtained: number; total: number };
  };
};
```

Cruza `getEntries()` com `catalog` (todas as cartas existentes) para calcular, sem nenhum estado
adicional armazenado, quantas cartas **distintas** o jogador já possui no total e por raridade
(FR-021, SC-007). Cartas presentes na coleção mas ausentes do `catalog` atual (FR-018) contam para
`obtained` mas não inflam `total`.

## Garantias de compatibilidade

- Se `localStorage` estiver indisponível (modo privado restritivo) ou lançar exceção em qualquer
  operação, todas as funções acima devem degradar graciosamente para um estado em memória
  (não persistente) durante a sessão, em vez de quebrar a aplicação — cobre o edge case de
  armazenamento bloqueado/cheio descrito no spec.
