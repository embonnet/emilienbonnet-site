(function () {
  // Moteur metier du jeu : etat, placements et validation des regles.
  const SLOT_DEFS = window.SLOT_DEFS;

  const POSITION_TO_SLOT_ID = {
    1: "s0",
    2: "s1",
    3: "s2",
    4: "s4",
    5: "s5",
    6: "s6",
    7: "s7",
    8: "s8"
  };

  const SLOT_ID_TO_POSITION = {};
  Object.keys(POSITION_TO_SLOT_ID).forEach((pos) => {
    SLOT_ID_TO_POSITION[POSITION_TO_SLOT_ID[pos]] = Number(pos);
  });

  function createEmptyState(level) {
    // Cree un etat vierge pour un niveau donne.
    const assignments = {};

    SLOT_DEFS.forEach((slot) => {
      assignments[slot.id] = slot.fixed ? "__FIXED__" : null;
    });

    const splitMap = {};
    level.activities.forEach((activity) => {
      if (activity.splittable) {
        splitMap[activity.id] = false;
      }
    });

    return {
      levelId: level.id,
      assignments,
      placed: {},
      splitMap
    };
  }

  function getSlotIndexById(slotId) {
    // Retourne l'index technique d'un slot dans SLOT_DEFS.
    return SLOT_DEFS.findIndex((slot) => slot.id === slotId);
  }

  function getLogicalActivityById(level, activityId) {
    // Recupere l'ingredient "source" tel qu'il est defini dans les donnees du niveau.
    return level.activities.find((activity) => activity.id === activityId) || null;
  }

  function getRelatedPlaceableIds(level, activityId) {
    const logical = getLogicalActivityById(level, activityId);
    if (!logical) return [];

    if (!logical.splittable) {
      return [logical.id];
    }

    return [logical.id].concat(logical.splitParts.map((part) => part.id));
  }

  function isPlaceablePlaced(state, placeableId) {
    return Boolean(state.placed[placeableId]);
  }

  function canToggleSplit(level, state, activityId) {
    // La fusion/scission est interdite si une des variantes est deja posee.
    const logical = getLogicalActivityById(level, activityId);
    if (!logical || !logical.splittable) return false;

    const relatedIds = getRelatedPlaceableIds(level, activityId);
    return !relatedIds.some((id) => isPlaceablePlaced(state, id));
  }

  function toggleSplit(level, state, activityId) {
    if (!canToggleSplit(level, state, activityId)) {
      return {
        ok: false,
        reason: "Impossible de scinder ou fusionner une ingrédient déjà placée."
      };
    }

    state.splitMap[activityId] = !state.splitMap[activityId];
    return { ok: true };
  }

  function getAvailablePlaceables(level, state) {
    // Construit la liste effectivement draggable selon le mode scinde ou non de chaque ingredient.
    const result = [];

    level.activities.forEach((activity) => {
      const isSplit = activity.splittable && state.splitMap[activity.id];

      if (isSplit) {
        const splitGroupConstraint = normalizePositionSets(activity.splitAllowedPositionSets);
        const fallbackAllowedPositions = splitGroupConstraint
          ? uniqueFlat(splitGroupConstraint)
          : null;

        activity.splitParts.forEach((part) => {
          const partAllowedPositions = normalizePositions(part.allowedPositions);
          const partAllowedPositionSets = normalizePositionSets(part.allowedPositionSets);

          result.push({
            id: part.id,
            logicalId: activity.id,
            name: part.name,
            duration: part.duration,
            color: part.color || activity.color,
            required: part.required != null ? part.required : false,
            type: part.type || activity.type || "neutre",
            allowedPositions: partAllowedPositions || fallbackAllowedPositions,
            allowedPositionSets: partAllowedPositionSets,
            logicalSplitPositionSets: splitGroupConstraint,
            splitGroupIds: activity.splitParts.map((p) => p.id),
            symmetryKey: part.symmetryKey || activity.symmetryKey || activity.id,
            isSplitPart: true
          });
        });
      } else {
        result.push({
          id: activity.id,
          logicalId: activity.id,
          name: activity.name,
          duration: activity.duration,
          color: activity.color,
          required: activity.required != null ? activity.required : true,
          type: activity.type || "neutre",
          allowedPositions: normalizePositions(activity.allowedPositions),
          allowedPositionSets: normalizePositionSets(activity.allowedPositionSets),
          logicalSplitPositionSets: null,
          splitGroupIds: null,
          symmetryKey: activity.symmetryKey || activity.id,
          isSplitPart: false
        });
      }
    });

    return result;
  }

  function getPlaceableById(level, state, placeableId) {
    return getAvailablePlaceables(level, state).find((item) => item.id === placeableId) || null;
  }

  function getAssignedActivityIdAtSlot(state, slotId) {
    const value = state.assignments[slotId];
    if (value === "__FIXED__" || value == null) return null;
    return value;
  }

  function slotIdToPosition(slotId) {
    return SLOT_ID_TO_POSITION[slotId] || null;
  }

  function positionToSlotId(position) {
    return POSITION_TO_SLOT_ID[position] || null;
  }

  function uniqueFlat(positionSets) {
    // Aplati une liste de groupes de positions en supprimant les doublons.
    const values = [];
    positionSets.forEach((group) => {
      group.forEach((value) => {
        if (!values.includes(value)) {
          values.push(value);
        }
      });
    });
    return values;
  }

  function normalizePositions(positions) {
    if (!Array.isArray(positions) || positions.length === 0) {
      return null;
    }

    return positions;
  }

  function normalizePositionSets(positionSets) {
    if (!Array.isArray(positionSets) || positionSets.length === 0) {
      return null;
    }

    return positionSets.filter((group) => Array.isArray(group) && group.length > 0);
  }

  function normalizeSlotIds(slotIds) {
    return slotIds
      .slice()
      .sort((a, b) => slotIdToPosition(a) - slotIdToPosition(b));
  }

  function sameSlotSet(a, b) {
    if (a.length !== b.length) return false;

    const aa = normalizeSlotIds(a);
    const bb = normalizeSlotIds(b);

    for (let i = 0; i < aa.length; i += 1) {
      if (aa[i] !== bb[i]) return false;
    }

    return true;
  }

  function getTargetSlotsFromStart(startSlotId, duration) {
    // Calcule les slots consecutifs necessaires pour poser un ingredient de n blocs.
    const startIndex = getSlotIndexById(startSlotId);
    if (startIndex === -1) return null;

    const span = duration;
    const targetSlots = SLOT_DEFS.slice(startIndex, startIndex + span);

    if (targetSlots.length !== span) return null;
    return targetSlots;
  }

  function targetSlotsAreFree(state, targetSlots) {
    // Verifie que tous les slots vises sont disponibles.
    for (const slot of targetSlots) {
      if (slot.fixed) {
        return { ok: false, reason: "Impossible de recouvrir un ingrédient fixe." };
      }

      if (state.assignments[slot.id] !== null) {
        return { ok: false, reason: "Des ingrédients sont déjà occupés." };
      }
    }

    return { ok: true };
  }

  function fitsAllowedPositions(placeable, targetSlotIds) {
    // Valide les positions simples ou les combinaisons exactes definies dans les donnees.
    if (placeable.allowedPositions && placeable.allowedPositions.length > 0) {
      if (targetSlotIds.length !== 1) return false;
      const pos = slotIdToPosition(targetSlotIds[0]);
      return placeable.allowedPositions.includes(pos);
    }

    if (placeable.allowedPositionSets && placeable.allowedPositionSets.length > 0) {
      const allowedSlotSets = placeable.allowedPositionSets.map((group) =>
        group.map(positionToSlotId)
      );

      return allowedSlotSets.some((slotSet) => sameSlotSet(slotSet, targetSlotIds));
    }

    return true;
  }

  function fitsSplitCombination(placeable, state, targetSlotIds) {
    // Controle qu'un morceau scinde reste compatible avec la combinaison complete autorisee.
    if (
      !placeable.isSplitPart ||
      !placeable.logicalSplitPositionSets ||
      placeable.logicalSplitPositionSets.length === 0
    ) {
      return { ok: true };
    }

    const targetSlotId = targetSlotIds[0];
    const allowedSets = placeable.logicalSplitPositionSets.map((group) =>
      group.map(positionToSlotId)
    );

    const siblings = (placeable.splitGroupIds || []).filter((id) => id !== placeable.id);
    const siblingPlacedSlots = [];

    siblings.forEach((siblingId) => {
      const placed = state.placed[siblingId];
      if (placed) {
        siblingPlacedSlots.push.apply(siblingPlacedSlots, placed.slots);
      }
    });

    if (siblingPlacedSlots.length === 0) {
      const possible = allowedSets.some((set) => set.includes(targetSlotId));
      return possible
        ? { ok: true }
        : { ok: false, reason: "Ce morceau ne peut pas être placé ici." };
    }

    const combined = siblingPlacedSlots.concat(targetSlotId);
    const possible = allowedSets.some((set) => sameSlotSet(set, combined));

    return possible
      ? { ok: true }
      : {
          ok: false,
      reason: "Ce placement ne correspond à aucune combinaison autorisée pour cet ingrédient découpé."
        };
  }

  function getGravityResolvedTargetSlots(level, state, placeable) {
    // En mode gravite, un ingredient tombe toujours sur l'emplacement libre le plus bas.
    if (!level.dropToLowestAvailable) {
      return null;
    }

    for (let pos = 8; pos >= 1; pos -= 1) {
      const startSlotId = positionToSlotId(pos);
      if (!startSlotId) continue;

      const targetSlots = getTargetSlotsFromStart(startSlotId, placeable.duration);
      if (!targetSlots) continue;

      const freeCheck = targetSlotsAreFree(state, targetSlots);
      if (!freeCheck.ok) continue;

      return {
        ok: true,
        startSlotId,
        targetSlots
      };
    }

    return {
      ok: false,
      reason: `Le placement de ${placeable.name} n'est pas autorisé.`
    };
  }

  function validatePlacementConstraints(level, state) {
    // Verifie en fin de partie que chaque ingredient respecte bien ses contraintes de pose.
    const errors = [];

    Object.keys(state.placed).forEach((placeableId) => {
      const placeable = getPlaceableById(level, state, placeableId);
      const placed = state.placed[placeableId];
      if (!placeable || !placed) return;

      const targetSlotIds = placed.slots.slice();

      if (!fitsAllowedPositions(placeable, targetSlotIds)) {
        errors.push(`${placeable.name} n'est pas placé au bon endroit.`);
      }

      const splitCheck = fitsSplitCombination(placeable, state, targetSlotIds);
      if (!splitCheck.ok) {
        errors.push(splitCheck.reason);
      }
    });

    return uniqueStrings(errors);
  }

  function canPlaceActivity(level, state, placeableId, startSlotId) {
    // Point d'entree de validation avant toute pose dans la grille.
    const placeable = getPlaceableById(level, state, placeableId);

    if (!placeable) {
      return { ok: false, reason: "Ingrédient introuvable." };
    }

    if (isPlaceablePlaced(state, placeableId)) {
      return { ok: false, reason: "Cet ingrédient est déjà placé." };
    }

    const gravityPlacement = getGravityResolvedTargetSlots(level, state, placeable);
    if (gravityPlacement) {
      return gravityPlacement;
    }

    const targetSlots = getTargetSlotsFromStart(startSlotId, placeable.duration);
    if (!targetSlots) {
      return { ok: false, reason: "Pas assez de place." };
    }

    const freeCheck = targetSlotsAreFree(state, targetSlots);
    if (!freeCheck.ok) {
      return freeCheck;
    }

    const targetSlotIds = targetSlots.map((slot) => slot.id);

    if (!fitsAllowedPositions(placeable, targetSlotIds)) {
      return {
        ok: false,
        reason: `Le placement de ${placeable.name} n'est pas autorisé.`
      };
    }

    const splitCheck = fitsSplitCombination(placeable, state, targetSlotIds);
    if (!splitCheck.ok) {
      return splitCheck;
    }

    return {
      ok: true,
      targetSlots
    };
  }

  function placeActivity(level, state, placeableId, startSlotId) {
    // Ecrit le placement dans l'etat si toutes les verifications passent.
    const result = canPlaceActivity(level, state, placeableId, startSlotId);

    if (!result.ok) {
      return result;
    }

    result.targetSlots.forEach((slot) => {
      state.assignments[slot.id] = placeableId;
    });

    state.placed[placeableId] = {
      activityId: placeableId,
      startSlotId: result.startSlotId || startSlotId,
      slots: result.targetSlots.map((slot) => slot.id)
    };

    return { ok: true };
  }

  function compactPlacedActivitiesDown(level, state) {
    // En mode gravite, tasse tous les ingredients restants vers le bas en preservant leur ordre.
    if (!level || !level.dropToLowestAvailable) {
      return;
    }

    const placedEntries = Object.keys(state.placed)
      .map((placeableId) => ({
        placeableId,
        placed: state.placed[placeableId]
      }))
      .sort((a, b) => {
        const aPos = Math.max.apply(null, a.placed.slots.map(slotIdToPosition));
        const bPos = Math.max.apply(null, b.placed.slots.map(slotIdToPosition));
        return bPos - aPos;
      });

    SLOT_DEFS.forEach((slot) => {
      if (!slot.fixed) {
        state.assignments[slot.id] = null;
      }
    });

    let nextTopPosition = 8;

    placedEntries.forEach(({ placeableId, placed }) => {
      const duration = placed.slots.length;
      const startPosition = nextTopPosition - duration + 1;
      const startSlotId = positionToSlotId(startPosition);
      const targetSlots = getTargetSlotsFromStart(startSlotId, duration) || [];

      targetSlots.forEach((slot) => {
        state.assignments[slot.id] = placeableId;
      });

      state.placed[placeableId] = {
        activityId: placeableId,
        startSlotId,
        slots: targetSlots.map((slot) => slot.id)
      };

      nextTopPosition = startPosition - 1;
    });
  }

  function removeActivity(level, state, placeableId, options = {}) {
    // Supprime un ingredient pose et libere tous ses slots.
    const placed = state.placed[placeableId];
    if (!placed) return;

    placed.slots.forEach((slotId) => {
      state.assignments[slotId] = null;
    });

    delete state.placed[placeableId];

    if (options.compact !== false) {
      compactPlacedActivitiesDown(level, state);
    }
  }

  function movePlacedActivity(level, state, placeableId, targetSlotId) {
    // Deplace un ingredient avec restauration automatique en cas d'echec.
    const placed = state.placed[placeableId];
    if (!placed) {
      return { ok: false, reason: "ingrédient non placé." };
    }

    const originalStart = placed.startSlotId;
    removeActivity(level, state, placeableId, { compact: false });

    const moved = placeActivity(level, state, placeableId, targetSlotId);
    if (moved.ok) {
      return { ok: true };
    }

    placeActivity(level, state, placeableId, originalStart);
    return moved;
  }

  function swapPlacedActivities(level, state, firstId, secondId) {
    // Echange deux ingredients poses tout en preservant un retour arriere propre si besoin.
    if (!state.placed[firstId] || !state.placed[secondId]) {
      return { ok: false, reason: "Échange impossible." };
    }

    if (firstId === secondId) {
      return { ok: true };
    }

    const firstStart = state.placed[firstId].startSlotId;
    const secondStart = state.placed[secondId].startSlotId;

    removeActivity(level, state, firstId, { compact: false });
    removeActivity(level, state, secondId, { compact: false });

    const firstPlaced = placeActivity(level, state, firstId, secondStart);
    if (!firstPlaced.ok) {
      placeActivity(level, state, firstId, firstStart);
      placeActivity(level, state, secondId, secondStart);
      return firstPlaced;
    }

    const secondPlaced = placeActivity(level, state, secondId, firstStart);
    if (!secondPlaced.ok) {
      removeActivity(level, state, firstId, { compact: false });
      placeActivity(level, state, firstId, firstStart);
      placeActivity(level, state, secondId, secondStart);
      return secondPlaced;
    }

    return { ok: true };
  }

  function areRequiredActivitiesPlaced(level, state) {
    return getAvailablePlaceables(level, state)
      .filter((activity) => activity.required)
      .every((activity) => isPlaceablePlaced(state, activity.id));
  }

  function getMissingRequiredActivities(level, state) {
    return getAvailablePlaceables(level, state)
      .filter((activity) => activity.required)
      .filter((activity) => !isPlaceablePlaced(state, activity.id));
  }

  function areAllCurrentPlaceablesPlaced(level, state) {
    return getAvailablePlaceables(level, state)
      .every((activity) => isPlaceablePlaced(state, activity.id));
  }

  function isAgendaFull(state) {
    return SLOT_DEFS
      .filter((slot) => !slot.fixed)
      .every((slot) => state.assignments[slot.id] !== null);
  }

  function getPlacedStartPosition(state, activityId) {
    const placed = state.placed[activityId];
    if (!placed || !placed.slots.length) return null;

    const positions = placed.slots.map(slotIdToPosition).filter(Boolean);
    return Math.min.apply(null, positions);
  }

  function startsBefore(state, firstId, secondId) {
    const a = getPlacedStartPosition(state, firstId);
    const b = getPlacedStartPosition(state, secondId);

    if (a == null || b == null) return false;
    return a < b;
  }

  function getPlaceableOrLogical(level, state, id) {
    return (
      getPlaceableById(level, state, id) ||
      getLogicalActivityById(level, id) ||
      null
    );
  }

  function areTypesConflicting(typeA, typeB, conflictPairs) {
    if (!typeA || !typeB) return false;
    if (typeA === "neutre" || typeB === "neutre") return false;
    if (typeA === "fondant" || typeB === "fondant") return false;

    return conflictPairs.some(([x, y]) => {
      return (
        (typeA === x && typeB === y) ||
        (typeA === y && typeB === x)
      );
    });
  }

  function validateTypeAdjacency(level, state) {
    // Controle les incompatibilites de voisinage entre types d'ingredients.
    const errors = [];
    const conflicts = level.typeConflicts || [];

    if (!conflicts.length) return errors;

    for (let pos = 1; pos <= 7; pos += 1) {
      const slotA = positionToSlotId(pos);
      const slotB = positionToSlotId(pos + 1);

      const idA = getAssignedActivityIdAtSlot(state, slotA);
      const idB = getAssignedActivityIdAtSlot(state, slotB);

      if (!idA || !idB) continue;
      if (idA === idB) continue;

      const actA = getPlaceableOrLogical(level, state, idA);
      const actB = getPlaceableOrLogical(level, state, idB);

      const typeA = actA ? actA.type : "neutre";
      const typeB = actB ? actB.type : "neutre";

      if (areTypesConflicting(typeA, typeB, conflicts)) {
        errors.push(
          `${actA.name} (${typeA}) ne peut pas être adjacent à ${actB.name} (${typeB}).`
        );
      }
    }

    return uniqueStrings(errors);
  }

  function validateFondantAdjacency(level, state) {
    // Un ingredient fondant doit toujours toucher au moins un ingredient chaud.
    const errors = [];

    for (let pos = 1; pos <= 8; pos += 1) {
      const slotId = positionToSlotId(pos);
      const activityId = getAssignedActivityIdAtSlot(state, slotId);

      if (!activityId) continue;

      const activity = getPlaceableOrLogical(level, state, activityId);
      if (!activity || activity.type !== "fondant") continue;

      const leftSlot = positionToSlotId(pos - 1);
      const rightSlot = positionToSlotId(pos + 1);

      const neighborIds = [leftSlot, rightSlot]
        .filter(Boolean)
        .map((id) => getAssignedActivityIdAtSlot(state, id))
        .filter(Boolean)
        .filter((id) => id !== activityId);

      const hasAdjacentHot = neighborIds.some((neighborId) => {
        const neighbor = getPlaceableOrLogical(level, state, neighborId);
        return neighbor && neighbor.type === "chaud";
      });

      if (!hasAdjacentHot) {
        errors.push(`${activity.name} (fondant) doit être adjacent à au moins un ingrédient chaud. Si l'ingrédient prend 2 blocs, il doit respecter les conditions des deux côtés.`);
      }
    }

    return uniqueStrings(errors);
  }

  function uniqueStrings(list) {
    return list.filter((value, index) => list.indexOf(value) === index);
  }

  function validateMirrorSymmetry(level, state) {
    // Controle que chaque paire de positions miroir respecte la symetrie attendue.
    if (!level.requireMirrorSymmetry && !level.requireMirrorTypeSymmetry) {
      return [];
    }

    for (let pos = 1; pos <= 4; pos += 1) {
      const leftId = getAssignedActivityIdAtSlot(state, positionToSlotId(pos));
      const rightId = getAssignedActivityIdAtSlot(state, positionToSlotId(9 - pos));

      if (!leftId || !rightId) {
        return ["La composition du burger doit etre parfaitement symetrique."];
      }

      if (leftId === rightId) {
        continue;
      }

      const leftActivity = getPlaceableOrLogical(level, state, leftId);
      const rightActivity = getPlaceableOrLogical(level, state, rightId);

      if (level.requireMirrorTypeSymmetry) {
        const leftType = leftActivity ? leftActivity.type : null;
        const rightType = rightActivity ? rightActivity.type : null;

        if (leftType !== rightType) {
          return ["Le burger doit etre symetrique par type d'ingredient."];
        }

        continue;
      }

      const leftKey = leftActivity && leftActivity.symmetryKey ? leftActivity.symmetryKey : leftId;
      const rightKey = rightActivity && rightActivity.symmetryKey ? rightActivity.symmetryKey : rightId;

      if (leftKey !== rightKey) {
        return ["La composition du burger doit etre parfaitement symetrique."];
      }
    }

    return [];
  }

  function validateState(level, state) {
    // Regroupe toutes les regles du niveau pour produire une liste d'erreurs exploitable par l'UI.
    const errors = [];

    if (level.fillAgenda && !isAgendaFull(state)) {
      errors.push("Le burger doit être entièrement rempli.");
    }

    if (level.showAllPlacedRule && !areAllCurrentPlaceablesPlaced(level, state)) {
      errors.push("Tous les ingrédients doivent être placés.");
    }

    getMissingRequiredActivities(level, state).forEach((activity) => {
      errors.push(`${activity.name} est obligatoire.`);
    });

    (level.globalRules || []).forEach((rule) => {
      if (rule.type === "before") {
        const firstPlaced = isPlaceablePlaced(state, rule.first);
        const secondPlaced = isPlaceablePlaced(state, rule.second);

        if (!firstPlaced || !secondPlaced) {
          return;
        }

        if (!startsBefore(state, rule.first, rule.second)) {
          const first = getPlaceableOrLogical(level, state, rule.first);
          const second = getPlaceableOrLogical(level, state, rule.second);

          errors.push(`${first.name} doit être placé au dessus ${second.name}.`);
        }
      }
    });

    errors.push.apply(errors, validateTypeAdjacency(level, state));
    errors.push.apply(errors, validateFondantAdjacency(level, state));
    errors.push.apply(errors, validateMirrorSymmetry(level, state));
    errors.push.apply(errors, validatePlacementConstraints(level, state));

    return {
      ok: errors.length === 0,
      errors
    };
  }

  window.Engine = {
    createEmptyState,
    getSlotIndexById,
    getLogicalActivityById,
    getAvailablePlaceables,
    getPlaceableById,
    isPlaceablePlaced,
    getRelatedPlaceableIds,
    canToggleSplit,
    toggleSplit,
    getAssignedActivityIdAtSlot,
    canPlaceActivity,
    placeActivity,
    removeActivity,
    movePlacedActivity,
    swapPlacedActivities,
    areRequiredActivitiesPlaced,
    areAllCurrentPlaceablesPlaced,
    isAgendaFull,
    validateState
  };
})();


