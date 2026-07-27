// Persistência da Coleção do Jogador (Princípio II: Persistência Client-Side).
// Contrato: specs/001-pokemon-tcg-boosters/contracts/store-module.md

import { RARITY_ORDER } from "../catalog/catalog.js";

const STORAGE_KEY = "pokemon-tcg-collection:v1";
const SCHEMA_VERSION = 1;

// Fallback em memória usado somente se localStorage estiver indisponível/bloqueado
// (edge case: modo privado restritivo, armazenamento cheio, etc.).
let memoryState = null;
let useMemoryFallback = false;

function emptyState() {
  return { version: SCHEMA_VERSION, cards: {} };
}

function readState() {
  if (useMemoryFallback) {
    return memoryState ?? (memoryState = emptyState());
  }
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.cards !== "object") {
      return emptyState();
    }
    return { version: parsed.version ?? SCHEMA_VERSION, cards: parsed.cards };
  } catch {
    useMemoryFallback = true;
    memoryState = emptyState();
    return memoryState;
  }
}

function writeState(state) {
  if (useMemoryFallback) {
    memoryState = state;
    return;
  }
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    useMemoryFallback = true;
    memoryState = state;
  }
}

/**
 * Registra a obtenção de uma cópia da carta `cardId`.
 * @param {string} cardId
 * @returns {{ isNew: boolean, copies: number }}
 */
export function addCard(cardId) {
  const state = readState();
  const previousCopies = state.cards[cardId] ?? 0;
  const copies = previousCopies + 1;
  state.cards[cardId] = copies;
  writeState(state);
  return { isNew: previousCopies === 0, copies };
}

/**
 * @param {string} cardId
 * @returns {number} Quantidade de cópias já obtidas (0 se nunca obtida).
 */
export function getCopies(cardId) {
  const state = readState();
  return state.cards[cardId] ?? 0;
}

/**
 * @returns {Array<{ id: string, copies: number }>} Todas as entradas da coleção.
 */
export function getEntries() {
  const state = readState();
  return Object.entries(state.cards).map(([id, copies]) => ({ id, copies }));
}

/**
 * Progresso agregado de coleção (FR-021/SC-007), cruzando as cartas obtidas com o
 * catálogo atual. Cartas obtidas que não existem mais no catálogo (FR-018) contam
 * para `obtained` mas não para `total`.
 * @param {Array<{id: string, rarityFolder: string}>} catalog
 * @returns {{ total: {obtained: number, total: number}, byRarity: Record<string, {obtained: number, total: number}> }}
 */
export function getProgress(catalog) {
  const ownedIds = new Set(Object.keys(readState().cards));

  const totalsByRarity = Object.fromEntries(RARITY_ORDER.map((folder) => [folder, 0]));
  const rarityByCardId = new Map();
  for (const card of catalog) {
    totalsByRarity[card.rarityFolder] = (totalsByRarity[card.rarityFolder] ?? 0) + 1;
    rarityByCardId.set(card.id, card.rarityFolder);
  }

  const obtainedByRarity = Object.fromEntries(RARITY_ORDER.map((folder) => [folder, 0]));
  for (const id of ownedIds) {
    const folder = rarityByCardId.get(id);
    if (folder) obtainedByRarity[folder] += 1;
  }

  const byRarity = Object.fromEntries(
    RARITY_ORDER.map((folder) => [
      folder,
      { obtained: obtainedByRarity[folder], total: totalsByRarity[folder] },
    ])
  );

  const total = {
    obtained: ownedIds.size,
    total: catalog.length,
  };

  return { total, byRarity };
}

/** Reservado para testes: força o uso do fallback em memória e reseta o estado. */
export function _resetForTests({ forceMemoryFallback = false } = {}) {
  useMemoryFallback = forceMemoryFallback;
  memoryState = forceMemoryFallback ? emptyState() : null;
}
