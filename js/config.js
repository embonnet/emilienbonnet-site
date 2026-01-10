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

  // Dos de carte par type (catégorie n°1)
  cardBackByType: {
    cinema: "assets/images/card-backs/cinema.webp",
    jv: "assets/images/card-backs/jv.webp",
    anime: "assets/images/card-backs/anime.webp",
    musique: "assets/images/card-backs/musique.webp",
    sport: "assets/images/card-backs/sport.webp",
    voyage: "assets/images/card-backs/voyage.webp",
    capgemini: "assets/images/card-backs/capgemini.webp",
    conference: "assets/images/card-backs/conference.webp",
    logotype: "assets/images/card-backs/logotype.webp",
    associatif: "assets/images/card-backs/associatif.webp",
  },

  // optionnel : fallback si jamais un type n'est pas mappé
  defaultCardBack: "assets/images/card-backs/default.webp",
  
};

export const STATE = {
  activeClone: null,
  cardsBootstrapped: false,
};
