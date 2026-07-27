// Testa src/collection/store.js com um mock de localStorage em memória.
// Ver specs/001-pokemon-tcg-boosters/contracts/store-module.md.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

function createFakeLocalStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

globalThis.localStorage = createFakeLocalStorage();

const { addCard, getCopies, getEntries, getProgress, _resetForTests } = await import(
  "../../src/collection/store.js"
);

beforeEach(() => {
  globalThis.localStorage.clear();
  _resetForTests();
});

test("addCard marca a primeira cópia como nova e incrementa nas repetições (FR-010, FR-020)", () => {
  const first = addCard("card-1");
  assert.deepEqual(first, { isNew: true, copies: 1 });

  const second = addCard("card-1");
  assert.deepEqual(second, { isNew: false, copies: 2 });
});

test("getCopies retorna 0 para uma carta nunca obtida", () => {
  assert.equal(getCopies("nunca-obtida"), 0);
});

test("getEntries reflete todas as cartas adicionadas (FR-009, FR-011)", () => {
  addCard("a");
  addCard("b");
  addCard("a");

  const entries = getEntries().sort((x, y) => x.id.localeCompare(y.id));
  assert.deepEqual(entries, [
    { id: "a", copies: 2 },
    { id: "b", copies: 1 },
  ]);
});

test("getProgress calcula totais e tolera cartas 'órfãs' removidas do catálogo (FR-018, FR-021)", () => {
  const catalog = [
    { id: "a", rarityFolder: "01_comum" },
    { id: "b", rarityFolder: "01_comum" },
    { id: "c", rarityFolder: "02_incomum" },
  ];
  addCard("a"); // obtida, existe no catálogo
  addCard("orfa-x"); // obtida, mas não existe mais no catálogo atual (FR-018)

  const progress = getProgress(catalog);
  assert.equal(progress.total.obtained, 2); // conta "a" e "orfa-x"
  assert.equal(progress.total.total, 3);
  assert.equal(progress.byRarity["01_comum"].obtained, 1);
  assert.equal(progress.byRarity["01_comum"].total, 2);
  assert.equal(progress.byRarity["02_incomum"].obtained, 0);
  assert.equal(progress.byRarity["02_incomum"].total, 1);
});

test("degrada graciosamente para memória se localStorage lançar erro (edge case: bloqueado/cheio)", () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      throw new Error("bloqueado");
    },
    setItem() {
      throw new Error("bloqueado");
    },
  };
  _resetForTests();

  const result = addCard("x");
  assert.deepEqual(result, { isNew: true, copies: 1 });
  assert.equal(getCopies("x"), 1);

  globalThis.localStorage = original;
  _resetForTests();
});
