# Phase 0 Research: Abertura de Boosters Pokémon TCG

## 1. Geração de números aleatórios testável (Princípio III)

- **Decision**: Implementar um PRNG determinístico simples e dependency-free (mulberry32 ou
  splitmix32) em `src/boosters/draw.js`, injetado como função `rng()` (retorna float em `[0,1)`)
  em todas as funções de sorteio. Em produção, o app instancia o PRNG com uma seed derivada de
  `Date.now()`; nos testes (`tests/unit/draw.test.js`), o mesmo PRNG é instanciado com seeds fixas
  para reprodutibilidade, e uma segunda bateria de testes roda 10.000+ simulações para validar as
  proporções (SC-002).
- **Rationale**: `Math.random()` nativo não é seedável, o que impossibilitaria testes
  determinísticos e violaria diretamente o Princípio III ("aceitando uma seed configurável"). Um
  PRNG de ~10 linhas evita qualquer dependência externa (consistente com "Front-End Puro").
- **Alternatives considered**: Biblioteca externa (ex.: `seedrandom` via CDN) — rejeitada por
  introduzir dependência de rede/CDN desnecessária para uma função trivial, contra as Restrições
  Técnicas Adicionais da constituição.

## 2. Algoritmo de sorteio do pacote (FR-002, FR-004–FR-006, FR-019)

- **Decision**: `drawPack(catalog, rng)` em 3 passos puros:
  1. Sorteia a **raridade** de cada uma das 6 posições segundo as regras fixas (posições 1–4:
     Comum; posição 5: tabela `{Incomum: 0.90, Rara: 0.10}`; posição 6: tabela `{Rara: 0.60,
     DuplaRara: 0.25, ArteSecreta: 0.10, DuploArteSecreta: 0.045, Legendaria: 0.005}`) usando
     amostragem por acumulação de probabilidade (`cumulativeSum` + `rng()`).
  2. Para cada posição, sorteia a **carta específica** com probabilidade uniforme dentro do pool
     de cartas daquela raridade, excluindo cartas já escolhidas nas posições anteriores do mesmo
     pacote (garante FR-002 mesmo que duas posições sorteiem a mesma raridade).
  3. Ordena as 6 cartas resultantes por índice de raridade crescente antes de retornar, para a
     camada de revelação consumir na ordem certa (FR-007) independentemente da ordem de sorteio.
- **Rationale**: Separar "sortear raridade" de "sortear carta dentro da raridade" mantém cada
  etapa testável isoladamente (a distribuição de raridade é testada sem depender do catálogo real;
  a uniformidade da seleção de carta é testada com um catálogo mock).
- **Alternatives considered**: Sortear diretamente uma carta entre todas as ~200 cartas com pesos
  por carta — rejeitada por exigir recalcular pesos individuais sempre que o catálogo mudar, e por
  misturar duas responsabilidades num único cálculo difícil de testar separadamente.

## 3. Script de preparação de dados (`download_cards.py`)

- **Decision**: Script Python standalone, executado manualmente por quem mantém o projeto (nunca
  em produção nem pelo navegador do jogador):
  1. Pagina `GET https://api.pokemontcg.io/v2/cards?q=set.id:sv3pt5&page=N&pageSize=250` até a
     página vir vazia.
  2. Mapeia `card["rarity"]` para uma das 7 pastas via uma tabela fixa (Common→01_comum,
     Uncommon→02_incomum, Rare/Rare Holo→03_raras, Double Rare/Rare Ultra/Rare Holo EX/GX/V/VMAX→
     04_duplo_raras, Illustration Rare→05_arte_secreta, Special Illustration Rare/Rare Rainbow/Rare
     Secret→06_duplo_arte_secreta, Hyper Rare→07_legendaria). Raridades fora da tabela geram um
     aviso no stdout e são ignoradas (não quebram o download).
  3. Para cada carta, calcula o caminho de destino `assets/<pasta>/<card_id>.jpg` **antes** de
     baixar; se o arquivo já existe, pula o download (idempotência, FR-016).
  4. Baixa `card["images"]["large"]` (fallback para `["small"]`) e salva como `.jpg`.
  5. Ao final, escreve/atualiza `assets/cards.json`: lista de `{id, name, rarity_folder,
     image_path}` — esse manifesto é o que o front-end lê em tempo de execução (nunca chama a API
     diretamente, mantendo o Princípio I).
- **Rationale**: Rodar a chamada de API inteiramente fora do runtime do navegador é o que permite
  ao jogo permanecer 100% front-end/offline (Princípio I) enquanto ainda usa uma fonte de dados
  real. A checagem de existência do arquivo antes do download implementa a idempotência decidida
  em `/speckit-clarify` sem precisar de nenhum estado externo (usa o próprio disco como fonte de
  verdade).
- **Alternatives considered**: Buscar a API diretamente do navegador em runtime — rejeitado
  porque violaria o Princípio I (dependência de serviço externo em produção) e o requisito de
  funcionamento offline.

## 4. Formato do manifesto `assets/cards.json`

- **Decision**: Array plano de objetos `{ id, name, rarityFolder, imagePath }`, ordenado por
  `rarityFolder` e depois por `name` (mesmo critério de ordenação decidido para a coleção,
  FR-022) para que `catalog.js` possa indexar por raridade com uma única passada.
- **Rationale**: Formato simples o suficiente para ser consumido com `fetch()` +
  `Array.prototype.filter/reduce`, sem necessidade de nenhuma biblioteca de parsing/indexação.
- **Alternatives considered**: Um arquivo `.json` por raridade — rejeitado por adicionar 7
  requisições em vez de 1 no carregamento inicial, sem benefício real dado o tamanho pequeno do
  catálogo (~200 registros).

## 5. Esquema de persistência em `localStorage` (FR-009–FR-011, FR-018, FR-021)

- **Decision**: Uma única chave `pokemon-tcg-collection:v1` contendo um JSON
  `{ version: 1, cards: { [cardId]: copies } }`. `store.js` expõe `getCopies(id)`,
  `addCard(id)`, `getCollectionEntries()` e `getProgress()` (deriva totais por raridade cruzando
  `cards` com o manifesto do catálogo).
- **Rationale**: Uma única chave versionada facilita migração futura (bump de `version`) e evita
  múltiplas leituras/escritas de `localStorage` por carta. Guardar apenas `id → contagem` (não o
  objeto completo da carta) mantém o volume de dados mínimo e implementa naturalmente o FR-018
  (cartas removidas do catálogo continuam na coleção porque a chave é só o `id` + contagem, nunca
  é cruzada destrutivamente com o catálogo atual).
- **Alternatives considered**: Uma chave por carta (`card:<id>`) — rejeitada por exigir iterar
  todas as chaves de `localStorage` para montar a coleção completa, mais lento e mais frágil a
  poluição de namespace.

## 6. Indicador "NOVA" vs. duplicata (FR-020)

- **Decision**: `store.addCard(id)` retorna `{ isNew: boolean, copies: number }` no momento da
  adição — `isNew` é `true` somente se `copies` era `0` antes da chamada. A camada de revelação
  (`reveal.js`) usa esse retorno imediatamente após revelar cada carta para aplicar o destaque
  visual, sem precisar consultar o estado da coleção duas vezes.
- **Rationale**: Calcular "é nova" no mesmo momento da escrita evita qualquer condição de corrida
  entre "ler estado antigo" e "escrever novo estado" dentro de uma única abertura de pacote.

## 7. Animação de revelação (FR-007, FR-008)

- **Decision**: CSS puro (`@keyframes` + `transition` em `transform`/`opacity` para o efeito de
  virar a carta) disparado via `classList.add()` sequencial, com `await` em
  `Promise` resolvida por `transitionend` (ou um `setTimeout` de fallback) entre cada carta — sem
  biblioteca de animação.
- **Rationale**: Mantém a dependência zero de runtime (Princípio I / Restrições Técnicas) e CSS
  transitions são performáticas o bastante para 6 cartas sequenciais.
- **Alternatives considered**: Biblioteca de animação via CDN (ex.: GSAP) — rejeitada por não ser
  necessária para uma animação simples e por introduzir uma dependência de CDN evitável.

## 8. Layout responsivo (Princípio IV)

- **Decision**: CSS Grid para a grade da coleção (`repeat(auto-fill, minmax(...))`) e Flexbox para
  a fileira de revelação do pacote, com breakpoints em `~480px` (mobile) e `~1024px` (desktop) via
  media queries em `main.css` puro.
- **Rationale**: Atende ao Princípio IV sem qualquer framework CSS externo, mantendo o projeto
  100% estático e sem dependências de build.

## 9. Testes automatizados (Testing strategy)

- **Decision**: `node --test` (nativo do Node.js ≥18, zero dependências) para `draw.js` e
  `store.js` (rodando em ambiente Node puro, já que ambos os módulos são JS puro sem acesso a DOM);
  `pytest` (ou `unittest`) para `download_cards.py`, mockando a chamada HTTP para validar a
  idempotência (FR-016) sem depender da API real durante os testes.
- **Rationale**: Ambas as ferramentas já vêm com o respectivo runtime (Node/Python), sem exigir
  instalação de dependências extras — consistente com manter o projeto simples e sem build step
  obrigatório para o runtime do navegador.

## Resumo de decisões pendentes

Nenhum item permanece como "NEEDS CLARIFICATION" — todas as questões técnicas relevantes para o
design (Fase 1) foram resolvidas acima.
