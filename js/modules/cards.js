// js/modules/cards.js

import { qsa } from "../utils/dom.js";
import { CONFIG } from "../config.js";

/**
 * Utilitaires cartes
 */
export function getCards(root = document) {
  return qsa(".wrapper .card", root).filter((c) => !c.classList.contains("card-clone"));
}

export function getCardTypes(cardEl) {
  return String(cardEl.dataset.types || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Calcule et injecte data-scopes sur les cartes à partir de data-types
 */
export function ensureCardScopes(cards) {
  for (const card of cards) {
    const types = getCardTypes(card);
    const scopes = new Set();

    for (const t of types) {
      if (CONFIG.scopeTypes.pro.has(t)) scopes.add("pro");
      if (CONFIG.scopeTypes.perso.has(t)) scopes.add("perso");
    }

    // défaut si pas trouvé
    if (scopes.size === 0) scopes.add("perso");

    card.dataset.scopes = [...scopes].join(",");
  }
}

export function cardHasScope(cardEl, scope) {
  const scopes = String(cardEl.dataset.scopes || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return scopes.includes(scope);
}

export function buildTypesByScope(cards) {
  const acc = { pro: new Set(), perso: new Set() };

  for (const card of cards) {
    const types = getCardTypes(card);
    const scopes = String(card.dataset.scopes || "");

    if (scopes.includes("pro")) types.forEach((t) => acc.pro.add(t));
    if (scopes.includes("perso")) types.forEach((t) => acc.perso.add(t));
  }

  return { pro: [...acc.pro], perso: [...acc.perso] };
}
