// js/main.js

import { qs, qsa, on } from "./utils/dom.js";
import { CONFIG, STATE } from "./config.js";

import { initLoader, initIntroOverlay } from "./modules/intro.js";
import { initModalClone, initGrid3D } from "./modules/modal.js";

import { getCards, ensureCardScopes, buildTypesByScope } from "./modules/cards.js";
import { initScopeToggle } from "./modules/toggle.js";
import { initFilters } from "./modules/filters.js";

/**
 * Header auto-hide (petit module local)
 */
function initHeaderAutoHide() {
  const header = qs(".main-header");
  if (!header) return;

  let lastScrollY = window.scrollY;

  on(window, "scroll", () => {
    const current = window.scrollY;
    header.classList.toggle("hidden", current > lastScrollY && current > CONFIG.headerHideMinScroll);
    lastScrollY = current;
  }, { passive: true });
}

/**
 * Custom cursor (si présent)
 */
function initCustomCursor() {
  const dot = qs(".cursor-dot");
  const outline = qs(".cursor-outline");
  if (!dot || !outline) return;
  if (!CONFIG.supportsHover) return;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let ox = x;
  let oy = y;

  on(document, "mousemove", (e) => {
    x = e.clientX;
    y = e.clientY;

    dot.style.left = x + "px";
    dot.style.top = y + "px";
    dot.style.opacity = "1";

    outline.style.opacity = "1";
  });

  (function loop() {
    ox += (x - ox) * 0.15;
    oy += (y - oy) * 0.15;

    outline.style.left = ox + "px";
    outline.style.top = oy + "px";

    requestAnimationFrame(loop);
  })();
}

/**
 * CV modal (si présent)
 */
function initCVModal() {
  const openBtn = qs("#cv-open");
  const modal = qs("#cv-modal");
  const overlay = qs("#cv-overlay");
  const closeBtn = qs("#cv-close");

  if (!openBtn || !modal || !overlay || !closeBtn) return;

  const openCV = (e) => {
    e?.preventDefault();
    overlay.classList.add("active");
    modal.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  };

  const closeCV = () => {
    modal.classList.remove("active");
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  on(openBtn, "click", openCV);
  on(closeBtn, "click", closeCV);
  on(overlay, "click", closeCV);

  on(document, "keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) closeCV();
  });
}

/**
 * Lazy backgrounds via service (implémenté ci-dessous dans services/imageLoader.js)
 */
import { preloadImage } from "./services/imageLoader.js";
import { createIO } from "./utils/observer.js";

function initLazyBackgrounds() {
  const cards = qsa(".card");
  if (!cards.length) return;

  const load = (card) => {
    const src = card.dataset.bg;
    if (!src) return;

    preloadImage(
      src,
      (okSrc) => {
        card.style.backgroundImage = `url("${okSrc}")`;
        card.classList.remove("loading");
        card.classList.add("loaded");
      },
      () => {
        card.classList.remove("loading");
      }
    );
  };

  const io = createIO(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        load(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { rootMargin: CONFIG.lazyRootMargin, threshold: CONFIG.lazyThreshold }
  );

  if (!io) {
    cards.forEach(load);
    return;
  }

  cards.forEach((card) => {
    card.classList.add("loading");
    io.observe(card);
  });
}

/**
 * Bootstrap cartes : appelé après ton fetch cards.json (ou auto si déjà présentes)
 */
function bootstrapAfterCardsInternal() {
  if (STATE.cardsBootstrapped) return;
  STATE.cardsBootstrapped = true;

  const filtersEl = qs(".filters");
  const scopeToggleEl = qs("#scopeToggle");

  const cards = getCards();
  ensureCardScopes(cards);

  let typesByScope = buildTypesByScope(cards);

  let activeScope = "pro"; // par défaut
  let filtersController = null;

  const scopeGetter = () => activeScope;
  const typesByScopeGetter = () => typesByScope;

  // Init filters
  filtersController = initFilters({
    filtersEl,
    scopeGetter,
    typesByScopeGetter,
  });

  // Init toggle
  initScopeToggle(scopeToggleEl, activeScope, (scope) => {
    activeScope = scope;

    // Recompute types (si cartes évoluent dans le futur)
    const newCards = getCards();
    ensureCardScopes(newCards);
    typesByScope = buildTypesByScope(newCards);

    // Rebuild UI + apply
    filtersController?.rebuild();
  });

  // Lazy backgrounds
  initLazyBackgrounds();
}

// Compat : si ton index.html appelle encore window.bootstrapAfterCards()
window.bootstrapAfterCards = bootstrapAfterCardsInternal;

/**
 * Init global
 */
document.addEventListener("DOMContentLoaded", () => {
  initLoader();
  initIntroOverlay();

  initModalClone();
  initGrid3D();
  initHeaderAutoHide();
  initCustomCursor();
  initCVModal();

  // Si les cartes sont déjà dans le DOM au load, on bootstrap direct
  // Sinon, ton fetch appelle window.bootstrapAfterCards() en fin de rendu.
  if (qsa(".wrapper .card").length) {
    bootstrapAfterCardsInternal();
  }
});
