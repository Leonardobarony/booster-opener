---

description: "Task list template for feature implementation"
---

# Tasks: Abertura de Boosters Pokémon TCG

**Input**: Design documents from `/specs/001-pokemon-tcg-boosters/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: A lógica de sorteio probabilístico (FR-015) e o script de download (FR-016) exigem
testes automatizados explicitamente no spec e na constituição (Princípio III); por isso as tasks
de teste abaixo NÃO são opcionais para essas duas áreas. Não foram solicitados testes de UI/DOM
adicionais, então a camada de visualização (reveal.js, view.js) é validada manualmente via
quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Projeto único de página estática (sem separação frontend/backend) — ver `plan.md` → Project Structure.
- Runtime: `index.html`, `src/`, `assets/` (na raiz do repositório).
- Ferramentas de desenvolvimento (não implantadas): `tools/`, `tests/`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialização da estrutura de diretórios e ferramentas de desenvolvimento

- [X] T001 Criar a estrutura de diretórios do projeto (`index.html`, `src/boosters/`,
      `src/collection/`, `src/catalog/`, `src/styles/`, `assets/01_comum/` … `assets/07_legendaria/`
      com `.gitkeep`, `tools/`, `tests/unit/`) conforme `plan.md` → Project Structure
- [X] T002 [P] Criar `tools/requirements.txt` com a dependência `requests` para `download_cards.py`
- [X] T003 [P] Criar `package.json` na raiz com `"type": "module"` e script
      `"test": "node --test tests/unit/*.test.js"` (ferramenta de dev apenas; não é servida ao
      navegador; o glob explícito evita que `node --test` tente carregar `download_cards_test.py`
      como módulo JS)
- [X] T004 [P] Criar/ajustar `.gitignore` com entradas para `__pycache__/`, `*.pyc`, `.venv/`

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura de dados e persistência que TODAS as user stories dependem

**⚠️ CRITICAL**: Nenhuma user story pode começar antes desta fase estar completa

- [X] T005 Implementar `tools/download_cards.py` conforme
      `contracts/download_cards-cli.md` (paginação de `set.id:sv3pt5`, tabela de mapeamento de
      raridade → 7 pastas, checagem de existência de arquivo antes do download, escrita atômica,
      geração de `assets/cards.json`, códigos de saída 0/1)
- [X] T006 [P] Escrever `tests/unit/download_cards_test.py` validando a idempotência (FR-016) com
      chamadas HTTP mockadas — duas execuções seguidas não devem re-baixar nem duplicar arquivos,
      conforme `contracts/download_cards-cli.md`
- [X] T007 Executado `python tools/download_cards.py`: `assets/` populado com as 207 cartas reais
      do set 151 (66 comum, 62 incomum, 25 raras, 28 duplo raras, 16 arte secreta, 7 duplo arte
      secreta, 3 legendária) e `assets/cards.json` gerado — 0 cartas ignoradas por raridade
      desconhecida. Corrigido um bug de mapeamento no processo: a API retorna a raridade como
      `"Ultra Rare"`, não `"Rare Ultra"` como no enunciado original — `RARITY_TO_FOLDER` em
      `download_cards.py` (e a documentação em `plan.md`/`research.md`) foram corrigidos. Os
      arquivos de imagem/manifesto reais não são commitados (ver `.gitignore`); o run ficou local.
- [X] T008 [P] Implementar `src/catalog/catalog.js`: carregar e validar `assets/cards.json`
      (formato de `contracts/cards-manifest.schema.json`), expor `loadCatalog()` e
      `getByRarity(rarityFolder)` (ver `data-model.md` → Carta, Categoria de Raridade)
- [X] T009 [P] Implementar `src/collection/store.js`: schema `pokemon-tcg-collection:v1` em
      `localStorage`, funções `addCard`, `getCopies`, `getEntries`, `getProgress`, com fallback
      gracioso em memória se `localStorage` estiver indisponível/bloqueado, conforme
      `contracts/store-module.md`
- [X] T010 [P] Escrever `tests/unit/store.test.js` validando `addCard`/`getCopies`/`getEntries`/
      `getProgress` (incluindo tolerância a cartas "órfãs" do FR-018) com um mock de
      `localStorage`, conforme `contracts/store-module.md`
- [X] T011 [P] Criar o esqueleto de `index.html` (containers para a tela de abertura de pacote e
      para a tela de coleção) e `src/styles/main.css` com base responsiva Grid/Flexbox e
      breakpoints mobile (~480px) e desktop (~1024px) (Princípio IV)
- [X] T012 Criar `src/app.js` (bootstrap): carregar o catálogo na inicialização, conectar os
      containers de `index.html`, exibir estado de carregamento/coleção vazia (edge case: primeiro
      acesso sem nenhuma carta)

**Checkpoint**: Fundação pronta - a implementação das user stories pode começar

---

## Phase 3: User Story 1 - Abrir um pacote e revelar as cartas (Priority: P1) 🎯 MVP

**Goal**: Jogador abre um pacote e vê as 6 cartas reveladas uma a uma, em ordem crescente de
raridade, respeitando a distribuição probabilística e destacando cartas novas vs. duplicatas.

**Independent Test**: Abrir um pacote repetidamente e verificar que sempre há 6 cartas distintas,
sempre na ordem certa, com a 5ª/6ª posição variando conforme as porcentagens do spec (ver
`quickstart.md` §3).

### Tests for User Story 1 ⚠️

> Exigido por FR-015/SC-002 e pelo Princípio III da constituição — escrever e falhar antes de implementar `draw.js`

- [X] T013 [P] [US1] Escrever `tests/unit/draw.test.js`: testes unitários com RNG seedado para
      `pickRarityForPosition`/`pickCardForRarity`, e uma simulação estatística (≥10.000 execuções)
      validando FR-004–FR-006, FR-019 e a margem de ±2pp do SC-002, conforme
      `contracts/draw-module.md` — confirmado que falha antes da implementação de `draw.js`

### Implementation for User Story 1

- [X] T014 [US1] Implementar `src/boosters/draw.js`: PRNG seedável (mulberry32),
      `pickRarityForPosition`, `pickCardForRarity`, `drawPack` (posições 1–4 Comum; posição 5 por
      FR-005; posição 6 por FR-006; unicidade global FR-002; retorno ordenado por raridade
      crescente FR-007) — 9/9 testes de T013 passando
- [X] T015 [US1] Implementar `src/boosters/reveal.js`: revelação sequencial carta-a-carta com
      animação CSS (`@keyframes`/`transition`, FR-008), chamando `store.addCard()` por carta para
      obter `isNew` (FR-020) antes de exibir o destaque
- [X] T016 [US1] Adicionar marcação/estilo do indicador "NOVA" vs. duplicata em
      `src/styles/main.css` e `src/boosters/reveal.js` (FR-020)
- [X] T017 [US1] Conectar a ação "Abrir pacote" em `src/app.js`: catálogo → `drawPack` →
      `reveal` → `store.addCard` por posição (FR-001, FR-010)
- [X] T018 Validação de responsividade da tela de abertura de pacote em mobile (375×812) e
      desktop (1920×1080), via Chromium real (Playwright): pacote aberto, 6 cartas reveladas com
      imagens reais e badge "NOVA", sem elementos cortados/sobrepostos em nenhum dos dois
      breakpoints; 0 erros de console (Fluxo de Desenvolvimento, Princípio IV)

**Checkpoint**: User Story 1 totalmente funcional e testável de forma independente (`quickstart.md` §3)

---

## Phase 4: User Story 2 - Consultar a coleção acumulada (Priority: P2)

**Goal**: Jogador vê todas as cartas já obtidas, com contagem de cópias e progresso agregado,
persistente entre sessões.

**Independent Test**: Abrir pacotes, fechar e reabrir o navegador, e conferir que a coleção e as
contagens permanecem corretas (ver `quickstart.md` §4).

### Implementation for User Story 2

- [X] T019 [US2] Implementar `src/collection/view.js`: renderizar a grade completa da coleção a
      partir de `store.getEntries()` + catálogo, ordenada por raridade crescente e depois por nome
      (FR-022), exibindo a contagem de cópias por carta (FR-011)
- [X] T020 [US2] Adicionar exibição do progresso agregado (total e por raridade, FR-021/SC-007) em
      `src/collection/view.js` usando `store.getProgress()`
- [X] T021 [US2] Adicionar estado de "coleção vazia" em `src/collection/view.js` (edge case: nenhum
      pacote aberto ainda — cobre também o caso de filtro sem nenhuma carta daquela raridade)
- [X] T022 [US2] Conectar a navegação "Ver coleção" em `src/app.js` para renderizar
      `collection/view.js`
- [X] T023 Validação de responsividade da tela de coleção em mobile e desktop, via Chromium real:
      progresso agregado, cores de borda por raridade e grid renderizaram corretamente nos dois
      breakpoints, sem elementos cortados/sobrepostos (Princípio IV)

**Checkpoint**: User Stories 1 E 2 funcionam de forma independente

---

## Phase 5: User Story 3 - Filtrar a coleção por raridade (Priority: P3)

**Goal**: Jogador filtra a coleção para ver apenas cartas de uma raridade específica.

**Independent Test**: Com uma coleção populada, selecionar cada uma das 7 raridades e conferir que
somente cartas daquela categoria aparecem (ver `quickstart.md` §5).

### Implementation for User Story 3

- [X] T024 [US3] Adicionar controle de filtro de raridade (7 categorias + "todas") em
      `src/collection/view.js` (FR-012)
- [X] T025 [US3] Implementar o estado de filtro em `src/collection/view.js`: re-renderizar o
      subconjunto filtrado preservando a ordenação (FR-022)
- [X] T026 Validação de responsividade do controle de filtro em mobile e desktop, via Chromium
      real: filtro "Comum" aplicado com sucesso nos dois breakpoints, retornando exatamente as 4
      cartas comuns esperadas, sem quebra de layout (Princípio IV)

**Checkpoint**: Todas as user stories funcionam de forma independente

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validação final e melhorias que atravessam todas as user stories

- [X] T027 Validação de ponta a ponta de `quickstart.md` executada: §7 automatizado (14/14 testes
      JS + 3/3 testes Python passando); §3–§6 validados com Chromium real via Playwright
      (`python -m http.server 8000` + script de smoke-test descartável) — pacote abriu e revelou 6
      cartas com imagens reais, coleção e progresso corretos, filtro por raridade funcionando,
      responsivo em mobile (375×812) e desktop (1920×1080), 0 erros de console em ambos
- [X] T028 Checagem cross-browser realizada no Chromium (via Playwright) — animação de revelação e
      persistência da coleção funcionaram sem erros. Firefox/Edge não testados nesta sessão (sem
      esses engines disponíveis no ambiente); recomenda-se checagem visual rápida se for relevante
      para o público-alvo, mas o app usa apenas CSS/JS padrão (sem APIs específicas de navegador)
- [X] T029 Revisar os edge cases de `spec.md`: confirmado que
      `store.js` degrada para memória se `localStorage` lançar (bloqueado/cheio), que
      `reveal.js` persiste cada carta assim que revelada (recarregar no meio do pacote não corrompe
      cópias já confirmadas), e que `draw.js` lança um erro claro (capturado por `app.js`, exibindo
      mensagem ao usuário) se alguma raridade não tiver cartas suficientes — em vez de travar
      silenciosamente
- [X] T030 [P] Adicionar `README.md` na raiz com instruções de setup e execução (referenciando
      `quickstart.md`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende da conclusão do Setup — BLOQUEIA todas as user stories
- **User Stories (Phase 3+)**: Todas dependem da conclusão da fase Foundational
  - As user stories podem então prosseguir em paralelo ou sequencialmente em ordem de prioridade
    (P1 → P2 → P3)
- **Polish (Fase final)**: Depende de todas as user stories desejadas estarem completas

### User Story Dependencies

- **User Story 1 (P1)**: Pode começar após o Foundational (Fase 2) — sem dependência de outras
  stories
- **User Story 2 (P2)**: Pode começar após o Foundational — depende de `store.js` (Foundational)
  já existir para ler dados, mas não depende de US1 ter sido implementada (pode ser desenvolvida
  e testada com dados inseridos manualmente no `localStorage`)
- **User Story 3 (P3)**: Depende de `src/collection/view.js` existir (criado em US2) — extensão
  direta da US2, não pode ser testada de forma independente sem a listagem base da US2

### Within Each User Story

- Testes (quando incluídos) DEVEM ser escritos e FALHAR antes da implementação (US1: T013 antes de T014)
- Módulo de domínio (draw.js) antes da camada de UI (reveal.js)
- Camada de dados (view.js base) antes de recursos incrementais (filtro em US3)
- Validação de responsividade é a última task de cada fase de story

### Parallel Opportunities

- Todas as tasks de Setup marcadas [P] podem rodar em paralelo (T002, T003, T004)
- Dentro do Foundational, T006, T008, T009, T010, T011 podem rodar em paralelo entre si (arquivos
  diferentes), mas T005 deve vir antes de T007, e T007 antes de qualquer validação manual
- T013 (teste) pode ser escrita em paralelo a outras tasks do Foundational, mas deve ser concluída
  antes de T014
- T027, T028, T030 na fase de Polish podem rodar em paralelo

---

## Parallel Example: Foundational Phase

```bash
# Após T005 e T007 (script + dados gerados), rodar em paralelo:
Task: "Escrever tests/unit/download_cards_test.py conforme contracts/download_cards-cli.md"
Task: "Implementar src/catalog/catalog.js conforme contracts/cards-manifest.schema.json"
Task: "Implementar src/collection/store.js conforme contracts/store-module.md"
Task: "Escrever tests/unit/store.test.js conforme contracts/store-module.md"
Task: "Criar index.html + src/styles/main.css com base responsiva"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar a Fase 1: Setup
2. Completar a Fase 2: Foundational (CRÍTICO — bloqueia todas as stories)
3. Completar a Fase 3: User Story 1
4. **PARAR e VALIDAR**: Testar a User Story 1 de forma independente (`quickstart.md` §3 + §6)
5. Esse já é um MVP demonstrável: abrir pacotes com distribuição correta e animação

### Incremental Delivery

1. Setup + Foundational → Fundação pronta (dados reais em `assets/`, catálogo carregável, coleção
   persistível)
2. Adicionar User Story 1 → Testar independentemente → MVP (abrir pacotes)
3. Adicionar User Story 2 → Testar independentemente → Coleção persistente visível
4. Adicionar User Story 3 → Testar independentemente → Filtro por raridade
5. Polish → Validação end-to-end completa

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências entre si
- [Story] label mapeia a task para a user story correspondente, para rastreabilidade
- Testes automatizados são obrigatórios apenas onde o spec/constituição exigem explicitamente
  (sorteio probabilístico e idempotência do download) — o restante é validado manualmente via
  `quickstart.md`, conforme o escopo do MVP
- Cada task referencia o arquivo de contrato/spec relevante (FR-XXX, SC-XXX) para rastreabilidade
- Parar em qualquer checkpoint para validar a story de forma independente antes de prosseguir
