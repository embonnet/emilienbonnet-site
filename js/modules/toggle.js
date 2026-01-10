// js/modules/toggle.js

import { setAriaChecked } from "../utils/accessibility.js";

/**
 * Gère le toggle Pro/Perso.
 * Par convention : checked => perso ; unchecked => pro
 */
export function initScopeToggle(scopeToggleEl, initialScope, onScopeChange) {
  if (!scopeToggleEl) return;

  const setUI = (scope) => {
    const isPerso = scope === "perso";
    scopeToggleEl.checked = isPerso;
    setAriaChecked(scopeToggleEl, isPerso);
  };

  setUI(initialScope);

  scopeToggleEl.addEventListener("change", () => {
    const scope = scopeToggleEl.checked ? "perso" : "pro";
    setUI(scope);
    onScopeChange?.(scope);
  });
}
