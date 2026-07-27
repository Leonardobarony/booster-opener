// Orquestra a revelação animada do pacote, carta a carta (FR-007, FR-008), e o
// destaque visual de "NOVA" vs. duplicata (FR-020) via collection/store.js.
import { addCard } from "../collection/store.js";

const REVEAL_DELAY_MS = 450; // pausa entre a virada de uma carta e o início da próxima
const FLIP_FALLBACK_MS = 700; // fallback caso o evento transitionend não dispare

function createSlotElement(slot) {
  const group = document.createElement("div");
  group.dataset.cardId = slot.card.id;

  const wrapper = document.createElement("div");
  wrapper.className = "pack-card";
  wrapper.dataset.position = String(slot.position);

  const inner = document.createElement("div");
  inner.className = "pack-card-inner";

  const back = document.createElement("div");
  back.className = "pack-card-face back";
  back.textContent = "?";

  const front = document.createElement("div");
  front.className = "pack-card-face front";

  const img = document.createElement("img");
  img.src = slot.card.imagePath;
  img.alt = slot.card.name;
  front.appendChild(img);

  inner.append(back, front);
  wrapper.appendChild(inner);

  const nameEl = document.createElement("p");
  nameEl.className = "pack-card-name";
  nameEl.textContent = slot.card.name;

  group.append(wrapper, nameEl);
  return { group, wrapper, inner, front };
}

function waitForFlip(inner) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      inner.removeEventListener("transitionend", finish);
      resolve();
    };
    inner.addEventListener("transitionend", finish, { once: true });
    setTimeout(finish, FLIP_FALLBACK_MS);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Renderiza e revela um pacote de 6 cartas, uma de cada vez, em ordem crescente de
 * raridade (o `pack` já deve chegar ordenado por `drawPack`). Cada carta é
 * confirmada na coleção (`store.addCard`) no momento em que é revelada.
 * @param {HTMLElement} container
 * @param {Array<{position:number, card:object}>} pack
 * @param {{ onCardRevealed?: (info: {slot: object, isNew: boolean, copies: number}) => void, onComplete?: () => void }} [options]
 */
export async function revealPack(container, pack, options = {}) {
  container.innerHTML = "";
  const elements = pack.map((slot) => {
    const els = createSlotElement(slot);
    container.appendChild(els.group);
    return els;
  });

  for (let i = 0; i < pack.length; i += 1) {
    const slot = pack[i];
    const { wrapper, inner, front } = elements[i];

    const { isNew, copies } = addCard(slot.card.id); // FR-010, FR-020

    if (isNew) {
      const badge = document.createElement("span");
      badge.className = "pack-card-badge";
      badge.textContent = "NOVA";
      front.appendChild(badge);
    }

    wrapper.classList.add("is-revealed");
    await waitForFlip(inner);

    options.onCardRevealed?.({ slot, isNew, copies });

    if (i < pack.length - 1) {
      await wait(REVEAL_DELAY_MS);
    }
  }

  options.onComplete?.();
}
