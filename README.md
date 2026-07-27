# Boosters Pokémon TCG (set 151)

Jogo web de abertura de boosters do Pokémon TCG — **front-end puro** (HTML/CSS/JS, sem backend
e sem framework), com coleção persistente em `localStorage`. As cartas vêm do set **151**
(`sv3pt5`) da API [pokemontcg.io](https://pokemontcg.io), baixadas uma única vez em tempo de
desenvolvimento por um script auxiliar — o jogo em si nunca chama nenhuma API em produção.

## Escopo

**Dentro do escopo**:

- Abrir pacotes **ilimitados e gratuitos**, cada um com **6 cartas únicas** (nunca repete carta
  no mesmo pacote), reveladas uma a uma com animação, em ordem crescente de raridade.
- Distribuição de raridade fixa por posição:
  - 1ª–4ª carta: sempre **Comum**
  - 5ª carta: **Incomum** (90%) ou **Rara** (10%)
  - 6ª carta: **Rara** (60%), **Dupla Rara** (25%), **Arte Secreta** (10%),
    **Duplo Arte Secreta** (4.5%) ou **Legendária** (0.5%) — nunca Comum/Incomum
  - Dentro da raridade sorteada, a carta específica é escolhida com probabilidade uniforme
- Indicador visual de carta **"NOVA"** (1ª cópia) vs. duplicata, tanto na revelação quanto na
  coleção
- Coleção persistente (`localStorage`): contagem de cópias por carta, progresso agregado
  (total e por raridade), filtro por raridade, ordenada por raridade crescente + nome
- Interface 100% responsiva (mobile, tablet, desktop)

**Fora do escopo**: trocas entre jogadores, batalhas, login/conta de usuário, compra de
boosters (nenhum sistema de moeda — abrir pacotes é sempre grátis e ilimitado).

Especificação completa, decisões de design e histórico de clarificações em
[`specs/001-pokemon-tcg-boosters/`](specs/001-pokemon-tcg-boosters/) (`spec.md`, `plan.md`,
`research.md`, `data-model.md`, `contracts/`, `tasks.md`). Princípios do projeto (front-end
puro, persistência client-side, distribuição testável, responsividade obrigatória, assets
organizados em disco) em [`.specify/memory/constitution.md`](.specify/memory/constitution.md).

## Estrutura do projeto

```text
index.html                # Página única da aplicação
src/
├── boosters/              # Sorteio (draw.js) e animação de revelação (reveal.js)
├── collection/            # Persistência (store.js) e tela de coleção (view.js)
├── catalog/                # Carregamento do catálogo (assets/cards.json)
├── app.js                  # Bootstrap / wiring
└── styles/main.css          # Layout responsivo (Grid/Flexbox + media queries)
assets/                    # Imagens das cartas por raridade (.jpg) + cards.json (gerados, gitignored)
tools/download_cards.py    # Script de dev: baixa o catálogo real da API
tests/unit/                # Testes automatizados (Node + Python)
```

Mapeamento completo de diretórios em `specs/001-pokemon-tcg-boosters/plan.md` → "Project
Structure".

## Como rodar

1. Instale as dependências do script de dados (Python):

   ```sh
   pip install -r tools/requirements-dev.txt
   ```

2. Baixe o catálogo real de cartas do set 151 (sv3pt5) e gere os assets estáticos:

   ```sh
   python tools/download_cards.py
   ```

   > `assets/*.jpg` e `assets/cards.json` estão no `.gitignore` (são dados baixados da API, não
   > código-fonte) — **este passo é obrigatório**, o repositório não vem com nenhuma imagem
   > commitada. O script é idempotente: rodar de novo não baixa nada que já exista em disco.
   >
   > Se for publicar o site como arquivos estáticos (ex.: GitHub Pages), rode o download
   > primeiro e adicione os arquivos gerados explicitamente antes de commitar:
   > `git add -f assets/`.

3. Sirva os arquivos estáticos (não abra `index.html` direto como `file://` — o
   `fetch("assets/cards.json")` exige um servidor HTTP por causa de CORS):

   ```sh
   python -m http.server 8000
   ```

4. Abra `http://localhost:8000/` no navegador e clique em "Abrir pacote".

## Como testar

### Testes automatizados

```sh
npm test                                            # sorteio + persistência (Node --test)
python -m pytest tests/unit/download_cards_test.py    # idempotência + conversão JPEG (pytest)
```

Cobrem, entre outras coisas: distribuição estatística das posições 5ª/6ª dentro de ±2 pontos
percentuais (10.000+ simulações), unicidade das 6 cartas por pacote, persistência/contagem de
cópias em `localStorage` (com fallback se estiver bloqueado), tolerância a cartas removidas do
catálogo, e que o script de download gera JPEGs de verdade (não apenas bytes renomeados).

### Validação manual no navegador

Depois de rodar os passos de "Como rodar" acima, siga
[`specs/001-pokemon-tcg-boosters/quickstart.md`](specs/001-pokemon-tcg-boosters/quickstart.md)
para o roteiro completo: abrir pacote, conferir a coleção, testar o filtro por raridade e
checar a responsividade em diferentes tamanhos de tela.

Testado manualmente em Chromium, Firefox e Edge, em viewports mobile (~375px) e desktop
(~1920px), sem erros de console.

## Status

Todas as 3 user stories (abrir pacote, consultar coleção, filtrar por raridade) e as 30 tasks
de `specs/001-pokemon-tcg-boosters/tasks.md` estão implementadas e validadas. Veja
`tasks.md` para o detalhamento task a task.
