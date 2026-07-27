// Bootstrap da aplicação: carrega o catálogo, alterna entre as telas e trata os
// estados de carregamento/erro. A lógica de abertura de pacote (US1) e de
// coleção/filtro (US2/US3) é conectada aqui nas fases correspondentes.
import { loadCatalog } from "./catalog/catalog.js";
import { createSeededRng, drawPack } from "./boosters/draw.js";
import { revealPack } from "./boosters/reveal.js";
import { renderCollectionView } from "./collection/view.js";

const views = {
  pack: document.getElementById("view-pack"),
  collection: document.getElementById("view-collection"),
};
const navButtons = {
  pack: document.getElementById("nav-pack"),
  collection: document.getElementById("nav-collection"),
};
const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const openPackButton = document.getElementById("open-pack-button");
const packRevealContainer = document.getElementById("pack-reveal");

/** Estado compartilhado da aplicação, populado após o catálogo carregar. */
export const appState = {
  catalog: [],
};

function showView(name) {
  for (const key of Object.keys(views)) {
    const isActive = key === name;
    views[key].hidden = !isActive;
    navButtons[key].setAttribute("aria-pressed", String(isActive));
  }
}

function wireNavigation() {
  navButtons.pack.addEventListener("click", () => showView("pack"));
  navButtons.collection.addEventListener("click", () => {
    renderCollectionView(appState.catalog); // sempre reflete o estado mais recente da coleção
    showView("collection");
  });
}

function wireOpenPack() {
  openPackButton.addEventListener("click", async () => {
    if (appState.catalog.length === 0) return;

    openPackButton.disabled = true;
    try {
      const rng = createSeededRng(Date.now() ^ (Math.random() * 0xffffffff));
      const pack = drawPack(appState.catalog, rng); // FR-001
      await revealPack(packRevealContainer, pack);
    } catch (error) {
      // Edge case: catálogo sem cartas suficientes em alguma raridade (não deveria
      // ocorrer com o catálogo real do set 151, mas evita travar a UI silenciosamente).
      console.error(error);
      packRevealContainer.textContent =
        "Não foi possível abrir o pacote: catálogo de cartas insuficiente. Rode tools/download_cards.py.";
    } finally {
      openPackButton.disabled = false;
    }
  });
}

async function bootstrap() {
  wireNavigation();
  wireOpenPack();
  loadingState.hidden = false;

  try {
    appState.catalog = await loadCatalog();
  } catch (error) {
    loadingState.hidden = true;
    errorState.hidden = false;
    errorState.textContent =
      "Não foi possível carregar o catálogo de cartas. Verifique se assets/cards.json existe " +
      "(rode tools/download_cards.py) e recarregue a página.";
    console.error(error);
    return;
  }

  loadingState.hidden = true;
  showView("pack");
}

bootstrap();
