// js/utils/accessibility.js

export function setAriaPressed(el, pressed) {
  if (!el) return;
  el.setAttribute("aria-pressed", String(Boolean(pressed)));
}

export function setAriaChecked(el, checked) {
  if (!el) return;
  el.setAttribute("aria-checked", String(Boolean(checked)));
}

export function trapEscapeToClose(onClose) {
  const handler = (e) => {
    if (e.key === "Escape") onClose?.();
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}