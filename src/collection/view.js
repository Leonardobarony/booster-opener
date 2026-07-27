// Renderização da tela de Coleção: progresso agregado (FR-021), grade ordenada
// (FR-022), contagem de cópias (FR-011) e filtro por raridade (FR-012).
import { getEntries, getProgress } from "./store.js";
import { RARITY_ORDER, RARITY_DISPLAY_NAMES, findCardById } from "../catalog/catalog.js";

const progressContainer = document.getElementById("collection-progress");
const filtersContainer = document.getElementById("collection-filters");
const emptyState = document.getElementById("collection-empty");
const gridContainer = document.getElementById("collection-grid");

let activeFilter = null; // null = "todas"
let currentCatalog = [];

function buildOwnedCards(catalog) {
  const owned = [];
  for (const entry of getEntries()) {
    const card = findCardById(catalog, entry.id);
    if (!card) continue; // FR-018: carta "órfã" (removida da fonte) permanece no store, mas não na grade
    owned.push({ ...card, copies: entry.copies });
  }
  return owned;
}

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    const rarityDiff = RARITY_ORDER.indexOf(a.rarityFolder) - RARITY_ORDER.indexOf(b.rarityFolder);
    if (rarityDiff !== 0) return rarityDiff;
    return a.name.localeCompare(b.name); // FR-022
  });
}

function renderProgress(catalog) {
  const progress = getProgress(catalog);
  progressContainer.innerHTML = "";

  const totalPill = document.createElement("span");
  totalPill.className = "progress-pill";
  totalPill.textContent = `Total: ${progress.total.obtained}/${progress.total.total}`;
  progressContainer.appendChild(totalPill);

  for (const folder of RARITY_ORDER) {
    const { obtained, total } = progress.byRarity[folder];
    const pill = document.createElement("span");
    pill.className = `progress-pill rarity-${folder}`;
    pill.textContent = `${RARITY_DISPLAY_NAMES[folder]}: ${obtained}/${total}`;
    progressContainer.appendChild(pill);
  }
}

function setFilter(folder) {
  activeFilter = folder;
  renderFilters();
  renderGrid(currentCatalog);
}

function renderFilters() {
  filtersContainer.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "filter-button";
  allButton.textContent = "Todas";
  allButton.setAttribute("aria-pressed", String(activeFilter === null));
  allButton.addEventListener("click", () => setFilter(null));
  filtersContainer.appendChild(allButton);

  for (const folder of RARITY_ORDER) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button";
    button.textContent = RARITY_DISPLAY_NAMES[folder];
    button.setAttribute("aria-pressed", String(activeFilter === folder));
    button.addEventListener("click", () => setFilter(folder));
    filtersContainer.appendChild(button);
  }
}

function renderGrid(catalog) {
  const owned = buildOwnedCards(catalog);
  const filtered = activeFilter ? owned.filter((card) => card.rarityFolder === activeFilter) : owned;
  const sorted = sortCards(filtered);

  gridContainer.innerHTML = "";

  if (owned.length === 0) {
    // Edge case: nenhum pacote aberto ainda.
    emptyState.hidden = false;
    emptyState.textContent = "Nenhuma carta obtida ainda. Abra um pacote para começar sua coleção!";
  } else if (filtered.length === 0) {
    // Edge case: filtro aplicado para uma raridade sem nenhuma carta obtida.
    emptyState.hidden = false;
    emptyState.textContent = `Você ainda não possui nenhuma carta da raridade "${RARITY_DISPLAY_NAMES[activeFilter]}".`;
  } else {
    emptyState.hidden = true;
  }

  for (const card of sorted) {
    const el = document.createElement("div");
    el.className = `collection-card rarity-${card.rarityFolder}`;

    const img = document.createElement("img");
    img.src = card.imagePath;
    img.alt = card.name;
    el.appendChild(img);

    const name = document.createElement("p");
    name.className = "card-name";
    name.textContent = card.name;
    el.appendChild(name);

    const copies = document.createElement("p");
    copies.className = "copies";
    copies.textContent = `Cópias: ${card.copies}`;
    el.appendChild(copies);

    gridContainer.appendChild(el);
  }
}

/**
 * Renderiza a tela de coleção completa: progresso agregado, filtros de raridade e
 * a grade de cartas obtidas (FR-011, FR-012, FR-021, FR-022).
 * @param {Array} catalog
 */
export function renderCollectionView(catalog) {
  currentCatalog = catalog;
  renderProgress(catalog);
  renderFilters();
  renderGrid(catalog);
}
