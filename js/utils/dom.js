// js/utils/dom.js

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function on(el, type, handler, options) {
  el.addEventListener(type, handler, options);
  return () => el.removeEventListener(type, handler, options);
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function getPointerPoint(e) {
  if (typeof e.clientX === "number" && typeof e.clientY === "number") {
    return { x: e.clientX, y: e.clientY };
  }
  const t = e.touches && e.touches[0];
  return { x: t?.clientX ?? 0, y: t?.clientY ?? 0 };
}

export function isCoarsePointer(e) {
  return e.pointerType === "touch" || e.pointerType === "pen";
}

export function closestOrNull(target, selector) {
  if (!target || !(target instanceof Element)) return null;
  return target.closest(selector);
}