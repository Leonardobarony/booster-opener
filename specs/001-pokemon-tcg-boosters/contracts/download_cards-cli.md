# Contrato: `tools/download_cards.py` (CLI)

Ferramenta de desenvolvimento (não faz parte do runtime servido ao jogador — ver Constitution
Check). É o único componente do projeto que fala com a rede/API externa.

## Invocação

```sh
python tools/download_cards.py [--out-dir assets] [--api-key KEY]
```

| Argumento | Obrigatório | Default | Descrição |
|---|---|---|---|
| `--out-dir` | não | `assets` | Diretório raiz onde as 7 pastas de raridade e `cards.json` são escritos. |
| `--api-key` | não | lido de `POKEMONTCG_API_KEY` se presente, senão nenhum | Chave opcional da API pokemontcg.io (aumenta rate limit; a API funciona sem chave para volumes pequenos como o set 151). |

## Comportamento

1. Busca todas as cartas com `set.id:sv3pt5` em `https://api.pokemontcg.io/v2/cards`, paginando
   até esgotar os resultados.
2. Para cada carta, resolve a pasta de raridade (tabela fixa — ver `research.md` §3). Raridades
   não mapeadas geram um aviso em stdout (`WARN: raridade desconhecida "<x>" para carta <id>,
   ignorada`) e são puladas — não interrompem a execução.
3. Para cada carta mapeada, verifica se `<out-dir>/<pasta>/<id>.jpg` já existe:
   - Se existir → pula o download desta carta (idempotência, FR-016).
   - Se não existir → baixa `images.large` (fallback `images.small`) e salva como `.jpg`.
4. Ao final, (re)escreve `<out-dir>/cards.json` com o manifesto completo (todas as cartas
   mapeadas, existentes ou recém-baixadas), no formato de `contracts/cards-manifest.schema.json`.

## Saída / códigos de saída

| Cenário | Exit code | stdout |
|---|---|---|
| Sucesso (com ou sem novos downloads) | `0` | Resumo: `X cartas no catálogo, Y novas baixadas, Z já existentes puladas, W ignoradas por raridade desconhecida`. |
| Falha de rede/API (após esgotar retries) | `1` | Mensagem de erro descrevendo a falha; nenhum arquivo parcialmente corrompido é deixado para trás (download para arquivo temporário + rename atômico). |

## Garantia de idempotência (FR-016)

Executar o script duas vezes seguidas, sem alterações no set na API, produz exatamente o mesmo
conteúdo em `assets/` na segunda execução, sem re-baixar nenhuma imagem já presente e sem
duplicar arquivos. Validado por `tests/unit/download_cards_test.py` mockando a API e chamando o
script duas vezes sobre um diretório temporário.
