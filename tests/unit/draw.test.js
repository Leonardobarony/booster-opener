// Testa src/boosters/draw.js: unicidade, ordem, e a distribuição estatística exigida
// pelo Princípio III (Distribuição Probabilística Testável) e por FR-002/FR-004–FR-007/
// FR-019, SC-002. RNG seedado para reprodutibilidade.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSeededRng,
  pickRarityForPosition,
  pickCardForRarity,
  drawPack,
} from "../../src/boosters/draw.js";
import { RARITY_ORDER } from "../../src/catalog/catalog.js";

function buildMockCatalog() {
  const counts = {
    "01_comum": 20,
    "02_incomum": 10,
    "03_raras": 10,
    "04_duplo_raras": 5,
    "05_arte_secreta": 5,
    "06_duplo_arte_secreta": 5,
    "07_legendaria": 3,
  };
  const catalog = [];
  for (const [folder, count] of Object.entries(counts)) {
    for (let i = 1; i <= count; i++) {
      catalog.push({
        id: `${folder}-${i}`,
        name: `${folder} ${i}`,
        rarityFolder: folder,
        imagePath: "placeholder.jpg",
      });
    }
  }
  return catalog;
}

test("drawPack retorna 6 cartas distintas (FR-002)", () => {
  const catalog = buildMockCatalog();
  const rng = createSeededRng(42);
  const pack = drawPack(catalog, rng);
  assert.equal(pack.length, 6);
  const ids = new Set(pack.map((slot) => slot.card.id));
  assert.equal(ids.size, 6);
});

test("as 4 primeiras posições são sempre Comum (FR-004)", () => {
  const catalog = buildMockCatalog();
  for (let seed = 0; seed < 50; seed++) {
    const rng = createSeededRng(seed);
    const pack = drawPack(catalog, rng);
    for (let i = 0; i < 4; i++) {
      assert.equal(pack[i].card.rarityFolder, "01_comum");
    }
  }
});

test("o pacote é ordenado por raridade crescente (FR-007)", () => {
  const catalog = buildMockCatalog();
  const rng = createSeededRng(7);
  const pack = drawPack(catalog, rng);
  const orderIndexes = pack.map((slot) => RARITY_ORDER.indexOf(slot.card.rarityFolder));
  const sorted = [...orderIndexes].sort((a, b) => a - b);
  assert.deepEqual(orderIndexes, sorted);
});

test("6ª posição nunca é Comum nem Incomum (FR-006)", () => {
  const catalog = buildMockCatalog();
  for (let seed = 0; seed < 200; seed++) {
    const rng = createSeededRng(seed * 13 + 1);
    const pack = drawPack(catalog, rng);
    const sixth = pack.find((slot) => slot.position === 6);
    assert.ok(!["01_comum", "02_incomum"].includes(sixth.card.rarityFolder));
  }
});

test("distribuição da 5ª posição converge para 90/10 Incomum/Rara dentro de ±2pp (FR-005, SC-002)", () => {
  const rng = createSeededRng(123456789);
  const counts = { "02_incomum": 0, "03_raras": 0 };
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const rarity = pickRarityForPosition(5, rng);
    counts[rarity] += 1;
  }
  const incomumPct = (counts["02_incomum"] / N) * 100;
  const rarasPct = (counts["03_raras"] / N) * 100;
  assert.ok(Math.abs(incomumPct - 90) <= 2, `esperado ~90%, obtido ${incomumPct}%`);
  assert.ok(Math.abs(rarasPct - 10) <= 2, `esperado ~10%, obtido ${rarasPct}%`);
});

test("distribuição da 6ª posição converge para as porcentagens definidas dentro de ±2pp (FR-006, SC-002)", () => {
  const rng = createSeededRng(987654321);
  const expected = {
    "03_raras": 60,
    "04_duplo_raras": 25,
    "05_arte_secreta": 10,
    "06_duplo_arte_secreta": 4.5,
    "07_legendaria": 0.5,
  };
  const counts = Object.fromEntries(Object.keys(expected).map((k) => [k, 0]));
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const rarity = pickRarityForPosition(6, rng);
    counts[rarity] += 1;
  }
  for (const [rarity, expectedPct] of Object.entries(expected)) {
    const observedPct = (counts[rarity] / N) * 100;
    assert.ok(
      Math.abs(observedPct - expectedPct) <= 2,
      `raridade ${rarity}: esperado ~${expectedPct}%, obtido ${observedPct}%`
    );
  }
});

test("pickCardForRarity escolhe cartas dentro da raridade com frequência aproximadamente uniforme (FR-019)", () => {
  const catalog = buildMockCatalog();
  const pool = catalog.filter((c) => c.rarityFolder === "03_raras"); // 10 cartas
  const rng = createSeededRng(555);
  const counts = Object.fromEntries(pool.map((c) => [c.id, 0]));
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const card = pickCardForRarity(catalog, "03_raras", new Set(), rng);
    counts[card.id] += 1;
  }
  const expectedPct = 100 / pool.length; // 10%
  for (const [id, count] of Object.entries(counts)) {
    const observedPct = (count / N) * 100;
    assert.ok(
      Math.abs(observedPct - expectedPct) <= 2,
      `carta ${id}: esperado ~${expectedPct}%, obtido ${observedPct}%`
    );
  }
});

test("pickCardForRarity exclui ids já usados no mesmo pacote (FR-002)", () => {
  const catalog = buildMockCatalog();
  const rng = createSeededRng(1);
  const pool = catalog.filter((c) => c.rarityFolder === "01_comum");
  const excludeIds = new Set(pool.slice(0, pool.length - 1).map((c) => c.id));
  const card = pickCardForRarity(catalog, "01_comum", excludeIds, rng);
  assert.equal(card.id, pool[pool.length - 1].id); // só sobrou uma opção elegível
});

test("drawPack lança erro se não houver cartas suficientes de alguma raridade", () => {
  const tinyCatalog = [{ id: "c1", name: "C1", rarityFolder: "01_comum", imagePath: "x.jpg" }];
  const rng = createSeededRng(1);
  assert.throws(() => drawPack(tinyCatalog, rng));
});
