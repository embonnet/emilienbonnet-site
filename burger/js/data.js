// Définition fixe des 8 emplacements jouables entre les deux pains du burger.
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

// Dictionnaires de présentation réutilisés dans les définitions de niveaux.
const FOOD_NAMES = {
  A: "Steak",
  B: "Salades",
  C: "Oignons",
  D: "Cheddar",
  E: "Bacon",
  F: "Cornichon",
  G: "Ketchup",
  H: "Moutarde",
  I: "Tomate",
  J: "Œuf"
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
  I: "#D94A4A",
  J: "#857b42"
};

window.LEVELS = {
  1: {
    // Niveau d'introduction : placements surtout contraints pour apprendre la logique.
    id: 1,
    title: "Burger 1",
    description:
      "Tu veux me rejoindre en cuisine ? Montre-moi ce que tu sais faire.",
    hideRequirementBadges: true,
    hideNeutralTypeHints: true,
    showAllPlacedRule: true,
    fillAgenda: false,
    displayRules: [
      "Tous les ingrédients doivent être placés."
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
    // Niveau intermédiaire : ajoute une contrainte d'ordre entre deux ingrédients.
    id: 2,
    title: "Burger 2",
    description:
      "Si je te donne quelques consignes en plus, tu peux t'en sortir ?",
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
    // Niveau avancé : travail par types d'ingrédients et remplissage complet obligatoire.
    id: 3,
    title: "Burger 3",
    description:
      "Je te prends en période d'essai. Tu peux prendre la prochaine commande mais attention aux types des aliments.",
    showAllPlacedRule: false,
    fillAgenda: true,
    displayRules: [
      "Les 8 emplacements doivent être remplis.",
      "Un ingrédient chaud ne peut pas être à côté d’un froid.",
      "Un ingrédient fondant doit être adjacent à au moins un chaud.",
      "Salades doit être placé plus haut que le Ketchup.",
      "Oignons doivent être placés plus haut que le Cheddar."
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
    // Niveau le plus complexe : ingrédients scindables et contraintes plus piégeuses.
    id: 4,
    title: "Burger 4",
    description:
      "Le client n'aime pas quand trop d'ingrédients sont trop gros, il digère mal.",
    showAllPlacedRule: false,
    fillAgenda: true,
    displayRules: [
      "Les 8 emplacements doivent être remplis.",
      "Un ingrédient chaud ne peut pas être à côté d’un froid.",
      "Un ingrédient fondant doit être adjacent à au moins un chaud.",
      "Si un ingrédient prend 2 blocs, ses conditions s'appliquent sur ses 2 côtés.",
      "Certains ingrédients peuvent être joués en bloc ou découpés.",
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
    // Niveau expert : la symétrie porte sur les types, avec plusieurs faux appâts.
    id: 5,
    title: "Burger 5",
    description:
      "Le client est très à cheval sur la symétrie des types qui composent son burger. Je compte sur vous !",
    showAllPlacedRule: false,
    fillAgenda: true,
    requireMirrorTypeSymmetry: true,
    displayRules: [
      "Les 8 emplacements doivent être remplis.",
      "Le burger doit être symétrique par type : 1=8, 2=7, 3=6 et 4=5.",
      "Un ingrédient chaud ne peut pas être à côté d'un froid.",
      "Un ingrédient fondant doit être adjacent à au moins un chaud.",
      "Certains ingrédients peuvent être joués en bloc ou découpés."
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
        required: false,
        type: "chaud",
        splittable: true,
        allowedPositionSets: [
          [4, 5]
        ],
        splitParts: [
          {
            id: "A_1",
            name: "Steak 1",
            duration: 1,
            type: "chaud",
            required: false,
            allowedPositions: [4, 5]
          },
          {
            id: "A_2",
            name: "Steak 2",
            duration: 1,
            type: "chaud",
            required: false,
            allowedPositions: [1, 7, 8]
          }
        ]
      },
      {
        id: "D",
        name: FOOD_NAMES.D,
        duration: 2,
        color: FOOD_COLORS.D,
        required: false,
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
          { id: "D_1", name: "Cheddar 1", duration: 1, type: "fondant", required: false },
          { id: "D_2", name: "Cheddar 2", duration: 1, type: "fondant", required: false }
        ]
      },
      {
        id: "E",
        name: FOOD_NAMES.E,
        duration: 1,
        color: FOOD_COLORS.E,
        required: true,
        type: "chaud",
        allowedPositions: [4, 5, 6]
      },
      {
        id: "B",
        name: FOOD_NAMES.B,
        duration: 1,
        color: FOOD_COLORS.B,
        required: false,
        type: "froid",
        allowedPositions: [1]
      },
      {
        id: "C",
        name: FOOD_NAMES.C,
        duration: 1,
        color: FOOD_COLORS.C,
        required: false,
        type: "froid",
        allowedPositions: [1, 8]
      },
      {
        id: "F",
        name: FOOD_NAMES.F,
        duration: 1,
        color: FOOD_COLORS.F,
        required: false,
        type: "froid",
        allowedPositions: [6, 8]
      },
      {
        id: "G",
        name: FOOD_NAMES.G,
        duration: 1,
        color: FOOD_COLORS.G,
        required: true,
        type: "neutre",
        allowedPositions: [1, 3, 4]
      },
      {
        id: "H",
        name: FOOD_NAMES.H,
        duration: 1,
        color: FOOD_COLORS.H,
        required: false,
        type: "neutre",
        allowedPositions: [6, 7]
      },
      {
        id: "I",
        name: FOOD_NAMES.I,
        duration: 1,
        color: FOOD_COLORS.I,
        required: false,
        type: "froid",
        allowedPositions: [2, 7]
      },
      {
        id: "J",
        name: FOOD_NAMES.J,
        duration: 1,
        color: FOOD_COLORS.J,
        required: false,
        type: "chaud",
        allowedPositions: [2, 3, 4]
      }
    ],
    globalRules: [
      { type: "before", first: "G", second: "H" }
    ]
  },

  6: {
    // Niveau expert alternatif : même roster que le niveau 5, mais avec gravité de pose.
    id: 6,
    title: "Burger 6",
    description:
      "Le client veut un montage millimétré : chaque ingrédient tombe tout en bas, donc il faut construire le burger dans le bon ordre.",
    showAllPlacedRule: false,
    fillAgenda: true,
    dropToLowestAvailable: true,
    displayRules: [
      "Les 8 emplacements doivent être remplis.",
      "Quand tu poses un ingrédient, il tombe automatiquement dans l'emplacement le plus bas.",
      "Un ingrédient chaud ne peut pas être à côté d'un froid.",
      "Un ingrédient fondant doit être adjacent à au moins un chaud.",
      "Certains ingrédients peuvent être joués en bloc ou découpés."
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
        required: false,
        type: "chaud",
        splittable: true,
        allowedPositionSets: [
          [5, 6],
          [6, 7],
          [7, 8]
        ],
        splitAllowedPositionSets: [
          [2, 3],
          [2, 6],
          [2, 7],
          [3, 6],
          [3, 7],
          [6, 7]
        ],
        splitParts: [
          { id: "A_1", name: "Steak 1", duration: 1, type: "chaud", required: false },
          { id: "A_2", name: "Steak 2", duration: 1, type: "chaud", required: false }
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
          [6, 7],
          [7, 8]
        ],
        splitAllowedPositionSets: [
          [1, 2],
          [1, 6],
          [1, 7],
          [1, 8],
          [2, 6],
          [2, 7],
          [2, 8],
          [6, 7],
          [6, 8],
          [7, 8]
        ],
        splitParts: [
          { id: "D_1", name: "Cheddar 1", duration: 1, type: "fondant", required: true },
          { id: "D_2", name: "Cheddar 2", duration: 1, type: "fondant", required: true }
        ]
      },
      {
        id: "E",
        name: FOOD_NAMES.E,
        duration: 1,
        color: FOOD_COLORS.E,
        required: true,
        type: "chaud",
        allowedPositions: [7, 8]
      },
      {
        id: "B",
        name: FOOD_NAMES.B,
        duration: 1,
        color: FOOD_COLORS.B,
        required: true,
        type: "froid",
        allowedPositions: [1, 2]
      },
      {
        id: "C",
        name: FOOD_NAMES.C,
        duration: 2,
        color: FOOD_COLORS.C,
        required: true,
        type: "froid",
        splittable: true,
        allowedPositionSets: [
          [4, 5],
          [5, 6]
        ],
        splitAllowedPositionSets: [
          [3, 4],
          [3, 5],
          [4, 5]
        ],
        splitParts: [
          { id: "C_1", name: "Oignons 1", duration: 1, type: "froid", required: true },
          { id: "C_2", name: "Oignons 2", duration: 1, type: "froid", required: false }
        ]
      },
      {
        id: "G",
        name: FOOD_NAMES.G,
        duration: 1,
        color: FOOD_COLORS.G,
        required: true,
        type: "neutre",
        allowedPositions: [2, 3, 4]
      },
      {
        id: "H",
        name: FOOD_NAMES.H,
        duration: 1,
        color: FOOD_COLORS.H,
        required: true,
        type: "neutre",
        allowedPositions: [5, 6, 7]
      },
      {
        id: "I",
        name: FOOD_NAMES.I,
        duration: 2,
        color: FOOD_COLORS.I,
        required: false,
        type: "froid",
        splittable: true,
        allowedPositionSets: [
          [1, 2],
          [2, 3]
        ],
        splitAllowedPositionSets: [
          [5, 6],
          [5, 7],
          [5, 8],
          [6, 7],
          [6, 8],
          [7, 8]
        ],
        splitParts: [
          { id: "I_1", name: "Tomate 1", duration: 1, type: "froid", required: false },
          { id: "I_2", name: "Tomate 2", duration: 1, type: "froid", required: false }
        ]
      },
      {
        id: "J",
        name: FOOD_NAMES.J,
        duration: 1,
        color: FOOD_COLORS.J,
        required: false,
        type: "chaud",
        allowedPositions: [4, 5, 6, 7]
      }
    ],
    globalRules: [
      { type: "before", first: "G", second: "H" }
    ]
  }
};
