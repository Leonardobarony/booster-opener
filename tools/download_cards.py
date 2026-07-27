#!/usr/bin/env python3
"""Baixa o catálogo de cartas do set Pokémon TCG 151 (sv3pt5) e gera os assets estáticos.

Ferramenta de desenvolvimento apenas (nunca executada em produção nem pelo navegador do
jogador) — ver contracts/download_cards-cli.md e research.md (secão 3) em
specs/001-pokemon-tcg-boosters/.
"""
import argparse
import io
import json
import os
import sys
import time
from pathlib import Path

import requests
from PIL import Image

API_BASE = "https://api.pokemontcg.io/v2/cards"
SET_QUERY = "set.id:sv3pt5"
PAGE_SIZE = 250

RARITY_TO_FOLDER = {
    "Common": "01_comum",
    "Uncommon": "02_incomum",
    "Rare": "03_raras",
    "Rare Holo": "03_raras",
    "Double Rare": "04_duplo_raras",
    "Ultra Rare": "04_duplo_raras",
    "Rare Holo EX": "04_duplo_raras",
    "Rare Holo GX": "04_duplo_raras",
    "Rare Holo V": "04_duplo_raras",
    "Rare Holo VMAX": "04_duplo_raras",
    "Illustration Rare": "05_arte_secreta",
    "Special Illustration Rare": "06_duplo_arte_secreta",
    "Rare Rainbow": "06_duplo_arte_secreta",
    "Rare Secret": "06_duplo_arte_secreta",
    "Hyper Rare": "07_legendaria",
}

RARITY_ORDER = [
    "01_comum",
    "02_incomum",
    "03_raras",
    "04_duplo_raras",
    "05_arte_secreta",
    "06_duplo_arte_secreta",
    "07_legendaria",
]


def map_rarity(rarity):
    """Retorna a pasta de destino para uma raridade crua da API, ou None se não mapeada."""
    return RARITY_TO_FOLDER.get(rarity)


def image_url_for(card):
    images = card.get("images", {}) or {}
    return images.get("large") or images.get("small")


def _get_with_retry(session, url, params=None, headers=None, retries=6, backoff=2.0):
    # A API pública (sem --api-key) é conhecida por retornar 500 intermitentes sob
    # carga; retries generosos com backoff crescente absorvem essa instabilidade.
    last_error = None
    for attempt in range(retries):
        try:
            response = session.get(url, params=params, headers=headers, timeout=30)
            response.raise_for_status()
            return response
        except requests.RequestException as exc:  # pragma: no cover - exercised via retries
            last_error = exc
            if attempt < retries - 1:
                time.sleep(min(backoff**attempt, 20))
    raise RuntimeError(f"Falha ao acessar {url}: {last_error}")


def fetch_all_cards(session, api_key=None):
    """Pagina a API pokemontcg.io e retorna a lista bruta de cartas do set sv3pt5."""
    cards = []
    page = 1
    headers = {"X-Api-Key": api_key} if api_key else {}
    while True:
        params = {"q": SET_QUERY, "page": page, "pageSize": PAGE_SIZE}
        response = _get_with_retry(session, API_BASE, params=params, headers=headers)
        data = response.json().get("data", [])
        if not data:
            break
        cards.extend(data)
        page += 1
    return cards


def download_image(session, url, dest_path):
    """Baixa `url` e salva em `dest_path` como um `.jpg` de verdade (não apenas a extensão).

    As imagens de `images.pokemontcg.io` são PNG (frequentemente com canal alpha);
    a FR original exige "cada carta salva como .jpg", então convertemos de fato o
    formato aqui em vez de apenas gravar os bytes crus com extensão trocada — do
    contrário o navegador recebe um PNG anunciado como `image/jpeg` e pode falhar
    ao renderizar (bug real observado em produção nesta feature).
    """
    response = _get_with_retry(session, url)
    image = Image.open(io.BytesIO(response.content))
    if image.mode in ("RGBA", "LA", "P"):
        # JPEG não suporta transparência: compõe sobre um fundo branco antes de converter.
        rgba = image.convert("RGBA")
        flattened = Image.new("RGB", rgba.size, (255, 255, 255))
        flattened.paste(rgba, mask=rgba.split()[-1])
        image = flattened
    else:
        image = image.convert("RGB")

    tmp_path = dest_path.with_suffix(dest_path.suffix + ".tmp")
    image.save(tmp_path, format="JPEG", quality=90)
    os.replace(tmp_path, dest_path)


def process_cards(raw_cards, out_dir, session):
    """Mapeia, baixa (idempotentemente) e monta o manifesto; retorna (manifest, contadores)."""
    manifest = []
    new_downloads = 0
    skipped_existing = 0
    ignored_unknown = 0

    for card in raw_cards:
        rarity = card.get("rarity")
        folder = map_rarity(rarity)
        if folder is None:
            print(f'WARN: raridade desconhecida "{rarity}" para carta {card.get("id")}, ignorada')
            ignored_unknown += 1
            continue

        card_id = card["id"]
        dest_dir = out_dir / folder
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / f"{card_id}.jpg"
        image_path = f"assets/{folder}/{card_id}.jpg"

        if dest_path.exists():
            # Idempotência (FR-016): imagem já presente localmente, não baixa de novo.
            skipped_existing += 1
        else:
            url = image_url_for(card)
            if url is None:
                print(f"WARN: carta {card_id} sem imagem disponível, ignorada")
                ignored_unknown += 1
                continue
            download_image(session, url, dest_path)
            new_downloads += 1

        manifest.append(
            {
                "id": card_id,
                "name": card.get("name", card_id),
                "rarityFolder": folder,
                "imagePath": image_path,
            }
        )

    manifest.sort(key=lambda entry: (RARITY_ORDER.index(entry["rarityFolder"]), entry["name"]))
    return manifest, new_downloads, skipped_existing, ignored_unknown


def write_manifest(manifest, out_dir):
    manifest_path = out_dir / "cards.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Baixa o catálogo de cartas do set Pokémon TCG 151 (sv3pt5)"
    )
    parser.add_argument("--out-dir", default="assets", help="Diretório raiz de saída (default: assets)")
    parser.add_argument(
        "--api-key",
        default=os.environ.get("POKEMONTCG_API_KEY"),
        help="Chave opcional da API pokemontcg.io (ou variável de ambiente POKEMONTCG_API_KEY)",
    )
    args = parser.parse_args(argv)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    try:
        raw_cards = fetch_all_cards(session, api_key=args.api_key)
    except RuntimeError as exc:
        print(f"ERROR: {exc}")
        return 1

    manifest, new_downloads, skipped_existing, ignored_unknown = process_cards(
        raw_cards, out_dir, session
    )
    write_manifest(manifest, out_dir)

    print(
        f"{len(manifest)} cartas no catálogo, {new_downloads} novas baixadas, "
        f"{skipped_existing} já existentes puladas, {ignored_unknown} ignoradas por raridade desconhecida"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
