(function () {
  // Couche d'affichage : transforme l'etat du jeu en DOM interactif.
  const SLOT_DEFS = window.SLOT_DEFS;

  const els = {
    levelTitle: document.getElementById("levelTitle"),
    levelDescription: document.getElementById("levelDescription"),
    rulesList: document.getElementById("rulesList"),
    activityPool: document.getElementById("ingredientReserveArea"),
    ingredientReserveArea: document.getElementById("ingredientReserveArea"),
    agendaGrid: document.getElementById("agendaGrid"),
    messageBox: document.getElementById("messageBox"),
    introTitle: document.getElementById("introTitle"),
    introDescription: document.getElementById("introDescription"),
    introRulesList: document.getElementById("introRulesList")
  };

  let serveOverlay = null;
  let trackedPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let trackingFrameId = null;
  let topBunErrorReactionTimeout = null;
  let currentDragPayload = null;

  const INGREDIENT_VISUAL_BY_ID = {
    A: "steak",
    B: "salad",
    C: "onion",
    D: "cheddar",
    E: "bacon",
    F: "cornichon",
    G: "ketchup",
    H: "mustard",
    I: "tomato",
    J: "oeuf"
  };

  function getIngredientVisualKey(activity) {
    if (!activity) return null;
    return INGREDIENT_VISUAL_BY_ID[activity.logicalId] || INGREDIENT_VISUAL_BY_ID[activity.id] || null;
  }

  function setMessage(text, type = "neutral") {
    // Met a jour la zone de feedback en bas du plateau.
    els.messageBox.textContent = text;
    els.messageBox.className = `message-box ${type}`;
  }

  function renderLevelMeta(level) {
    // Affiche le titre, la description et les regles dans le panneau lateral et la modale.
    els.levelTitle.textContent = level.title;
    els.levelDescription.textContent = level.description;

    els.introTitle.textContent = level.title;
    els.introDescription.textContent = level.description;

    els.rulesList.innerHTML = "";
    els.introRulesList.innerHTML = "";

    level.displayRules.forEach((rule) => {
      const li = document.createElement("li");
      li.textContent = rule;
      els.rulesList.appendChild(li);

      const introLi = document.createElement("li");
      introLi.textContent = rule;
      els.introRulesList.appendChild(introLi);
    });
  }

  function renderActivities(level, state, handlers) {
    // Recompose la reserve d'ingredients disponible selon l'etat courant.
    els.activityPool.innerHTML = "";
    bindReserveDropTarget(handlers.onDropToReserve);

    const placeables = window.Engine.getAvailablePlaceables(level, state);

    placeables.forEach((activity) => {
      const logical = window.Engine.getLogicalActivityById(level, activity.logicalId);
      const isPlaced = Boolean(state.placed[activity.id]);
      const typeMeta = getTypeMeta(activity.type);
      const showRequirementBadge = !level.hideRequirementBadges && activity.required;
      const showTypeHint = !(level.hideNeutralTypeHints && safeType(activity.type) === "neutre");
      const placementMarkers = renderPlacementMarkers(activity.duration);
      const requirementBadge = showRequirementBadge
        ? `<span class="badge required small">Obligatoire</span>`
        : "";
      const typeHint = showTypeHint
        ? `<span class="activity-type-icon">${typeMeta.icon}</span>`
        : "";

      const chip = document.createElement("div");
      chip.className = `activity-chip type-${safeType(activity.type)}`;
      chip.draggable = !isPlaced;
      chip.dataset.activityId = activity.id;
      chip.style.background = activity.color;
      const visualKey = getIngredientVisualKey(activity);
      if (visualKey) {
        chip.dataset.ingredientVisual = visualKey;
      }

      if (isPlaced) {
        chip.classList.add("used");
      }

      chip.innerHTML = `
        <div class="activity-main compact">
          <div class="activity-header">
            <div class="activity-title-group">
              <span class="activity-name">${activity.name}</span>
              <span class="placed-placement-markers">${placementMarkers}</span>
              ${requirementBadge}
            </div>

            <div class="activity-header-meta">
              ${typeHint}
            </div>
          </div>

          <div class="activity-meta compact">
            ${formatPlacement(activity)}
          </div>
        </div>

        <div class="activity-actions"></div>
      `;

      chip.addEventListener("dragstart", (e) => {
        if (isPlaced) {
          e.preventDefault();
          return;
        }

        currentDragPayload = {
          source: "pool",
          activityId: activity.id
        };

        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify(currentDragPayload)
        );
      });

      chip.addEventListener("dragend", () => {
        currentDragPayload = null;
      });

      const actionsEl = chip.querySelector(".activity-actions");

      if (logical && logical.splittable) {
        const splitBtn = document.createElement("button");
        splitBtn.className = "split-btn";
        splitBtn.type = "button";
        splitBtn.textContent = state.splitMap[logical.id] ? "Fusionner" : "Scinder";
        splitBtn.disabled = !window.Engine.canToggleSplit(level, state, logical.id);

        splitBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          handlers.onToggleSplit(logical.id);
        });

        actionsEl.appendChild(splitBtn);
      }

      els.activityPool.appendChild(chip);
    });

    syncReserveDropMinHeight();
  }

  function bindReserveDropTarget(onDropToReserve) {
    const reserveArea = els.ingredientReserveArea;
    if (!reserveArea || reserveArea.dataset.dropBound === "true") {
      return;
    }

    reserveArea.dataset.dropBound = "true";

      const clearHighlight = () => {
        reserveArea.classList.remove("drag-over");
      };

    reserveArea.addEventListener("dragover", (e) => {
      const payload = getCurrentDragPayload(e);
      if (payload?.source !== "placed") {
        return;
      }

      e.preventDefault();
      reserveArea.classList.add("drag-over");
    });

    reserveArea.addEventListener("dragleave", (e) => {
      const nextTarget = e.relatedTarget;
      if (nextTarget instanceof Node && reserveArea.contains(nextTarget)) {
        return;
      }

      clearHighlight();
    });

    reserveArea.addEventListener("drop", (e) => {
      clearHighlight();
      e.preventDefault();

      const payload = getCurrentDragPayload(e);
      currentDragPayload = null;

      if (payload?.source !== "placed" || !payload.activityId || typeof onDropToReserve !== "function") {
        return;
      }

      onDropToReserve(payload.activityId);
    });
  }

  function syncReserveDropMinHeight() {
    const reserveArea = els.ingredientReserveArea;
    if (!reserveArea) {
      return;
    }

    reserveArea.style.minHeight = "0px";
    const contentHeight = reserveArea.scrollHeight;
    reserveArea.style.minHeight = `${contentHeight}px`;
  }

  function renderAgenda(level, state, handlers) {
    // Construit visuellement la pile du burger avec ses zones de drop.
    els.agendaGrid.innerHTML = "";

    let currentRow = 1;

    renderBurgerImageRow("pictures/top_bun.png", currentRow);
    currentRow += 1;

    SLOT_DEFS.forEach((slot) => {
      const row = currentRow;

      const timeCell = document.createElement("div");
      timeCell.className = "time-cell";
      timeCell.style.gridColumn = "1";
      timeCell.style.gridRow = `${row}`;
      timeCell.textContent = `${slot.index}`;

      if (!slot.fixed) {
        attachDropEvents(timeCell, slot.id, handlers.onDropActivity, timeCell);
        timeCell.classList.add("drop-target");
      }

      els.agendaGrid.appendChild(timeCell);

      const assignedId = state.assignments[slot.id];

      if (assignedId === null) {
        const freeCell = document.createElement("div");
        freeCell.className = "content-cell free drop-target";
        freeCell.style.gridColumn = "2";
        freeCell.style.gridRow = `${row}`;

        const inner = document.createElement("div");
        inner.className = "free-inner";
        attachDropEvents(inner, slot.id, handlers.onDropActivity, freeCell);

        freeCell.appendChild(inner);
        els.agendaGrid.appendChild(freeCell);
        currentRow += 1;
        return;
      }

      const placed = state.placed[assignedId];
      if (!placed || placed.slots[0] !== slot.id) {
        currentRow += 1;
        return;
      }

      const activity = window.Engine.getPlaceableById(level, state, assignedId);
      const span = placed.slots.length;
      const typeMeta = getTypeMeta(activity.type);
      const showRequirementBadge = !level.hideRequirementBadges && activity.required;
      const showTypeHint = !(level.hideNeutralTypeHints && safeType(activity.type) === "neutre");
      const typeBadge = showTypeHint
        ? `<span class="type-badge type-${safeType(activity.type)} compact">
            <span class="type-dot"></span>
            <span class="type-icon">${typeMeta.icon}</span>
            <span class="type-label">${typeMeta.label}</span>
          </span>`
        : "";
      const placementText = formatPlacement(activity, { withLabel: false });
      const requirementRow = showRequirementBadge
        ? `<div class="placed-subtitle">Obligatoire</div>`
        : "";

      const placedCell = document.createElement("div");
      placedCell.className = `content-cell drop-target type-frame-${safeType(activity.type)}`;
      placedCell.style.gridColumn = "2";
      placedCell.style.gridRow = `${row} / span ${span}`;

      attachDropEvents(placedCell, placed.startSlotId, handlers.onDropActivity, placedCell);

      const block = document.createElement("div");
      block.className = `placed-block type-${safeType(activity.type)}`;
      block.draggable = true;
      block.style.background = activity.color;
      const blockVisualKey = getIngredientVisualKey(activity);
      if (blockVisualKey) {
        block.dataset.ingredientVisual = blockVisualKey;
      }

      block.innerHTML = `
        <div class="placed-main">
          <div class="placed-title-row">
            <div class="placed-title">${activity.name}</div>
            <div class="placed-title-meta">
              <span class="placed-placement-text">${placementText}</span>
              ${typeBadge}
            </div>
          </div>
          ${requirementRow}
        </div>

        <div class="placed-actions">
          <button type="button" class="mini-btn delete-btn">Supprimer</button>
        </div>
      `;

      block.addEventListener("dragstart", (e) => {
        currentDragPayload = {
          source: "placed",
          activityId: activity.id
        };

        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify(currentDragPayload)
        );
      });

      block.addEventListener("dragend", () => {
        currentDragPayload = null;
      });

      block.addEventListener("dblclick", () => {
        handlers.onRemoveActivity(activity.id);
      });

      const deleteBtn = block.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.onRemoveActivity(activity.id);
      });

      placedCell.appendChild(block);
      els.agendaGrid.appendChild(placedCell);
      currentRow += 1;
    });

    renderBurgerImageRow("pictures/bottom_bun.png", currentRow);
    scheduleTopBunFaceTracking();
  }

  function renderBurgerImageRow(imagePath, row) {
    // Ajoute le pain du haut ou du bas a la grille.
    const isTop = row === 1;

    const leftCell = document.createElement("div");
    leftCell.className = isTop ? "bun-label-cell" : "bun-time-cell";
    leftCell.style.gridColumn = "1";
    leftCell.style.gridRow = `${row}`;

    if (isTop) {
      leftCell.textContent = "Ingredient";
    }

    const imageCell = document.createElement("div");
    imageCell.className = "bun-cell";
    imageCell.style.gridColumn = "2";
    imageCell.style.gridRow = `${row}`;
    imageCell.dataset.servePiece = row === 1 ? "top-bun" : "bottom-bun";

    const img = document.createElement("img");
    img.src = imagePath;
    img.alt = "";
    img.className = "bun-img";
    img.draggable = false;

    const bunCharacter = document.createElement("div");
    bunCharacter.className = `bun-character${isTop ? " bun-character-top" : " bun-character-bottom"}`;
    bunCharacter.setAttribute("aria-hidden", "true");
    bunCharacter.appendChild(img);

    if (isTop) {
      const eyes = document.createElement("div");
      eyes.className = "bun-eyes";
      eyes.innerHTML = `
        <span class="bun-eye bun-eye-left">
          <span class="bun-eye-shine bun-eye-shine-primary"></span>
          <span class="bun-eye-shine bun-eye-shine-secondary"></span>
          <span class="bun-pupil"></span>
          <span class="bun-eye-lid"></span>
        </span>
        <span class="bun-eye bun-eye-right">
          <span class="bun-eye-shine bun-eye-shine-primary"></span>
          <span class="bun-eye-shine bun-eye-shine-secondary"></span>
          <span class="bun-pupil"></span>
          <span class="bun-eye-lid"></span>
        </span>
      `;

      bunCharacter.appendChild(eyes);
    } else {
      const mouth = document.createElement("div");
      mouth.className = "bun-mouth";
      mouth.innerHTML = `
        <span class="bun-mouth-inner"></span>
        <span class="bun-mouth-tongue"></span>
      `;
      bunCharacter.appendChild(mouth);
    }

    imageCell.appendChild(bunCharacter);

    els.agendaGrid.appendChild(leftCell);
    els.agendaGrid.appendChild(imageCell);
  }

  function scheduleTopBunFaceTracking() {
    if (trackingFrameId !== null) {
      return;
    }

    trackingFrameId = window.requestAnimationFrame(() => {
      trackingFrameId = null;
      updateTopBunFaceTracking();
    });
  }

  function updateTopBunFaceTracking() {
    const topBun = els.agendaGrid.querySelector(".bun-character-top");
    if (!topBun) {
      return;
    }

    const rect = topBun.getBoundingClientRect();
    const eyeAnchorX = rect.left + rect.width / 2;
    const eyeAnchorY = rect.top + rect.height * 0.28;
    const deltaX = trackedPointer.x - eyeAnchorX;
    const deltaY = trackedPointer.y - eyeAnchorY;
    const maxEyeOffset = 3;
    const maxPupilOffset = 7;
    const eyeLookX = Math.max(-maxEyeOffset, Math.min(maxEyeOffset, deltaX / 42));
    const eyeLookY = Math.max(-maxEyeOffset * 0.8, Math.min(maxEyeOffset * 0.8, deltaY / 54));
    const pupilLookX = Math.max(-maxPupilOffset, Math.min(maxPupilOffset, deltaX / 18));
    const pupilLookY = Math.max(-maxPupilOffset * 0.6, Math.min(maxPupilOffset * 0.6, deltaY / 28));

    topBun.style.setProperty("--bun-eye-look-x", `${eyeLookX.toFixed(2)}px`);
    topBun.style.setProperty("--bun-eye-look-y", `${eyeLookY.toFixed(2)}px`);
    topBun.style.setProperty("--bun-look-x", `${pupilLookX.toFixed(2)}px`);
    topBun.style.setProperty("--bun-look-y", `${pupilLookY.toFixed(2)}px`);
  }

  function handlePointerTracking(event) {
    trackedPointer = {
      x: event.clientX,
      y: event.clientY
    };
    scheduleTopBunFaceTracking();
  }

  window.addEventListener("pointermove", handlePointerTracking);
  window.addEventListener("resize", scheduleTopBunFaceTracking);

  function attachDropEvents(targetEl, slotId, onDropActivity, visualContainer) {
    // Centralise les evenements drag and drop et le feedback visuel associe.
    targetEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      visualContainer.classList.add("drag-over");
    });

    targetEl.addEventListener("dragleave", () => {
      visualContainer.classList.remove("drag-over");
    });

    targetEl.addEventListener("drop", (e) => {
      e.preventDefault();
      visualContainer.classList.remove("drag-over");

      const payload = getCurrentDragPayload(e);
      currentDragPayload = null;
      if (!payload) return;

      onDropActivity(payload, slotId);
    });
  }

  function getCurrentDragPayload(event) {
    if (currentDragPayload) {
      return currentDragPayload;
    }

    const raw = event?.dataTransfer?.getData("text/plain");
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function playServeAnimation() {
    clearServeAnimation();

    const grid = els.agendaGrid;
    const topBun = grid.querySelector('[data-serve-piece="top-bun"]');
    const bottomBun = grid.querySelector('[data-serve-piece="bottom-bun"]');
    const ingredientCells = Array.from(grid.querySelectorAll(".content-cell"))
      .filter((cell) => !cell.classList.contains("free"))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    if (!topBun || !bottomBun) {
      return;
    }

    const pieces = [topBun, ...ingredientCells, bottomBun];
    serveOverlay = document.createElement("div");
    serveOverlay.className = "serve-overlay";
    document.body.appendChild(serveOverlay);

    const clones = pieces.map((piece) => {
      const rect = piece.getBoundingClientRect();
      const clone = piece.cloneNode(true);
      clone.classList.add("serve-piece");
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      serveOverlay.appendChild(clone);

      return {
        kind: piece.dataset.servePiece || "ingredient",
        node: clone,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };
    });

    grid.classList.add("is-serving");

    const bottomClone = clones[clones.length - 1];
    let nextTop = bottomClone.top;

    for (let index = clones.length - 2; index >= 0; index -= 1) {
      nextTop -= clones[index].height;
      clones[index].targetTop = nextTop;
    }

    bottomClone.targetTop = bottomClone.top;

    const assembleAnimations = clones.map((piece, index) => {
      const distance = (piece.targetTop ?? piece.top) - piece.top;
      const delay = Math.min(index * 70, 280);
      return piece.node.animate(
        [
          {
            transform: "translate3d(0, 0, 0)"
          },
          {
            transform: `translate3d(0, ${distance}px, 0)`
          }
        ],
        {
          duration: 520,
          delay,
          easing: "cubic-bezier(0.2, 0.9, 0.22, 1)",
          fill: "forwards"
        }
      ).finished;
    });

    await Promise.all(assembleAnimations);

    const stackLeft = Math.min(...clones.map((piece) => piece.left));
    const stackRight = Math.max(...clones.map((piece) => piece.left + piece.width));
    const exitDistance = window.innerWidth - stackLeft + (stackRight - stackLeft) + 80;

    await serveOverlay.animate(
      [
        {
          transform: "translate3d(0, 0, 0)"
        },
        {
          transform: `translate3d(${exitDistance}px, 0, 0)`
        }
      ],
      {
        duration: 700,
        easing: "cubic-bezier(0.25, 0.8, 0.25, 1)",
        fill: "forwards"
      }
    ).finished;
  }

  function clearServeAnimation() {
    els.agendaGrid.classList.remove("is-serving");

    if (serveOverlay) {
      serveOverlay.remove();
      serveOverlay = null;
    }
  }

  function triggerTopBunErrorReaction() {
    const topBun = els.agendaGrid.querySelector(".bun-character-top");
    if (!topBun) {
      return;
    }

    topBun.classList.remove("is-error-reacting");
    void topBun.offsetWidth;
    topBun.classList.add("is-error-reacting");

    if (topBunErrorReactionTimeout) {
      window.clearTimeout(topBunErrorReactionTimeout);
    }

    topBunErrorReactionTimeout = window.setTimeout(() => {
      topBun.classList.remove("is-error-reacting");
      topBunErrorReactionTimeout = null;
    }, 560);
  }

  function getTypeMeta(type) {
    // Metadonnees d'affichage associees a chaque type d'ingredient.
    switch (type) {
      case "chaud":
        return { label: "Chaud", icon: "🔥" };
      case "froid":
        return { label: "Froid", icon: "❄️" };
      case "fondant":
        return { label: "Fondant", icon: "🧀" };
      default:
        return { label: "Neutre", icon: "⚪" };
    }
  }

  function safeType(type) {
    // Garde uniquement les types connus pour eviter de casser les classes CSS.
    const allowed = ["chaud", "froid", "fondant", "neutre"];
    return allowed.includes(type) ? type : "neutre";
  }

  function formatPlacement(activity, { withLabel = true } = {}) {
    // Produit un texte lisible a partir des contraintes de placement d'un ingredient.
    const parts = [];

    if (activity.allowedPositions && activity.allowedPositions.length > 0) {
      parts.push(activity.allowedPositions.join(", "));
    }

    if (activity.allowedPositionSets && activity.allowedPositionSets.length > 0) {
      const groups = activity.allowedPositionSets
        .map((group) => `(${group.join(",")})`)
        .join(" ou ");
      parts.push(groups);
    }

    if (parts.length === 0) {
      return withLabel ? "Placement libre" : "Libre";
    }

    const content = parts.join(" · ");
    return withLabel ? `Placement : ${content}` : content;
  }

  function renderPlacementMarkers(duration) {
    // Genere un marqueur visuel par emplacement occupe.
    return Array.from({ length: duration }, () => '<span class="placement-marker"></span>').join("");
  }

  window.UI = {
    clearServeAnimation,
    playServeAnimation,
    setMessage,
    renderLevelMeta,
    renderActivities,
    renderAgenda,
    triggerTopBunErrorReaction
  };
})();
