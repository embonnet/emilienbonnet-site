// js/modules/modal.js

import { qs, qsa, on, getPointerPoint, isCoarsePointer } from "../utils/dom.js";
import { CONFIG, STATE } from "../config.js";

/* ---------- 3D Tilt (clone) ---------- */

function resetCard(cardEl) {
  const isClone = cardEl.classList.contains("card-clone");
  const base = isClone
    ? "translate(-50%, -50%) perspective(1000px)"
    : "perspective(1000px)";

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
  const strength = isExpanded ? 6 : CONFIG.tiltLimit;

  const rotateY = offsetX * (strength * 2) - strength;
  const rotateX = offsetY * (strength * 2) - strength;

  const isClone = cardEl.classList.contains("card-clone");
  const base = isClone
    ? "translate(-50%, -50%) perspective(1000px)"
    : "perspective(1000px)";

  cardEl.style.transform = `${base} rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;

  const glare = qs(".glare", cardEl);
  if (glare) {
    const glarePos = rotateX + rotateY + 90;
    glare.style.left = `${glarePos}%`;
  }
}

/* ---------- Gestes clone ---------- */

function enableCloneGestures(cloneEl) {
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
    }, CONFIG.longPressDelayMs);
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
    setTimeout(() => (flipLocked = false), CONFIG.flipCooldownMs);
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

    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * CONFIG.flipRatio) {
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

  cloneEl.addEventListener("pointerdown", onPointerDown, { passive: false });
  document.addEventListener("pointermove", onPointerMove, { passive: false });
  document.addEventListener("pointerup", onPointerUp, { passive: false });
  document.addEventListener("pointercancel", onPointerUp, { passive: false });

  return () => {
    cloneEl.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
    endInteraction();
  };
}

/* ---------- Modal clone ---------- */

export function initModalClone() {
  const overlay = qs(".overlay");
  if (!overlay) return;

  // Ouvrir: click carte (pas clone)
  on(document, "click", (e) => {
    const card = e.target.closest(".card:not(.card-clone)");
    if (!card) return;
    if (STATE.activeClone) return;

    card.classList.add("disabled");

    const clone = card.cloneNode(true);
    clone.classList.remove("disabled");
    clone.classList.add("card-clone", "expanded", "pop-in");

    const bg = getComputedStyle(card).backgroundImage;
    const text = card.dataset.text ?? "";
    const frontHTML = clone.innerHTML;

    clone.style.backgroundImage = "none";
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

    STATE.activeClone = clone;

    enableCloneGestures(clone);

    requestAnimationFrame(() => resetCard(clone));
  });

  // Fermer : click overlay
  on(overlay, "click", () => {
    if (!STATE.activeClone) return;

    qsa(".card.disabled").forEach((c) => c.classList.remove("disabled"));

    resetCard(STATE.activeClone);
    STATE.activeClone.remove();
    STATE.activeClone = null;

    overlay.classList.remove("active");
    document.body.classList.remove("modal-open");
  });
}

// --- Tilt 3D sur cartes normales (hover desktop) ---
export function initCardsHoverTilt() {
  // si pas de hover (mobile / trackpad touch), on ne fait rien
  if (!CONFIG.supportsHover) return;

  let rafPending = false;
  let lastEvent = null;
  let activeCard = null;

  function schedule() {
    if (rafPending) return;
    rafPending = true;

    requestAnimationFrame(() => {
      rafPending = false;
      if (!activeCard || !lastEvent) return;
      apply3DEffect(lastEvent, activeCard);
    });
  }

  document.addEventListener(
    "pointermove",
    (e) => {
      // ignore si clone/modal actif
      if (STATE.activeClone) return;

      const card = e.target.closest(".card:not(.card-clone):not(.disabled)");
      if (!card) {
        if (activeCard) resetCard(activeCard);
        activeCard = null;
        lastEvent = null;
        return;
      }

      activeCard = card;
      lastEvent = e;
      schedule();
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerleave",
    () => {
      if (activeCard) resetCard(activeCard);
      activeCard = null;
      lastEvent = null;
    },
    { passive: true }
  );
}

// effet carte hover
export function initGrid3D() {
  if (!CONFIG.supportsHover) return;

  let active = null;

  document.addEventListener("pointermove", (e) => {
    if (STATE.activeClone) return; // si modale ouverte, on ne tilt pas la grille

    const card = e.target.closest(".card");
    if (!card || card.classList.contains("card-clone") || card.classList.contains("disabled")) {
      if (active) resetCard(active);
      active = null;
      return;
    }

    active = card;
    apply3DEffect(e, card);
  }, { passive: true });

  document.addEventListener("pointerleave", () => {
    if (active) resetCard(active);
    active = null;
  }, { passive: true });
}
