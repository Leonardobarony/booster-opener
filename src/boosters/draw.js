// Lógica pura de sorteio de pacote (Princípio III: Distribuição Probabilística Testável).
// Contrato: specs/001-pokemon-tcg-boosters/contracts/draw-module.md

import { RARITY_ORDER } from "../catalog/catalog.js";

// FR-005: 5ª posição — Incomum 90% / Rara 10%
const POSITION_5_TABLE = [
  ["02_incomum", 0.9],
  ["03_raras", 0.1],
];

// FR-006: 6ª posição — nunca Comum/Incomum
const POSITION_6_TABLE = [
  ["03_raras", 0.6],
  ["04_duplo_raras", 0.25],
  ["05_arte_secreta", 0.1],
  ["06_duplo_arte_secreta", 0.045],
  ["07_legendaria", 0.005],
];

/**
 * PRNG determinístico (mulberry32). Aceita uma seed inteira e retorna uma função
 * geradora de floats em [0, 1), reproduzível para testes (Princípio III).
 * @param {number} seed
 * @returns {() => number}
 */
export function createSeededRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleFromTable(table, rng) {
  const roll = rng();
  let cumulative = 0;
  for (const [rarityFolder, probability] of table) {
    cumulative += probability;
    if (roll < cumulative) return rarityFolder;
  }
  // Proteção contra erro de ponto flutuante: retorna a última opção da tabela.
  return table[table.length - 1][0];
}

/**
 * Sorteia a raridade de uma posição do pacote (1–6).
 * @param {number} position 1 a 6
 * @param {() => number} rng
 * @returns {string} rarityFolder
 */
export function pickRarityForPosition(position, rng) {
  if (position >= 1 && position <= 4) return "01_comum"; // FR-004
  if (position === 5) return sampleFromTable(POSITION_5_TABLE, rng); // FR-005
  if (position === 6) return sampleFromTable(POSITION_6_TABLE, rng); // FR-006
  throw new Error(`Posição de pacote inválida: ${position}`);
}

/**
 * Escolhe uma carta específica dentro de uma raridade, com probabilidade uniforme
 * entre as cartas elegíveis (FR-019), excluindo ids já usados no mesmo pacote (FR-002).
 * @param {Array} catalog
 * @param {string} rarityFolder
 * @param {Set<string>} excludeIds
 * @param {() => number} rng
 */
export function pickCardForRarity(catalog, rarityFolder, excludeIds, rng) {
  const pool = catalog.filter(
    (card) => card.rarityFolder === rarityFolder && !excludeIds.has(card.id)
  );
  if (pool.length === 0) {
    throw new Error(
      `Não há cartas elegíveis da raridade "${rarityFolder}" (todas já usadas neste pacote ou catálogo insuficiente)`
    );
  }
  const index = Math.floor(rng() * pool.length);
  return pool[index];
}

/**
 * Sorteia um pacote completo de 6 cartas distintas, já ordenado por raridade
 * crescente (FR-007).
 * @param {Array} catalog
 * @param {() => number} rng
 * @returns {Array<{ position: number, card: object }>}
 */
export function drawPack(catalog, rng) {
  const excludeIds = new Set();
  const slots = [];

  for (let position = 1; position <= 6; position += 1) {
    const rarityFolder = pickRarityForPosition(position, rng);
    const card = pickCardForRarity(catalog, rarityFolder, excludeIds, rng);
    excludeIds.add(card.id);
    slots.push({ position, card });
  }

  slots.sort((a, b) => RARITY_ORDER.indexOf(a.card.rarityFolder) - RARITY_ORDER.indexOf(b.card.rarityFolder));
  return slots;
}
