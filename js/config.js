// js/config.js

export const CONFIG = {
  supportsHover: window.matchMedia("(hover: hover)").matches,
  tiltLimit: 15,

  // Long press / swipe
  longPressDelayMs: 150,
  flipCooldownMs: 220,
  flipRatio: 2.8,

  // Lazy loading
  lazyRootMargin: "200px",
  lazyThreshold: 0.1,

  // Header auto-hide
  headerHideMinScroll: 80,

  // Intro overlay
  introSessionKey: "introSeen",

  // Filtres (mapping type -> scope)
  scopeTypes: {
    pro: new Set(["capgemini", "conference", "logotype"]),
    perso: new Set(["jv", "voyage", "sport", "musique", "anime", "cinema", "associatif"]),
  },

  // Animation hide cards
  hideAnimMs: 200,
};

export const STATE = {
  activeClone: null,
  cardsBootstrapped: false,
};
