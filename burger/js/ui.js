(function () {
  // Couche d'affichage : transforme l'etat du jeu en DOM interactif.
  const SLOT_DEFS = window.SLOT_DEFS;

  const els = {
    levelTitle: document.getElementById("levelTitle"),
    levelDescription: document.getElementById("levelDescription"),
    rulesList: document.getElementById("rulesList"),
    activityPool: document.getElementById("activityPool"),
    agendaGrid: document.getElementById("agendaGrid"),
    messageBox: document.getElementById("messageBox"),
    introTitle: document.getElementById("introTitle"),
    introDescription: document.getElementById("introDescription"),
    introRulesList: document.getElementById("introRulesList")
  };

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

    const placeables = window.Engine.getAvailablePlaceables(level, state);

    placeables.forEach((activity) => {
      const logical = window.Engine.getLogicalActivityById(level, activity.logicalId);
      const isPlaced = Boolean(state.placed[activity.id]);
      const typeMeta = getTypeMeta(activity.type);
      const showRequirementBadge = !level.hideRequirementBadges;
      const showTypeHint = !(level.hideNeutralTypeHints && safeType(activity.type) === "neutre");
      const placementMarkers = renderPlacementMarkers(activity.duration);
      const requirementBadge = showRequirementBadge
        ? `<span class="badge ${activity.required ? "required" : "optional"} small">
            ${activity.required ? "Obligatoire" : "Optionnel"}
          </span>`
        : "";
      const typeHint = showTypeHint
        ? `<span class="activity-type-icon">${typeMeta.icon}</span>`
        : "";

      const chip = document.createElement("div");
      chip.className = `activity-chip type-${safeType(activity.type)}`;
      chip.draggable = !isPlaced;
      chip.dataset.activityId = activity.id;
      chip.style.background = activity.color;

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

        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify({
            source: "pool",
            activityId: activity.id
          })
        );
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
      const showRequirementBadge = !level.hideRequirementBadges;
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
        ? `<div class="placed-subtitle">${activity.required ? "Obligatoire" : "Optionnel"}</div>`
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
        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify({
            source: "placed",
            activityId: activity.id
          })
        );
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

    const img = document.createElement("img");
    img.src = imagePath;
    img.alt = "";
    img.className = "bun-img";
    img.draggable = false;

    imageCell.appendChild(img);

    els.agendaGrid.appendChild(leftCell);
    els.agendaGrid.appendChild(imageCell);
  }

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

      const raw = e.dataTransfer.getData("text/plain");
      if (!raw) return;

      let payload = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }

      onDropActivity(payload, slotId);
    });
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
    setMessage,
    renderLevelMeta,
    renderActivities,
    renderAgenda
  };
})();
