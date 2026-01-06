/* =====================================================
   SCRIPT PRINCIPAL — Vanilla JS
   Cartes / Modale / Filtres / UI
   - Réécrit sans jQuery
   - Commenté + optimisé (delegation, RAF, data-attrs)
   - Compatible avec ton bootstrapAfterCards appelé après fetch
   ===================================================== */

/* =====================================================
   CONFIG GLOBALE
   ===================================================== */

const SUPPORTS_HOVER = window.matchMedia("(hover: hover)").matches;
const TILT_LIMIT = 15;

// Clone/modal actif
let activeClone = null;

// Empêche les doubles inits si on relance après fetch
let cardsBootstrapped = false;

/* =====================================================
   HELPERS (DOM + utils)
   ===================================================== */

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function on(el, type, handler, options) {
  el.addEventListener(type, handler, options);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getPointerPoint(e) {
  // PointerEvent / MouseEvent
  if (typeof e.clientX === "number" && typeof e.clientY === "number") {
    return { x: e.clientX, y: e.clientY };
  }
  // TouchEvent fallback (rare si pointer events)
  const t = e.touches && e.touches[0];
  return { x: t?.clientX ?? 0, y: t?.clientY ?? 0 };
}

function isCoarsePointer(e) {
  // PointerEvent fournit pointerType ; sinon, on infère
  return e.pointerType === "touch" || e.pointerType === "pen";
}

/* =====================================================
   3D EFFECT — reset / far check / apply
   ===================================================== */

function resetCard(cardEl) {
  const isClone = cardEl.classList.contains("card-clone");
  const base = isClone
    ? "translate(-50%, -50%) perspective(1000px)"
    : "perspective(1000px)";

  // Box-shadow identique à ton thème (cf. CSS variables)
  cardEl.style.boxShadow =
    "0px 0px 3px rgba(0,0,0,0.051), " +
    "0px 0px 7.2px rgba(0,0,0,0.073), " +
    "0px 0px 13.6px rgba(0,0,0,0.09), " +
    "0px 0px 24.3px rgba(0,0,0,0.107), " +
    "0px 0px 45.5px rgba(0,0,0,0.129), " +
    "0px 0px 109px rgba(0,0,0,0.18)";

  cardEl.style.transform = `${base} rotateX(0deg) rotateY(0deg)`;

  const glare = qs(".glare", cardEl);
  if (glare) glare.style.left = "100%";
}

function isTooFar(x, y, rect, maxRatio = 0.9) {
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = Math.min(rect.width, rect.height) * maxRatio;
  return dist > maxDist;
}

function apply3DEffect(e, cardEl) {
  const rect = cardEl.getBoundingClientRect();
  const p = getPointerPoint(e);

  const x = p.x - rect.left;
  const y = p.y - rect.top;

  if (isTooFar(x, y, rect)) {
    resetCard(cardEl);
    return;
  }

  const offsetX = x / rect.width;
  const offsetY = y / rect.height;

  const isExpanded = cardEl.classList.contains("expanded");
  const strength = isExpanded ? 6 : TILT_LIMIT;
  const shadowStrength = isExpanded ? 0.4 : 1;

  const rotateY = offsetX * (strength * 2) - strength;
  const rotateX = offsetY * (strength * 2) - strength;

  const shadowOffsetX = offsetX * 32 - 16;
  const shadowOffsetY = offsetY * 32 - 16;

  const isClone = cardEl.classList.contains("card-clone");
  const base = isClone
    ? "translate(-50%, -50%) perspective(1000px)"
    : "perspective(1000px)";

  // Box-shadow dynamique (reprend ta logique)
  cardEl.style.boxShadow =
    (1 / 6) * -shadowOffsetX * shadowStrength +
    "px " +
    (1 / 6) * -shadowOffsetY * shadowStrength +
    "px 3px rgba(0,0,0,0.051), " +
    (2 / 6) * -shadowOffsetX * shadowStrength +
    "px " +
    (2 / 6) * -shadowOffsetY * shadowStrength +
    "px 7.2px rgba(0,0,0,0.073), " +
    (3 / 6) * -shadowOffsetX * shadowStrength +
    "px " +
    (3 / 6) * -shadowOffsetY * shadowStrength +
    "px 13.6px rgba(0,0,0,0.09), " +
    (4 / 6) * -shadowOffsetX * shadowStrength +
    "px " +
    (4 / 6) * -shadowOffsetY * shadowStrength +
    "px 24.3px rgba(0,0,0,0.107), " +
    (5 / 6) * -shadowOffsetX * shadowStrength +
    "px " +
    (5 / 6) * -shadowOffsetY * shadowStrength +
    "px 45.5px rgba(0,0,0,0.129), " +
    -shadowOffsetX * shadowStrength +
    "px " +
    -shadowOffsetY * shadowStrength +
    "px 109px rgba(0,0,0,0.18)";

  cardEl.style.transform = `${base} rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;

  const glare = qs(".glare", cardEl);
  if (glare) {
    const glarePos = rotateX + rotateY + 90;
    glare.style.left = `${glarePos}%`;
  }
}

/* =====================================================
   MODULE — 3D GRILLE (desktop)
   - delegation sur document, pas de listeners par carte
   ===================================================== */

function initGrid3D() {
  if (!SUPPORTS_HOVER) return;

  // RAF throttle pour réduire la charge
  let rafId = null;
  let lastEvent = null;
  let lastTarget = null;

  function schedule(e, target) {
    lastEvent = e;
    lastTarget = target;
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!lastTarget || !lastEvent) return;
      apply3DEffect(lastEvent, lastTarget);
    });
  }

  on(document, "mousemove", (e) => {
    const card = e.target.closest(".card:not(.card-clone)");
    if (!card) return;
    schedule(e, card);
  });

  on(document, "mouseleave", (e) => {
    const card = e.target.closest(".card:not(.card-clone):not(.expanded)");
    if (!card) return;
    resetCard(card);
  }, true);
}

/* =====================================================
   MODULE — GESTES CLONE (long-press tilt + swipe flip)
   ===================================================== */

function enableCloneGestures(cloneEl) {
  // Nettoyage simple : on retire les handlers en gardant des refs locales
  let pointerId = null;
  let isDown = false;

  let pressTimer = null;
  let tiltActive = false;

  let startX = 0;
  let startY = 0;

  let flipped = cloneEl.classList.contains("flipped");
  let flipLocked = false;

  let rafPending = false;
  let lastMoveEvent = null;

  const LONG_PRESS_DELAY = 150;
  const FLIP_COOLDOWN = 220;
  const FLIP_RATIO = 2.8;

  function flipThresholdPx() {
    const rect = cloneEl.getBoundingClientRect();
    return Math.max(60, rect.width * 0.35);
  }

  function scheduleTilt(e) {
    lastMoveEvent = e;
    if (rafPending) return;

    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (!isDown || !tiltActive || !lastMoveEvent) return;
      apply3DEffect(lastMoveEvent, cloneEl);
    });
  }

  function startLongPress() {
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      if (!isDown) return;
      tiltActive = true;
      cloneEl.classList.add("tilt-active");
    }, LONG_PRESS_DELAY);
  }

  function doFlip(p) {
    if (flipLocked) return;

    flipped = !flipped;
    cloneEl.classList.toggle("flipped", flipped);

    startX = p.x;
    startY = p.y;

    tiltActive = false;
    resetCard(cloneEl);
    startLongPress();

    flipLocked = true;
    setTimeout(() => (flipLocked = false), FLIP_COOLDOWN);
  }

  function endInteraction() {
    clearTimeout(pressTimer);
    isDown = false;
    tiltActive = false;
    rafPending = false;
    lastMoveEvent = null;
    pointerId = null;

    resetCard(cloneEl);
    cloneEl.classList.remove("tilt-active");
  }

  function onPointerDown(e) {
    if (isCoarsePointer(e)) e.preventDefault();

    isDown = true;
    pointerId = e.pointerId ?? null;

    const p = getPointerPoint(e);
    startX = p.x;
    startY = p.y;

    try {
      cloneEl.setPointerCapture(pointerId);
    } catch (_) {}

    startLongPress();
  }

  function onPointerMove(e) {
    if (!isDown) return;
    if (pointerId !== null && e.pointerId !== pointerId) return;

    if (isCoarsePointer(e)) e.preventDefault();

    const p = getPointerPoint(e);
    const dx = p.x - startX;
    const dy = p.y - startY;

    const threshold = flipThresholdPx();

    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * FLIP_RATIO) {
      doFlip(p);
      return;
    }

    if (tiltActive) scheduleTilt(e);
  }

  function onPointerUp(e) {
    if (!isDown) return;
    if (pointerId !== null && e.pointerId !== pointerId) return;
    if (isCoarsePointer(e)) e.preventDefault();
    endInteraction();
  }

  // On attache au clone + document (comme avant) mais vanilla
  on(cloneEl, "pointerdown", onPointerDown, { passive: false });
  on(document, "pointermove", onPointerMove, { passive: false });
  on(document, "pointerup", onPointerUp, { passive: false });
  on(document, "pointercancel", onPointerUp, { passive: false });

  // Retourne une fonction de cleanup si tu veux aller plus loin
  return () => {
    cloneEl.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
    endInteraction();
  };
}

/* =====================================================
   MODULE — MODALE CLONE
   ===================================================== */

function initModalClone() {
  const overlay = qs(".overlay");
  if (!overlay) return;

  // Ouvrir : click sur une carte (pas clone)
  on(document, "click", (e) => {
    const card = e.target.closest(".card:not(.card-clone)");
    if (!card) return;
    if (activeClone) return;

    card.classList.add("disabled");

    const clone = card.cloneNode(true);
    clone.classList.remove("disabled");
    clone.classList.add("card-clone", "expanded", "pop-in");

    // Récupère le background-image calculé
    const bg = getComputedStyle(card).backgroundImage;

    // Texte contextuel (dataset.text) — fallback vide
    const text = card.dataset.text ?? "";

    // HTML front (contenu original)
    const frontHTML = clone.innerHTML;

    // Désactive background direct sur l’élément clone ; on l’applique sur les faces
    clone.style.backgroundImage = "none";

    // Construit un flip 3D: front = contenu original, back = texte
    clone.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-front">${frontHTML}</div>
        <div class="card-face card-back">
          <div class="card-back-overlay">${text}</div>
        </div>
      </div>
    `;

    const frontFace = qs(".card-front", clone);
    const backFace = qs(".card-back", clone);
    if (frontFace) frontFace.style.backgroundImage = bg;
    if (backFace) backFace.style.backgroundImage = bg;

    document.body.appendChild(clone);

    overlay.classList.add("active");
    document.body.classList.add("modal-open");

    activeClone = clone;

    // Gestes clone (long press tilt + swipe flip)
    enableCloneGestures(clone);

    requestAnimationFrame(() => resetCard(clone));
  });

  // Fermer : click sur overlay
  on(overlay, "click", () => {
    if (!activeClone) return;

    // Réactive la carte d'origine
    qsa(".card.disabled").forEach((c) => c.classList.remove("disabled"));

    resetCard(activeClone);
    activeClone.remove();
    activeClone = null;

    overlay.classList.remove("active");
    document.body.classList.remove("modal-open");
  });
}

/* =====================================================
   MODULE — HEADER AUTO-HIDE
   ===================================================== */

function initHeaderAutoHide() {
  const header = qs(".main-header");
  if (!header) return;

  let lastScrollY = window.scrollY;

  on(window, "scroll", () => {
    const current = window.scrollY;
    header.classList.toggle("hidden", current > lastScrollY && current > 80);
    lastScrollY = current;
  }, { passive: true });
}

/* =====================================================
   COULEURS DES FILTRES (depuis CSS)
   - Lit la couleur de la classe (.jv, .cinema, etc.)
   ===================================================== */

function applyFilterColorsFromCSS(filtersRoot) {
  const btns = qsa(".filter-btn", filtersRoot);
  btns.forEach((btn) => {
    const type = btn.dataset.filter;

    if (type === "all") {
      btn.style.setProperty("--filter-color", "#fff");
      btn.style.color = "#000";
      return;
    }

    // Lecture couleur via un élément temporaire de classe type
    const temp = document.createElement("div");
    temp.className = type;
    temp.style.visibility = "hidden";
    document.body.appendChild(temp);

    const color = getComputedStyle(temp).backgroundColor;
    temp.remove();

    btn.style.setProperty("--filter-color", color);

    // Si active -> texte noir (sur fond couleur), sinon texte couleur
    btn.style.color = btn.classList.contains("active") ? "#000" : color;
  });
}

/* =====================================================
   MODULE — FILTRES + TOGGLE PRO/PERSO (accessible)
   ===================================================== */

function initFiltersWithScopeSwitch() {
  const filters = qs(".filters");
  if (!filters) return;

  const scopeToggle = qs("#scopeToggle"); // unchecked => PRO, checked => PERSO
  if (!scopeToggle) {
    console.warn("scopeToggle introuvable : ajoute <input id='scopeToggle'> dans le HTML.");
  }

  const wrapper = qs(".wrapper");
  if (!wrapper) return;

  const getCards = () => qsa(".wrapper .card").filter((c) => !c.classList.contains("card-clone"));

  const getTypes = (cardEl) =>
    String(cardEl.dataset.types || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  // Mapping types -> scope
  const SCOPE_TYPES = {
    pro: new Set(["capgemini", "conference", "logotype"]),
    perso: new Set(["jv", "voyage", "sport", "musique", "anime", "cinema", "associatif"]),
  };

  function computeScopesFromTypes(types) {
    const scopes = new Set();
    for (const t of types) {
      if (SCOPE_TYPES.pro.has(t)) scopes.add("pro");
      if (SCOPE_TYPES.perso.has(t)) scopes.add("perso");
    }
    if (scopes.size === 0) scopes.add("perso"); // défaut
    return scopes;
  }

  function ensureCardScopes() {
    getCards().forEach((card) => {
      const types = getTypes(card);
      const scopes = computeScopesFromTypes(types);
      card.dataset.scopes = [...scopes].join(","); // "pro" / "perso" / "pro,perso"
    });
  }

  function cardHasScope(cardEl, scope) {
    const scopes = String(cardEl.dataset.scopes || "");
    return scopes.split(",").map((s) => s.trim()).includes(scope);
  }

  function buildTypesByScope() {
    const acc = { pro: new Set(), perso: new Set() };

    getCards().forEach((card) => {
      const types = getTypes(card);
      if (cardHasScope(card, "pro")) types.forEach((t) => acc.pro.add(t));
      if (cardHasScope(card, "perso")) types.forEach((t) => acc.perso.add(t));
    });

    return { pro: [...acc.pro], perso: [...acc.perso] };
  }

  // Etat
  let activeScope = "pro"; // par défaut : PRO
  let activeFilters = new Set(); // multi-select AND

  // Restore depuis URL (optionnel)
  const params = new URLSearchParams(location.search);
  if (params.has("scope")) {
    const s = params.get("scope");
    if (s === "pro" || s === "perso") activeScope = s;
  }
  if (params.has("filters")) {
    params
      .get("filters")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((f) => activeFilters.add(f));
  }

  // Init scopes
  ensureCardScopes();
  let allTypesByScope = buildTypesByScope();

  function getCardsInScope() {
    return getCards().filter((card) => cardHasScope(card, activeScope));
  }

  function pruneFiltersForScope() {
    const allowed = new Set(allTypesByScope[activeScope] || []);
    activeFilters = new Set([...activeFilters].filter((f) => allowed.has(f)));
  }
  pruneFiltersForScope();

  function updateScopeToggleUI() {
    if (!scopeToggle) return;
    const isPerso = activeScope === "perso";
    scopeToggle.checked = isPerso;
    scopeToggle.setAttribute("aria-checked", String(isPerso));
  }

  function buildFiltersUI() {
    filters.innerHTML = "";

    // Bouton Tous
    const allBtn = document.createElement("div");
    allBtn.className = "filter-btn";
    allBtn.dataset.filter = "all";
    allBtn.innerHTML = `Tous <span class="filter-count"></span>`;
    filters.appendChild(allBtn);

    // Types de scope
    (allTypesByScope[activeScope] || []).forEach((type) => {
      const btn = document.createElement("div");
      btn.className = "filter-btn";
      btn.dataset.filter = type;
      btn.innerHTML = `${type} <span class="filter-count"></span>`;
      filters.appendChild(btn);
    });
  }

  function syncURL() {
    const p = new URLSearchParams();
    p.set("scope", activeScope);
    if (activeFilters.size) p.set("filters", [...activeFilters].join(","));
    history.replaceState(null, "", "?" + p.toString());
  }

  function updateUI() {
    const allBtn = qs('[data-filter="all"]', filters);
    const cardsInScope = getCardsInScope();

    if (allBtn) {
      allBtn.classList.toggle("active", activeFilters.size === 0);
      const countEl = qs(".filter-count", allBtn);
      if (countEl) countEl.textContent = String(cardsInScope.length);
    }

    // Pour chaque type, calcule le count si on ajoute ce filtre
    qsa(".filter-btn", filters)
      .filter((b) => b.dataset.filter !== "all")
      .forEach((btn) => {
        const type = btn.dataset.filter;
        let count = 0;

        cardsInScope.forEach((card) => {
          const test = new Set(activeFilters);
          test.add(type);

          const types = getTypes(card);
          const ok = [...test].every((f) => types.includes(f));
          if (ok) count++;
        });

        btn.classList.toggle("active", activeFilters.has(type));

        // Disabled si aucune carte possible avec ce filtre en plus
        const disabled = count === 0;
        btn.classList.toggle("disabled", disabled);
        btn.dataset.disabled = disabled ? "true" : "false";

        const countEl = qs(".filter-count", btn);
        if (countEl) countEl.textContent = String(count);
      });
  }

  function applyFilters() {
    // Cache/affiche cartes
    getCards().forEach((card) => {
      // 1) Scope
      if (!cardHasScope(card, activeScope)) {
        card.style.display = "none";
        card.classList.remove("is-hiding");
        return;
      }

      // 2) Filtres AND
      const cardTypes = getTypes(card);
      const match = [...activeFilters].every((f) => cardTypes.includes(f));

      if (match) {
        card.style.display = "";
        card.classList.remove("is-hiding");
      } else {
        card.classList.add("is-hiding");
        // laisse le temps à l’anim d’opacité (cf CSS)
        window.setTimeout(() => {
          card.style.display = "none";
        }, 200);
      }
    });

    updateUI();
    syncURL();
    applyFilterColorsFromCSS(filters);
  }

  // Click filtres (delegation)
  on(filters, "click", (e) => {
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

  // Toggle scope (checked => perso, unchecked => pro)
  if (scopeToggle) {
    on(scopeToggle, "change", () => {
      activeScope = scopeToggle.checked ? "perso" : "pro";

      allTypesByScope = buildTypesByScope();
      pruneFiltersForScope();

      buildFiltersUI();
      updateScopeToggleUI();
      applyFilters();
    });
  }

  /* ---- Drag-scroll filtres mobile (long-press) ---- */
  (function enableFiltersDragScroll() {
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
      filters.classList.remove("is-dragging");
    }

    on(filters, "pointerdown", (e) => {
      if (!isCoarsePointer(e)) return;

      isDown = true;
      dragActive = false;
      pointerId = e.pointerId ?? null;

      startX = getPointerPoint(e).x;
      startScrollLeft = filters.scrollLeft;

      try {
        filters.setPointerCapture(pointerId);
      } catch (_) {}

      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        if (!isDown) return;
        dragActive = true;
        filters.classList.add("is-dragging");
      }, DRAG_LONG_PRESS);
    }, { passive: true });

    on(document, "pointermove", (e) => {
      if (!isDown) return;
      if (!isCoarsePointer(e)) return;
      if (pointerId !== null && e.pointerId !== pointerId) return;

      if (dragActive) {
        e.preventDefault();
        const x = getPointerPoint(e).x;
        const dx = x - startX;
        filters.scrollLeft = startScrollLeft - dx;
      }
    }, { passive: false });

    on(document, "pointerup", (e) => {
      if (!isDown) return;
      if (pointerId !== null && e.pointerId !== pointerId) return;
      end();
    }, { passive: true });

    on(document, "pointercancel", (e) => {
      if (!isDown) return;
      if (pointerId !== null && e.pointerId !== pointerId) return;
      end();
    }, { passive: true });

    // Si on est en drag, on bloque le click des boutons
    on(filters, "click", (e) => {
      if (filters.classList.contains("is-dragging")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
  })();

  // Render initial
  buildFiltersUI();
  updateScopeToggleUI();
  applyFilters();
}

/* =====================================================
   MODULE — LOADER
   ===================================================== */

function initLoader() {
  const loader = qs(".loader");
  if (!loader) return;

  requestAnimationFrame(() => {
    loader.classList.add("hidden");
    window.setTimeout(() => loader.remove(), 500);
  });
}

/* =====================================================
   MODULE — LAZY BACKGROUNDS
   ===================================================== */

function initLazyBackgrounds() {
  const cards = qsa(".card");
  if (!cards.length) return;

  function loadCardImage(card) {
    const src = card.dataset.bg;
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      card.style.backgroundImage = `url("${src}")`;
      card.classList.remove("loading");
      card.classList.add("loaded");
    };
    img.src = src;
  }

  if (!("IntersectionObserver" in window)) {
    cards.forEach(loadCardImage);
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadCardImage(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { rootMargin: "200px", threshold: 0.1 }
  );

  cards.forEach((card) => {
    card.classList.add("loading");
    observer.observe(card);
  });
}

/* =====================================================
   MODULE — INTRO OVERLAY (session)
   ===================================================== */

function initIntroOverlay() {
  const intro = qs(".intro-overlay");
  if (!intro) return;

  const alreadySeen = sessionStorage.getItem("introSeen");
  if (alreadySeen) {
    intro.remove();
    return;
  }

  document.body.classList.add("modal-open");

  const btn = qs(".intro-btn", intro);
  if (!btn) return;

  on(btn, "click", () => {
    intro.classList.add("hidden");
    document.body.classList.remove("modal-open");

    sessionStorage.setItem("introSeen", "true");
    window.setTimeout(() => intro.remove(), 700);
  });
}

/* =====================================================
   MODULE — CUSTOM CURSOR (desktop)
   ===================================================== */

function initCustomCursor() {
  const dot = qs(".cursor-dot");
  const outline = qs(".cursor-outline");

  if (!dot || !outline) return;
  if (!SUPPORTS_HOVER) return;

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

/* =====================================================
   BOOTSTRAP — appelé APRÈS création des cartes (fetch)
   ===================================================== */

window.bootstrapAfterCards = function bootstrapAfterCards() {
  if (cardsBootstrapped) return;
  cardsBootstrapped = true;

  // Dépend des .card présentes
  initFiltersWithScopeSwitch();
  initLazyBackgrounds();
};

/* =====================================================
   CV MODAL
   ===================================================== */

function initCVModal() {
  const openBtn = qs("#cv-open");
  const modal = qs("#cv-modal");
  const overlay = qs("#cv-overlay");
  const closeBtn = qs("#cv-close");

  if (!openBtn || !modal || !overlay || !closeBtn) return;

  const openCV = (e) => {
    if (e) e.preventDefault();
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
    if (e.key === "Escape" && modal.classList.contains("active")) {
      closeCV();
    }
  });
}

/* =====================================================
   INIT GLOBAL — DOM READY
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Modules indépendants des cartes (OK au DOMContentLoaded)
  initGrid3D();
  initModalClone();
  initHeaderAutoHide();

  // UI
  initLoader();
  initIntroOverlay();

  // Curseur custom (si présent)
  initCustomCursor();

  // CV modal
  initCVModal();

  // NOTE:
  // initFiltersWithScopeSwitch() et initLazyBackgrounds()
  // sont déclenchés via window.bootstrapAfterCards(),
  // appelé à la fin de ton fetch cards.json (dans index.html).
});
