// js/modules/filters.js

import { qs, qsa, on } from "../utils/dom.js";
import { CONFIG } from "../config.js";
import { getCards, getCardTypes, cardHasScope } from "./cards.js";

/**
 * Lit la couleur CSS d'une classe (type) pour l'appliquer en variable.
 */
function applyFilterColorsFromCSS(filtersRoot) {
  const btns = qsa(".filter-btn", filtersRoot);

  btns.forEach((btn) => {
    const type = btn.dataset.filter;

    if (type === "all") {
      btn.style.setProperty("--filter-color", "#fff");
      btn.style.color = "#000";
      return;
    }

    const temp = document.createElement("div");
    temp.className = type;
    temp.style.visibility = "hidden";
    document.body.appendChild(temp);

    const color = getComputedStyle(temp).backgroundColor;
    temp.remove();

    btn.style.setProperty("--filter-color", color);
    btn.style.color = btn.classList.contains("active") ? "#000" : color;
  });
}

/**
 * Drag scroll sur mobile (long press) pour la barre de filtres
 */
function enableFiltersDragScroll(filtersEl) {
  let isDown = false;
  let dragActive = false;
  let pointerId = null;

  let startX = 0;
  let startScrollLeft = 0;
  let pressTimer = null;

  const DRAG_LONG_PRESS = 160;

  function end() {
    clearTimeout(pressTimer);
    isDown = false;
    dragActive = false;
    pointerId = null;
    filtersEl.classList.remove("is-dragging");
  }

  on(filtersEl, "pointerdown", (e) => {
    // uniquement coarse pointer
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;

    isDown = true;
    dragActive = false;
    pointerId = e.pointerId ?? null;

    startX = e.clientX;
    startScrollLeft = filtersEl.scrollLeft;

    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      if (!isDown) return;
      dragActive = true;
      filtersEl.classList.add("is-dragging");
    }, DRAG_LONG_PRESS);
  });

  on(document, "pointermove", (e) => {
    if (!isDown) return;
    if (pointerId !== null && e.pointerId !== pointerId) return;
    if (!dragActive) return;

    e.preventDefault();
    const dx = e.clientX - startX;
    filtersEl.scrollLeft = startScrollLeft - dx;
  }, { passive: false });

  on(document, "pointerup", (e) => {
    if (!isDown) return;
    if (pointerId !== null && e.pointerId !== pointerId) return;
    end();
  });

  on(document, "pointercancel", (e) => {
    if (!isDown) return;
    if (pointerId !== null && e.pointerId !== pointerId) return;
    end();
  });

  // Bloque le click si on était en drag
  on(filtersEl, "click", (e) => {
    if (filtersEl.classList.contains("is-dragging")) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
}

/**
 * Initialise le système de filtres.
 * Retourne un "controller" pour rafraîchir les types quand les cartes changent.
 */
export function initFilters({ filtersEl, scopeGetter, typesByScopeGetter, onFiltersChange }) {
  if (!filtersEl) return null;

  let activeFilters = new Set();

  function buildUI() {
    const scope = scopeGetter();
    const types = typesByScopeGetter()?.[scope] || [];

    filtersEl.innerHTML = "";

    const allBtn = document.createElement("div");
    allBtn.className = "filter-btn";
    allBtn.dataset.filter = "all";
    allBtn.innerHTML = `Tous <span class="filter-count"></span>`;
    filtersEl.appendChild(allBtn);

    types.forEach((type) => {
      const btn = document.createElement("div");
      btn.className = "filter-btn";
      btn.dataset.filter = type;
      btn.innerHTML = `${type} <span class="filter-count"></span>`;
      filtersEl.appendChild(btn);
    });

    applyFilterColorsFromCSS(filtersEl);
  }

  function updateUI() {
    const scope = scopeGetter();
    const cards = getCards().filter((c) => cardHasScope(c, scope));
    const allBtn = qs('[data-filter="all"]', filtersEl);

    if (allBtn) {
      allBtn.classList.toggle("active", activeFilters.size === 0);
      const countEl = qs(".filter-count", allBtn);
      if (countEl) countEl.textContent = String(cards.length);
    }

    // Pour chaque filtre, calcule combien de cartes matcheraient si on l'ajoute
    qsa(".filter-btn", filtersEl)
      .filter((b) => b.dataset.filter !== "all")
      .forEach((btn) => {
        const type = btn.dataset.filter;
        let count = 0;

        cards.forEach((card) => {
          const test = new Set(activeFilters);
          test.add(type);

          const types = getCardTypes(card);
          const ok = [...test].every((f) => types.includes(f));
          if (ok) count++;
        });

        btn.classList.toggle("active", activeFilters.has(type));

        const disabled = count === 0;
        btn.classList.toggle("disabled", disabled);
        btn.dataset.disabled = disabled ? "true" : "false";

        const countEl = qs(".filter-count", btn);
        if (countEl) countEl.textContent = String(count);
      });
  }

  function applyFilters() {
    const scope = scopeGetter();
    const cards = getCards();

    cards.forEach((card) => {
      if (!cardHasScope(card, scope)) {
        card.style.display = "none";
        card.classList.remove("is-hiding");
        return;
      }

      const types = getCardTypes(card);
      const match = [...activeFilters].every((f) => types.includes(f));

      if (match) {
        card.style.display = "";
        card.classList.remove("is-hiding");
      } else {
        card.classList.add("is-hiding");
        window.setTimeout(() => {
          card.style.display = "none";
        }, CONFIG.hideAnimMs);
      }
    });

    updateUI();
    onFiltersChange?.(activeFilters);
  }

  // Delegation click
  on(filtersEl, "click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    if (btn.dataset.disabled === "true") return;

    const filter = btn.dataset.filter;
    if (filter === "all") {
      activeFilters.clear();
    } else {
      activeFilters.has(filter) ? activeFilters.delete(filter) : activeFilters.add(filter);
    }

    applyFilters();
  });

  enableFiltersDragScroll(filtersEl);

  // API controller
  const controller = {
    rebuild() {
      buildUI();
      // prune si le scope a changé
      applyFilters();
    },
    reset() {
      activeFilters.clear();
      applyFilters();
    },
    apply() {
      applyFilters();
    },
    setActiveFilters(nextSet) {
      activeFilters = new Set(nextSet);
      applyFilters();
    },
    getActiveFilters() {
      return new Set(activeFilters);
    },
  };

  // init
  buildUI();
  applyFilters();

  return controller;
}
