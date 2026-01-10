// js/utils/observer.js

export function createIO(callback, options) {
  if (!("IntersectionObserver" in window)) return null;
  return new IntersectionObserver(callback, options);
}
