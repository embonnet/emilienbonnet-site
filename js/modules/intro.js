// js/modules/intro.js

import { qs, on } from "../utils/dom.js";
import { CONFIG } from "../config.js";

/**
 * Loader simple : cache puis remove
 */
export function initLoader() {
  const loader = qs(".loader");
  if (!loader) return;

  requestAnimationFrame(() => {
    loader.classList.add("hidden");
    setTimeout(() => loader.remove(), 500);
  });
}

/**
 * Intro overlay (sessionStorage)
 */
export function initIntroOverlay() {
  const intro = qs(".intro-overlay");
  if (!intro) return;

  const alreadySeen = sessionStorage.getItem(CONFIG.introSessionKey);
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

    sessionStorage.setItem(CONFIG.introSessionKey, "true");
    setTimeout(() => intro.remove(), 700);
  });
}
