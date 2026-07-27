// Camada de acesso ao catálogo de cartas (assets/cards.json).
// Contrato: specs/001-pokemon-tcg-boosters/contracts/cards-manifest.schema.json

export const RARITY_ORDER = [
  "01_comum",
  "02_incomum",
  "03_raras",
  "04_duplo_raras",
  "05_arte_secreta",
  "06_duplo_arte_secreta",
  "07_legendaria",
];

export const RARITY_DISPLAY_NAMES = {
  "01_comum": "Comum",
  "02_incomum": "Incomum",
  "03_raras": "Rara",
  "04_duplo_raras": "Dupla Rara",
  "05_arte_secreta": "Arte Secreta",
  "06_duplo_arte_secreta": "Duplo Arte Secreta",
  "07_legendaria": "Legendária",
};

/**
 * Carrega e valida o manifesto assets/cards.json.
 * @param {string} url Caminho do manifesto (default: "assets/cards.json").
 * @returns {Promise<Array<{id: string, name: string, rarityFolder: string, imagePath: string}>>}
 */
export async function loadCatalog(url = "assets/cards.json") {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Não foi possível carregar o catálogo (${url}): HTTP ${response.status}`);
  }
  const rawCards = await response.json();
  return rawCards.filter((card) => RARITY_ORDER.includes(card.rarityFolder));
}

/**
 * Indexa um catálogo já carregado por raridade, para consultas rápidas de sorteio/exibição.
 * @param {Array} catalog
 * @returns {Map<string, Array>} Map rarityFolder -> cartas daquela raridade
 */
export function indexByRarity(catalog) {
  const index = new Map(RARITY_ORDER.map((folder) => [folder, []]));
  for (const card of catalog) {
    index.get(card.rarityFolder)?.push(card);
  }
  return index;
}

/**
 * Retorna todas as cartas de uma raridade específica.
 * @param {Array} catalog
 * @param {string} rarityFolder
 */
export function getByRarity(catalog, rarityFolder) {
  return catalog.filter((card) => card.rarityFolder === rarityFolder);
}

/**
 * Quantidade total de cartas existentes por raridade (usado em FR-021/SC-007).
 * @param {Array} catalog
 * @returns {Record<string, number>}
 */
export function getTotalsByRarity(catalog) {
  const totals = Object.fromEntries(RARITY_ORDER.map((folder) => [folder, 0]));
  for (const card of catalog) {
    totals[card.rarityFolder] += 1;
  }
  return totals;
}

/**
 * Busca uma carta pelo id. Retorna undefined se a carta não existir mais no catálogo
 * atual (FR-018: coleção pode conter ids "órfãos" de um catálogo anterior).
 * @param {Array} catalog
 * @param {string} id
 */
export function findCardById(catalog, id) {
  return catalog.find((card) => card.id === id);
}
