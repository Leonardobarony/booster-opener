# Boosters Pokémon TCG (set 151)

Jogo web de abertura de boosters do Pokémon TCG — front-end puro (HTML/CSS/JS, sem backend),
com coleção persistente em `localStorage`. Ver a especificação completa em
[`specs/001-pokemon-tcg-boosters/`](specs/001-pokemon-tcg-boosters/).

## Setup

1. Instale as dependências do script de dados (Python):

   ```sh
   pip install -r tools/requirements-dev.txt
   ```

2. Baixe o catálogo de cartas do set 151 (sv3pt5) e gere os assets estáticos:

   ```sh
   python tools/download_cards.py
   ```

   > **Nota**: o repositório já vem com um **catálogo placeholder** (32 cartas geradas
   > localmente) em `assets/`, só para permitir rodar a aplicação sem depender da API. Rode o
   > comando acima para substituí-lo pelo catálogo real antes de usar o jogo de verdade.
   >
   > `assets/*.jpg` e `assets/cards.json` estão no `.gitignore` (são dados baixados, não
   > código-fonte). Se for publicar o site como arquivos estáticos (ex.: GitHub Pages), rode o
   > download real primeiro e adicione os arquivos gerados explicitamente antes de commitar:
   > `git add -f assets/`.

3. Sirva os arquivos estáticos (não abra `index.html` direto como `file://` — o
   `fetch("assets/cards.json")` exige um servidor HTTP por causa de CORS):

   ```sh
   python -m http.server 8000
   ```

4. Abra `http://localhost:8000/` no navegador.

## Testes automatizados

```sh
npm test                                          # lógica de sorteio + persistência (Node)
python -m pytest tests/unit/download_cards_test.py  # idempotência do download (Python)
```

## Estrutura

Ver `specs/001-pokemon-tcg-boosters/plan.md` (seção "Project Structure") para o mapeamento
completo de diretórios, e `specs/001-pokemon-tcg-boosters/quickstart.md` para o roteiro de
validação manual das 3 user stories.
