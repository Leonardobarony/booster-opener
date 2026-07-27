# Quickstart: Abertura de Boosters Pokémon TCG

Guia para validar, de ponta a ponta, que a feature funciona conforme `spec.md`. Não contém
código de implementação — apenas os passos para rodar e verificar o resultado.

## Pré-requisitos

- Python 3.11+ (apenas para gerar os assets uma única vez).
- Qualquer servidor de arquivos estático para servir a pasta do projeto (ex.: a extensão "Live
  Server", ou `python -m http.server`) — a aplicação não pode ser aberta como `file://` direto no
  Chrome/Edge por causa de restrições de CORS em `fetch()` para `assets/cards.json`.
- Navegador moderno (Chrome, Firefox, Edge ou Safari recentes).

## 1. Gerar o catálogo de cartas (uma vez, ou sempre que quiser atualizar)

```sh
pip install requests
python tools/download_cards.py
```

**Resultado esperado**: as 7 pastas em `assets/` (`01_comum` … `07_legendaria`) contêm arquivos
`.jpg`, e `assets/cards.json` existe e valida contra
`specs/001-pokemon-tcg-boosters/contracts/cards-manifest.schema.json`.

**Verificar idempotência (FR-016)**: rode o comando novamente. A saída deve indicar "0 novas
baixadas" e o conteúdo de `assets/` não deve mudar.

## 2. Servir e abrir a aplicação

```sh
python -m http.server 8000
```

Abra `http://localhost:8000/` no navegador.

## 3. Validar User Story 1 — Abrir um pacote e revelar as cartas

1. Na tela inicial, clique em "Abrir pacote" (ou equivalente).
2. **Esperado**: 6 cartas são reveladas uma de cada vez, com animação, na ordem da menos rara
   para a mais rara. As 4 primeiras são sempre "Comum". A 6ª carta nunca é "Comum" nem "Incomum".
3. Repita a abertura ~20 vezes e observe: ao longo de várias aberturas, a 5ª carta varia entre
   Incomum e Rara, e a 6ª varia entre Rara/Dupla Rara/Arte Secreta/Duplo Arte Secreta/Legendária —
   nunca duas cartas iguais dentro do mesmo pacote.
4. Ao abrir uma carta pela primeira vez, ela é marcada como "NOVA"; ao abrir uma carta repetida,
   aparece como duplicata (sem o destaque).

## 4. Validar User Story 2 — Consultar a coleção acumulada

1. Após abrir ao menos um pacote, acesse a tela de Coleção.
2. **Esperado**: todas as cartas obtidas aparecem, com a contagem de cópias correta, e o
   progresso agregado (ex.: "N/Total cartas obtidas") é exibido.
3. Feche completamente o navegador e reabra a aplicação.
4. **Esperado**: a coleção e as contagens de cópias permanecem exatamente as mesmas (persistência
   via `localStorage`, FR-009).

## 5. Validar User Story 3 — Filtrar a coleção por raridade

1. Na tela de Coleção, selecione um filtro de raridade (ex.: "Rara").
2. **Esperado**: apenas cartas daquela raridade aparecem, ordenadas por nome.
3. Remova o filtro (ou selecione "Todas").
4. **Esperado**: a coleção completa volta a ser exibida, ordenada por raridade crescente e depois
   por nome (FR-022).

## 6. Validar responsividade (Princípio IV)

1. Com as DevTools do navegador, alterne para um viewport mobile (~375px de largura) e depois
   para um desktop largo (~1920px).
2. **Esperado**: em ambos os tamanhos, nenhum elemento fica cortado, sobreposto ou inacessível
   (tela de abertura de pacote e tela de coleção).

## 7. Rodar os testes automatizados

```sh
node --test tests/unit/draw.test.js tests/unit/store.test.js
pytest tests/unit/download_cards_test.py
```

**Esperado**: todos os testes passam, incluindo a validação estatística de SC-002 (distribuição
das posições 5 e 6 dentro de ±2 pontos percentuais ao longo de 10.000+ simulações).
