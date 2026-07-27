# Implementation Plan: Abertura de Boosters Pokémon TCG

**Branch**: `001-pokemon-tcg-boosters` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-pokemon-tcg-boosters/spec.md`

## Summary

Um jogo web de página única, 100% estático, onde o jogador abre pacotes ilimitados e gratuitos de
6 cartas do set Pokémon TCG 151. As cartas são sorteadas por posição segundo uma distribuição de
raridade fixa (FR-004–FR-006, FR-019) e reveladas uma a uma com animação, em ordem crescente de
raridade, destacando cópias "NOVAS" (FR-020). A coleção do jogador (cartas obtidas, contagem de
cópias, progresso agregado por raridade) persiste em `localStorage` (FR-009–FR-011, FR-021) e pode
ser filtrada e ordenada (FR-012, FR-022). Um script Python auxiliar (`download_cards.py`, executado
apenas em tempo de desenvolvimento, nunca em produção) baixa o catálogo de cartas da API
pokemontcg.io e gera os assets estáticos (`.jpg` por carta + manifesto JSON) consumidos pelo front-end.
A lógica de sorteio é isolada em um módulo puro e testável com RNG injetável, para validar
estatisticamente a distribuição (SC-002) conforme o Princípio III da constituição.

## Technical Context

**Language/Version**: JavaScript (ES2022, ES modules nativos) para o runtime do navegador; Python 3.11+ apenas para o script de preparação de dados (`tools/download_cards.py`), executado uma única vez em tempo de desenvolvimento/build, nunca servido nem executado em produção.

**Primary Dependencies**: Nenhuma dependência de runtime no navegador (HTML5 + CSS3 + JS puro, sem framework). No script Python: `requests` (cliente HTTP para a API pokemontcg.io) e `Pillow` (decodifica as imagens PNG retornadas pela API e as re-codifica como JPEG de verdade antes de salvar como `.jpg` — ver research.md §3).

**Storage**: `localStorage` do navegador para a coleção do jogador (cartas obtidas + contagem de cópias). Um manifesto estático `assets/cards.json` (gerado pelo `download_cards.py`) descreve o catálogo completo de cartas (id, nome, raridade, caminho da imagem) — é o que permite ao front-end conhecer o total de cartas por raridade (necessário para FR-019 e FR-021) sem depender de nenhum serviço em tempo de execução.

**Testing**: `node --test` (test runner nativo do Node.js, sem dependências externas) para testes unitários da lógica de sorteio/distribuição (Princípio III) e da camada de persistência (`store.js`), rodando 100% no lado do desenvolvedor — não é enviado ao navegador do jogador. `pytest` (ou `unittest` da stdlib) para testar a idempotência do `download_cards.py` (FR-016).

**Target Platform**: Navegadores web modernos (desktop e mobile), servidos como arquivos estáticos (qualquer servidor de arquivos, CDN ou GitHub Pages) — sem processo de servidor em execução.

**Project Type**: Aplicação web front-end única (sem backend), com um script de preparação de dados fora do runtime da aplicação.

**Performance Goals**: Animação de revelação fluida (~60fps, sem jank perceptível) em dispositivos de médio porte; carregamento inicial interativo em poucos segundos em conexão típica (agravado apenas pelo peso das imagens `.jpg`, sem chamadas de rede subsequentes).

**Constraints**: 100% estático e implantável sem processo de servidor (Princípio I); funcional offline após o primeiro carregamento (Restrições Técnicas Adicionais); volume de dados em `localStorage` deve permanecer pequeno (armazena apenas ids + contagens, não imagens, tipicamente bem abaixo do limite de ~5MB dos navegadores).

**Scale/Scope**: Catálogo único e fixo (~200+ cartas do set sv3pt5 "151"), 7 categorias de raridade, single-player/single-device (sem sincronização entre dispositivos, conforme Assumptions do spec). Escopo desta feature: 3 user stories (abrir pacote, consultar coleção, filtrar por raridade).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Justificativa |
|---|---|---|
| I. Front-End Puro (Sem Backend) | ✅ PASS | Runtime é 100% HTML/CSS/JS servido como arquivos estáticos. `download_cards.py` roda apenas em tempo de desenvolvimento/build, offline do ponto de vista do jogador, e apenas produz arquivos estáticos (`.jpg` + `cards.json`) — não é um servidor nem é executado em produção. |
| II. Persistência Client-Side | ✅ PASS | Coleção do jogador vive inteiramente em `localStorage`; nenhuma escrita remota. |
| III. Distribuição Probabilística Testável | ✅ PASS (gate de design) | Lógica de sorteio (raridade por posição + seleção uniforme da carta, FR-004–FR-006/FR-019) isolada em módulo puro (`src/boosters/draw.js`) que aceita uma função de RNG injetável (seedable), testado via `node --test` rodando milhares de simulações e validando a distribuição observada contra as porcentagens do spec (SC-002). |
| IV. Responsividade Obrigatória | ✅ PASS (gate de processo) | Layout via CSS Grid/Flexbox + media queries; todo componente será validado manualmente em pelo menos um breakpoint mobile (~360px) e um desktop (~1920px) antes de ser considerado concluído (Fluxo de Desenvolvimento). |
| V. Assets Organizados em Disco | ✅ PASS | `download_cards.py` grava as imagens diretamente nas 7 pastas documentadas em `./assets/` (`01_comum` … `07_legendaria`), referenciadas por caminho relativo a partir do manifesto `cards.json`; nenhuma imagem embutida como base64. |

Nenhuma violação identificada. Seção "Complexity Tracking" permanece vazia.

**Re-check pós-Fase 1 (design)**: Confirmado após `research.md`, `data-model.md` e `contracts/`
serem escritos — nenhuma decisão de design introduziu servidor, dependência de runtime externa,
persistência remota ou asset embutido como base64. O PRNG seedável (research.md §1) e o contrato
de `draw.js` (contracts/draw-module.md) tornam o Princípio III diretamente verificável por teste
automatizado. Status: ✅ PASS, sem novas violações.

## Project Structure

### Documentation (this feature)

```text
specs/001-pokemon-tcg-boosters/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
index.html                     # Página única da aplicação

src/
├── boosters/
│   ├── draw.js                # Lógica pura de sorteio: raridade por posição (FR-004–FR-006)
│   │                           # + seleção uniforme da carta (FR-019); aceita RNG injetável
│   └── reveal.js               # Orquestra a animação de revelação carta-a-carta (FR-007, FR-008, FR-020)
├── collection/
│   ├── store.js                # Leitura/escrita da coleção em localStorage (FR-009–FR-011, FR-018)
│   └── view.js                  # Renderização da tela de coleção: filtro, ordenação, progresso (FR-012, FR-020–FR-022)
├── catalog/
│   └── catalog.js               # Carrega e indexa assets/cards.json por raridade
├── app.js                       # Bootstrap: conecta catálogo, sorteio, revelação e coleção
└── styles/
    └── main.css                  # Layout responsivo (Grid/Flexbox + media queries)

assets/
├── cards.json                   # Manifesto do catálogo: id, nome, raridade, caminho da imagem
├── 01_comum/                    # cartas Common (.jpg)
├── 02_incomum/                  # cartas Uncommon (.jpg)
├── 03_raras/                    # cartas Rare, Rare Holo (.jpg)
├── 04_duplo_raras/              # cartas Double Rare, Ultra Rare, Rare Holo EX/GX/V/VMAX (.jpg)
├── 05_arte_secreta/             # cartas Illustration Rare (.jpg)
├── 06_duplo_arte_secreta/       # cartas Special Illustration Rare, Rare Rainbow, Rare Secret (.jpg)
└── 07_legendaria/                # cartas Hyper Rare (.jpg)

tools/
└── download_cards.py             # Script de preparação de dados (dev-time only, ver research.md)

tests/
└── unit/
    ├── draw.test.js              # Valida FR-002/FR-004–FR-006/FR-019 e SC-002 (node --test)
    ├── store.test.js             # Valida FR-009–FR-011, FR-018, FR-021 (node --test)
    └── download_cards_test.py    # Valida idempotência do FR-016 (pytest)
```

**Structure Decision**: Projeto único de página estática (sem separação frontend/backend, consistente
com o Princípio I). `tools/` e `tests/` existem apenas em tempo de desenvolvimento e não fazem parte
do artefato implantado (que é `index.html` + `src/` + `assets/`).

## Complexity Tracking

*Sem violações da Constitution Check — seção intencionalmente vazia.*
