"""Testa a idempotência (FR-016) e o tratamento de raridade desconhecida de download_cards.py.

A API pokemontcg.io é mockada — estes testes nunca fazem chamadas de rede reais.
Ver specs/001-pokemon-tcg-boosters/contracts/download_cards-cli.md.
"""
import json
import sys
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools"))
import download_cards  # noqa: E402


FAKE_CARDS_PAGE_1 = [
    {
        "id": "sv3pt5-1",
        "name": "Bulbasaur",
        "rarity": "Common",
        "images": {
            "large": "https://example.com/sv3pt5-1_large.png",
            "small": "https://example.com/sv3pt5-1_small.png",
        },
    },
    {
        "id": "sv3pt5-2",
        "name": "Charmander",
        "rarity": "Uncommon",
        "images": {"large": "https://example.com/sv3pt5-2_large.png"},
    },
]


class FakeResponse:
    def __init__(self, json_data=None, content=b"fake-image-bytes"):
        self._json_data = json_data
        self.content = content

    def raise_for_status(self):
        return None

    def json(self):
        return self._json_data


def _fake_get_factory(cards_page_1):
    def fake_get(url, params=None, headers=None, timeout=None):
        if url == download_cards.API_BASE:
            if params["page"] == 1:
                return FakeResponse(json_data={"data": cards_page_1})
            return FakeResponse(json_data={"data": []})
        # Chamada de download de imagem de carta.
        return FakeResponse(content=b"fake-image-bytes")

    return fake_get


def _make_fake_session(cards_page_1):
    session = MagicMock()
    session.get.side_effect = _fake_get_factory(cards_page_1)
    return session


def test_download_is_idempotent(tmp_path, monkeypatch):
    out_dir = tmp_path / "assets"

    session = _make_fake_session(FAKE_CARDS_PAGE_1)
    monkeypatch.setattr(download_cards.requests, "Session", lambda: session)

    exit_code_1 = download_cards.main(["--out-dir", str(out_dir)])
    assert exit_code_1 == 0

    manifest_path = out_dir / "cards.json"
    assert manifest_path.exists()
    manifest_after_first_run = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert len(manifest_after_first_run) == 2

    common_jpg = out_dir / "01_comum" / "sv3pt5-1.jpg"
    uncommon_jpg = out_dir / "02_incomum" / "sv3pt5-2.jpg"
    assert common_jpg.exists()
    assert uncommon_jpg.exists()

    mtime_before = common_jpg.stat().st_mtime_ns

    # Segunda execução: mesmos dados da API, arquivos já existem localmente.
    session_2 = _make_fake_session(FAKE_CARDS_PAGE_1)
    monkeypatch.setattr(download_cards.requests, "Session", lambda: session_2)
    exit_code_2 = download_cards.main(["--out-dir", str(out_dir)])
    assert exit_code_2 == 0

    mtime_after = common_jpg.stat().st_mtime_ns
    assert mtime_after == mtime_before  # não foi re-baixado (FR-016)

    manifest_after_second_run = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest_after_second_run == manifest_after_first_run


def test_unknown_rarity_is_ignored_not_fatal(tmp_path, monkeypatch):
    out_dir = tmp_path / "assets"

    cards_with_unknown = FAKE_CARDS_PAGE_1 + [
        {
            "id": "sv3pt5-999",
            "name": "Misterioso",
            "rarity": "Raridade Desconhecida",
            "images": {"large": "https://example.com/sv3pt5-999.png"},
        }
    ]

    session = _make_fake_session(cards_with_unknown)
    monkeypatch.setattr(download_cards.requests, "Session", lambda: session)

    exit_code = download_cards.main(["--out-dir", str(out_dir)])
    assert exit_code == 0

    manifest = json.loads((out_dir / "cards.json").read_text(encoding="utf-8"))
    assert len(manifest) == 2  # a carta de raridade desconhecida foi ignorada, não quebrou o run


def test_rarity_mapping_matches_the_real_pokemontcg_io_strings():
    # Regressão: a API retorna "Ultra Rare", não "Rare Ultra" como no enunciado original
    # (confirmado ao rodar o script de verdade contra o set sv3pt5 — ver tasks.md T007).
    assert download_cards.map_rarity("Ultra Rare") == "04_duplo_raras"
    assert download_cards.map_rarity("Rare Ultra") is None
    assert download_cards.map_rarity("Double Rare") == "04_duplo_raras"
    assert download_cards.map_rarity("Illustration Rare") == "05_arte_secreta"
    assert download_cards.map_rarity("Special Illustration Rare") == "06_duplo_arte_secreta"
    assert download_cards.map_rarity("Hyper Rare") == "07_legendaria"
