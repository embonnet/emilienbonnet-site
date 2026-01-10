// js/services/imageLoader.js

/**
 * Charge une image et appelle onLoad une fois chargée.
 * Utilisé pour lazy background-image afin d’éviter les flashes et les loads inutiles.
 */
export function preloadImage(src, onLoad, onError) {
  if (!src) return;
  const img = new Image();
  img.onload = () => onLoad?.(src);
  img.onerror = () => onError?.(src);
  img.src = src;
}