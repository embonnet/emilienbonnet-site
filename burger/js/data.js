// Definition fixe des 8 emplacements jouables entre les deux pains du burger.
window.SLOT_DEFS = [
  { id: "s0", index: 1, fixed: false },
  { id: "s1", index: 2, fixed: false },
  { id: "s2", index: 3, fixed: false },
  { id: "s4", index: 4, fixed: false },
  { id: "s5", index: 5, fixed: false },
  { id: "s6", index: 6, fixed: false },
  { id: "s7", index: 7, fixed: false },
  { id: "s8", index: 8, fixed: false }
];

// Dictionnaires de presentation reutilises dans les definitions de niveaux.
const FOOD_NAMES = {
  A: "Steak",
  B: "Salades",
  C: "Onions",
  D: "Cheddar",
  E: "Bacon",
  F: "Cornichon",
  G: "Ketchup",
  H: "Moutarde",
  I: "Tomate"
};

const FOOD_COLORS = {
  A: "#7A3E1D",
  B: "#72B84C",
  C: "#B89173",
  D: "#F4B400",
  E: "#B14A2C",
  F: "#6FAF45",
  G: "#C62828",
  H: "#D7B300",
  I: "#D94A4A"
};

window.LEVELS = {
  1: {
    // Niveau d'introduction : placements surtout contraints pour apprendre la logique.
    id: 1,
    title: "Burger 1",
    description:
      "Premier burger. Le client a certaines contraintes dans l'ordre de sa composition.",
    hideRequirementBadges: true,
    hideNeutralTypeHints: true,
    showAllPlacedRule: true,
    fillAgenda: false,
    displayRules: [
      "Toutes les activités doivent être placées."
    ],
    typeConflicts: [],
    activities: [
      {
        id: "A",
        name: FOOD_NAMES.A,
        duration: 2,
        color: FOOD_COLORS.A,
        required: true,
        type: "neutre",
        allowedPositionSets: [[1, 2]]
      },
      {
        id: "B",
        name: FOOD_NAMES.B,
        duration: 1,
        color: FOOD_COLORS.B,
        required: true,
        type: "neutre"
      },
      {
        id: "C",
        name: FOOD_NAMES.C,
        duration: 2,
        color: FOOD_COLORS.C,
        required: true,
        type: "neutre",
        allowedPositionSets: [[4, 5], [5, 6], [6, 7], [7, 8]]
      },
      {
        id: "D",
        name: FOOD_NAMES.D,
        duration: 1,
        color: FOOD_COLORS.D,
        required: true,
        type: "neutre",
        allowedPositions: [2, 3, 4, 5]
      },
      {
        id: "E",
        name: FOOD_NAMES.E,
        duration: 2,
        color: FOOD_COLORS.E,
        required: true,
        type: "neutre",
        allowedPositionSets: [[6, 7], [7, 8]]
      }
    ],
    globalRules: []
  },

  2: {
    // Niveau intermediaire : ajoute une contrainte d'ordre entre deux ingredients.
    id: 2,
    title: "Burger 2",
    description:
      "Plus exigeant. Le client a certaines contraintes dans l'ordre de sa composition.",
    hideNeutralTypeHints: true,
    showAllPlacedRule: false,
    fillAgenda: false,
    displayRules: [
      "Tous les ingrédients obligatoires doivent être placés.",
      "Cheddar doit être placé plus haut que le Bacon."
    ],
    typeConflicts: [],
    activities: [
      {
        id: "A",
        name: FOOD_NAMES.A,
        duration: 2,
        color: FOOD_COLORS.A,
        required: true,
        type: "neutre",
        allowedPositionSets: [[1, 2]]
      },
      {
        id: "B",
        name: FOOD_NAMES.B,
        duration: 1,
        color: FOOD_COLORS.B,
        required: false,
        type: "neutre",
        allowedPositions: [1, 2, 7, 8]
      },
      {
        id: "C",
        name: FOOD_NAMES.C,
        duration: 1,
        color: FOOD_COLORS.C,
        required: false,
        type: "neutre",
        allowedPositions: [2, 3, 4, 5]
      },
      {
        id: "D",
        name: FOOD_NAMES.D,
        duration: 1,
        color: FOOD_COLORS.D,
        required: true,
        type: "neutre",
        allowedPositions: [3, 4, 5, 6, 7, 8]
      },
      {
        id: "E",
        name: FOOD_NAMES.E,
        duration: 2,
        color: FOOD_COLORS.E,
        required: true,
        type: "neutre",
        allowedPositionSets: [[4, 5], [5, 6], [6, 7], [7, 8]]
      },
      {
        id: "F",
        name: FOOD_NAMES.F,
        duration: 1,
        color: FOOD_COLORS.F,
        required: true,
        type: "neutre",
        allowedPositions: [4, 5, 6]
      },
      {
        id: "I",
        name: FOOD_NAMES.I,
        duration: 1,
        color: FOOD_COLORS.I,
        required: false,
        type: "neutre",
        allowedPositions: [1, 2, 6, 7, 8]
      }
    ],
    globalRules: [
      { type: "before", first: "D", second: "E" }
    ]
  },

  3: {
    // Niveau avance : travail par types d'ingredients et remplissage complet obligatoire.
    id: 3,
    title: "Burger 3",
    description:
      "Un niveau difficile avec très peu de placements imposés : seule la position du steak est contrainte.",
    showAllPlacedRule: false,
    fillAgenda: true,
    displayRules: [
      "Les 8 emplacements doivent être remplis.",
      "Un ingrédient chaud ne peut pas être à côté d’un froid.",
      "Un ingrédient fondant doit être adjacent à au moins un chaud.",
      "Salades doit être placé plus haut que le Ketchup.",
      "Onions doivent être placé plus haut que le Cheddar."
    ],
    typeConflicts: [
      ["chaud", "froid"]
    ],
    activities: [
      {
        id: "A",
        name: FOOD_NAMES.A, // Steak
        duration: 2,
        color: FOOD_COLORS.A,
        required: true,
        type: "chaud",
        splittable: false,
        allowedPositionSets: [
          [6, 7]
        ],
        splitAllowedPositionSets: [
          [4, 6]
        ],
        splitParts: [
          { id: "A_1", name: "Steak — 1", duration: 1, type: "chaud" },
          { id: "A_2", name: "Steak — 2", duration: 1, type: "chaud" }
        ]
      },

      {
        id: "E",
        name: FOOD_NAMES.E, // Bacon
        duration: 1,
        color: FOOD_COLORS.E,
        required: false,
        type: "chaud"
      },

      {
        id: "B",
        name: FOOD_NAMES.B, // Salades
        duration: 1,
        color: FOOD_COLORS.B,
        required: true,
        type: "froid"
      },

      {
        id: "C",
        name: FOOD_NAMES.C, // Onions
        duration: 1,
        color: FOOD_COLORS.C,
        required: true,
        type: "froid"
      },

      {
        id: "F",
        name: FOOD_NAMES.F, // Cornichon
        duration: 1,
        color: FOOD_COLORS.F,
        required: false,
        type: "froid"
      },

      {
        id: "G",
        name: FOOD_NAMES.G, // Ketchup
        duration: 1,
        color: FOOD_COLORS.G,
        required: true,
        type: "neutre"
      },

      {
        id: "H",
        name: FOOD_NAMES.H, // Moutarde
        duration: 1,
        color: FOOD_COLORS.H,
        required: false,
        type: "neutre"
      },

      {
        id: "D",
        name: FOOD_NAMES.D, // Cheddar
        duration: 1,
        color: FOOD_COLORS.D,
        required: true,
        type: "fondant"
      }
    ],
    globalRules: [
      { type: "before", first: "B", second: "G" },
      { type: "before", first: "C", second: "D" }
    ]
  },

  4: {
    // Niveau le plus complexe : ingredients scindables et contraintes plus piegeuses.
    id: 4,
    title: "Burger 4",
    description:
      "Un burger complexe avec très peu de placements imposés. Le cheddar prend de la place et la structure du burger rend certaines combinaisons trompeuses.",
    showAllPlacedRule: false,
    fillAgenda: true,
    displayRules: [
      "Les 8 emplacements doivent être remplis.",
      "Un ingrédient chaud ne peut pas être à côté d’un froid.",
      "Un ingrédient fondant doit être adjacent à au moins un chaud.",
      "si un ingrédient prend 2 bloc, ses conditions sont sur ses 2 côtés.",
      "Certains ingrédients peuvent être joué en bloc ou découpé.",
      "Ketchup doit être placé plus haut que la Moutarde."
    ],
    typeConflicts: [
      ["chaud", "froid"]
    ],
    activities: [
      {
        id: "A",
        name: FOOD_NAMES.A, // Steak
        duration: 2,
        color: FOOD_COLORS.A,
        required: true,
        type: "chaud",
        splittable: true,
        allowedPositionSets: [
          [6, 7]
        ],
        splitAllowedPositionSets: [
          [2, 3],
          [2, 5],
          [2, 6],
          [3, 5],
          [3, 6],
          [5, 6]
        ],
        splitParts: [
          { id: "A_1", name: "Steak 1", duration: 1, type: "chaud" },
          { id: "A_2", name: "Steak 2", duration: 1, type: "chaud" }
        ]
      },

      {
        id: "D",
        name: FOOD_NAMES.D, // Cheddar
        duration: 2,
        color: FOOD_COLORS.D,
        required: true,
        type: "fondant",
        splittable: true,
        allowedPositionSets: [
          [4, 5],
          [5, 6]
        ],
        splitAllowedPositionSets: [
          [1, 2],
          [1, 7],
          [1, 8],
          [2, 7],
          [2, 8],
          [7, 8]
        ],
        splitParts: [
          { id: "D_1", name: "Cheddar 1", duration: 1, type: "fondant" },
          { id: "D_2", name: "Cheddar 2", duration: 1, type: "fondant" }
        ]
      },

      {
        id: "E",
        name: FOOD_NAMES.E, // Bacon
        duration: 1,
        color: FOOD_COLORS.E,
        required: false,
        type: "chaud",
        allowedPositions: [1, 2, 8]
      },

      {
        id: "B",
        name: FOOD_NAMES.B, // Salades
        duration: 1,
        color: FOOD_COLORS.B,
        required: false,
        type: "froid"
      },

      {
        id: "C",
        name: FOOD_NAMES.C, // Onions
        duration: 1,
        color: FOOD_COLORS.C,
        required: false,
        type: "froid"
      },

      {
        id: "F",
        name: FOOD_NAMES.F, // Cornichon
        duration: 1,
        color: FOOD_COLORS.F,
        required: false,
        type: "froid"
      },

      {
        id: "G",
        name: FOOD_NAMES.G, // Ketchup
        duration: 1,
        color: FOOD_COLORS.G,
        required: true,
        type: "neutre",
        allowedPositions: [1, 2, 3, 4, 5, 6]
      },

      {
        id: "H",
        name: FOOD_NAMES.H, // Moutarde
        duration: 1,
        color: FOOD_COLORS.H,
        required: true,
        type: "neutre",
        allowedPositions: [3, 4, 5, 6, 7, 8]
      },

      {
        id: "I",
        name: FOOD_NAMES.I, // Tomate
        duration: 1,
        color: FOOD_COLORS.I,
        required: false,
        type: "froid",
        allowedPositions: [1, 7, 8]
      }
    ],
    globalRules: [
      { type: "before", first: "G", second: "H" }
    ]
  },

  5: {
    // Niveau expert : meme base que le niveau 4, mais la composition doit etre symetrique.
    id: 5,
    title: "Burger 5",
    description:
      "Un burger expert a la structure miroir. Les positions se repondent de haut en bas : chaque choix doit avoir son equivalent symetrique.",
    showAllPlacedRule: false,
    fillAgenda: true,
    requireMirrorSymmetry: true,
    displayRules: [
      "Les 8 emplacements doivent etre remplis.",
      "Le burger doit etre parfaitement symetrique.",
      "Un ingredient chaud ne peut pas etre a cote d'un froid.",
      "Un ingredient fondant doit etre adjacent a au moins un chaud.",
      "Certains ingredients peuvent etre joues en bloc ou decoupes."
    ],
    typeConflicts: [
      ["chaud", "froid"]
    ],
    activities: [
      {
        id: "A",
        name: FOOD_NAMES.A,
        duration: 2,
        color: FOOD_COLORS.A,
        required: true,
        type: "chaud",
        splittable: true,
        allowedPositionSets: [
          [4, 5]
        ],
        splitAllowedPositionSets: [
          [3, 6],
          [2, 7]
        ],
        splitParts: [
          { id: "A_1", name: "Steak 1", duration: 1, type: "chaud" },
          { id: "A_2", name: "Steak 2", duration: 1, type: "chaud" }
        ]
      },
      {
        id: "D",
        name: FOOD_NAMES.D,
        duration: 2,
        color: FOOD_COLORS.D,
        required: true,
        type: "fondant",
        splittable: true,
        allowedPositionSets: [
          [4, 5]
        ],
        splitAllowedPositionSets: [
          [2, 7],
          [1, 8]
        ],
        splitParts: [
          { id: "D_1", name: "Cheddar 1", duration: 1, type: "fondant" },
          { id: "D_2", name: "Cheddar 2", duration: 1, type: "fondant" }
        ]
      },
      {
        id: "E",
        name: FOOD_NAMES.E,
        duration: 1,
        color: FOOD_COLORS.E,
        required: false,
        type: "chaud",
        allowedPositions: [1, 2, 3, 4, 5, 6, 7, 8]
      },
      {
        id: "B",
        name: FOOD_NAMES.B,
        duration: 1,
        color: FOOD_COLORS.B,
        required: false,
        type: "froid",
        symmetryKey: "fresh-edge",
        allowedPositions: [1, 2, 3, 4]
      },
      {
        id: "C",
        name: FOOD_NAMES.C,
        duration: 1,
        color: FOOD_COLORS.C,
        required: false,
        type: "froid",
        symmetryKey: "fresh-crunch",
        allowedPositions: [1, 2, 3, 4]
      },
      {
        id: "F",
        name: FOOD_NAMES.F,
        duration: 1,
        color: FOOD_COLORS.F,
        required: false,
        type: "froid",
        symmetryKey: "fresh-crunch",
        allowedPositions: [5, 6, 7, 8]
      },
      {
        id: "G",
        name: FOOD_NAMES.G,
        duration: 1,
        color: FOOD_COLORS.G,
        required: false,
        type: "neutre",
        symmetryKey: "sauce-pair",
        allowedPositions: [1, 2, 3, 4]
      },
      {
        id: "H",
        name: FOOD_NAMES.H,
        duration: 1,
        color: FOOD_COLORS.H,
        required: false,
        type: "neutre",
        symmetryKey: "sauce-pair",
        allowedPositions: [5, 6, 7, 8]
      },
      {
        id: "I",
        name: FOOD_NAMES.I,
        duration: 1,
        color: FOOD_COLORS.I,
        required: false,
        type: "froid",
        symmetryKey: "fresh-edge",
        allowedPositions: [5, 6, 7, 8]
      }
    ],
    globalRules: []
  }
};
