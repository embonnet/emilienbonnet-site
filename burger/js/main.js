(function () {
  // Point d'orchestration principal : lie moteur, affichage, audio, modales et progression.
  const LEVELS = window.LEVELS;
  const Engine = window.Engine;
  const UI = window.UI;
  const { SoundManager } = window;
  const { createProgressionStore } = window.ProgressionStore;
  const { createModalController } = window.Modals;

  const COMPLETED_LEVELS_STORAGE_KEY = "custom-burger.completed-levels";

  const dom = {
    body: document.body,
    topbar: document.querySelector(".topbar"),
    settingsBtn: document.getElementById("settingsBtn"),
    levelsBtn: document.getElementById("levelsBtn"),
    headerToggleBtn: document.getElementById("headerToggleBtn"),
    resetBtn: document.getElementById("resetBtn"),
    validateBtn: document.getElementById("validateBtn"),
    bgm: document.getElementById("bgm"),
    settingsAudioBtn: document.getElementById("settingsAudioBtn"),
    creditsBtn: document.getElementById("creditsBtn"),
    victoryTitle: document.getElementById("victoryTitle"),
    victoryText: document.getElementById("victoryText"),
    victoryNextBtn: document.getElementById("victoryNextBtn"),
    failureList: document.getElementById("failureList"),
    appIntroImage: document.getElementById("appIntroImage"),
    appIntroPrompt: document.getElementById("appIntroPrompt"),
    appIntroPromptActions: document.getElementById("appIntroPromptActions"),
    appIntroPromptBtn: document.getElementById("appIntroPromptBtn"),
    appIntroSpeech: document.getElementById("appIntroSpeech"),
    appIntroSpeechActions: document.getElementById("appIntroSpeechActions"),
    appIntroEnterBtn: document.getElementById("appIntroEnterBtn"),
    appIntroTextEls: Array.from(document.querySelectorAll("#appIntroSpeech .app-intro-text")),
    completionIntroImage: document.getElementById("completionIntroImage"),
    completionIntroSpeech: document.getElementById("completionIntroSpeech"),
    completionIntroActions: document.getElementById("completionIntroActions"),
    completionIntroBtn: document.getElementById("completionIntroBtn"),
    completionIntroTextEls: Array.from(document.querySelectorAll("#completionIntroSpeech .app-intro-text")),
    introStartBtn: document.getElementById("introStartBtn"),
    levelsList: document.getElementById("levelsList"),
    resetLevelsBtn: document.getElementById("resetLevelsBtn"),
    closeButtons: {
      appIntro: document.getElementById("appIntroCloseBtn"),
      completionIntro: document.getElementById("completionIntroCloseBtn"),
      victory: document.getElementById("victoryCloseBtn"),
      failure: document.getElementById("failureCloseBtn"),
      intro: document.getElementById("introCloseBtn"),
      settings: document.getElementById("settingsCloseBtn"),
      credits: document.getElementById("creditsCloseBtn"),
      levels: document.getElementById("levelsCloseBtn"),
      completion: document.getElementById("completionCloseBtn")
    }
  };

  const modals = {
    appIntro: createModalController("appIntroModal"),
    completionIntro: createModalController("completionIntroModal"),
    victory: createModalController("victoryModal"),
    failure: createModalController("failureModal"),
    intro: createModalController("levelIntroModal"),
    settings: createModalController("settingsModal"),
    credits: createModalController("creditsModal"),
    levels: createModalController("levelsModal"),
    completion: createModalController("completionModal")
  };

  const progression = createProgressionStore({
    storageKey: COMPLETED_LEVELS_STORAGE_KEY,
    levels: LEVELS
  });

  const sound = new SoundManager({
    bgmElement: dom.bgm,
    successPath: "./audio/success.mp3",
    resetPath: "./audio/cat.mp3",
    emptyResetPath: "./audio/cat-empty.mp3",
    doorPath: "./audio/door.mp3",
    ringPath: "./audio/ring.mp3",
    errorPath: "./audio/error.mp3"
  });

  let currentLevel = LEVELS[1];
  let state = Engine.createEmptyState(currentLevel);
  let isServingAnimationRunning = false;
  let appIntroStage = "prompt";

  const speechScenes = {
    appIntro: {
      modal: modals.appIntro,
      imageEl: dom.appIntroImage,
      textEls: dom.appIntroTextEls,
      actionsEl: dom.appIntroSpeechActions,
      state: {
        timer: null,
        isAnimating: false,
        isFullyRevealed: false
      },
      resetLayout() {
        appIntroStage = "prompt";
        dom.appIntroPrompt.classList.remove("hidden");
        dom.appIntroPromptActions.classList.remove("hidden");
        dom.appIntroSpeech.classList.add("hidden");
        dom.appIntroSpeechActions.classList.add("hidden");
      },
      prepareLayout() {
        appIntroStage = "speech";
        dom.appIntroPrompt.classList.add("hidden");
        dom.appIntroPromptActions.classList.add("hidden");
        dom.appIntroSpeech.classList.remove("hidden");
        dom.appIntroSpeechActions.classList.add("hidden");
      }
    },
    completionIntro: {
      modal: modals.completionIntro,
      imageEl: dom.completionIntroImage,
      textEls: dom.completionIntroTextEls,
      actionsEl: dom.completionIntroActions,
      state: {
        timer: null,
        isAnimating: false,
        isFullyRevealed: false
      },
      resetLayout() {
        dom.completionIntroActions.classList.add("hidden");
      },
      prepareLayout() {
        dom.completionIntroActions.classList.add("hidden");
      }
    }
  };

  function boot() {
    sound.init();
    bindEvents();
    renderAll();
    refreshLevelsUI();
    syncAudioButtons();

    if (progression.getCompletedLevels().length > 0) {
      modals.intro.open();
      return;
    }

    openAppIntroModal();
  }

  function bindEvents() {
    dom.settingsBtn.addEventListener("click", openSettingsFlow);
    dom.levelsBtn.addEventListener("click", openLevelsFlow);
    dom.headerToggleBtn.addEventListener("click", toggleHeaderCompactMode);
    dom.resetBtn.addEventListener("click", handleResetBoard);
    dom.validateBtn.addEventListener("click", handleValidateBoard);
    dom.settingsAudioBtn.addEventListener("click", handleAudioToggle);
    dom.creditsBtn.addEventListener("click", openCreditsFlow);
    dom.victoryNextBtn.addEventListener("click", handleVictoryNext);
    dom.appIntroPromptBtn.addEventListener("click", handleAppIntroPromptContinue);
    dom.appIntroEnterBtn.addEventListener("click", handleEnterKitchen);
    dom.completionIntroBtn.addEventListener("click", handleCompletionIntroContinue);
    dom.introStartBtn.addEventListener("click", () => modals.intro.close());
    dom.resetLevelsBtn.addEventListener("click", handleResetCompletedLevels);

    document.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    document.addEventListener("keydown", handleFirstInteraction, { once: true });
    document.addEventListener("click", handleGlobalButtonClick);

    dom.closeButtons.appIntro.addEventListener("click", handleCloseAppIntroModal);
    dom.closeButtons.completionIntro.addEventListener("click", handleCloseCompletionIntroModal);
    dom.closeButtons.victory.addEventListener("click", handleCloseVictoryModal);
    dom.closeButtons.failure.addEventListener("click", handleCloseFailureModal);
    dom.closeButtons.intro.addEventListener("click", () => modals.intro.close());
    dom.closeButtons.settings.addEventListener("click", () => modals.settings.close());
    dom.closeButtons.credits.addEventListener("click", () => modals.credits.close());
    dom.closeButtons.levels.addEventListener("click", () => modals.levels.close());
    dom.closeButtons.completion.addEventListener("click", handleCloseCompletionModal);

    modals.appIntro.backdrop.addEventListener("click", handleCloseAppIntroModal);
    modals.completionIntro.backdrop.addEventListener("click", handleCloseCompletionIntroModal);
    modals.victory.backdrop.addEventListener("click", handleCloseVictoryModal);
    modals.failure.backdrop.addEventListener("click", handleCloseFailureModal);
    modals.intro.backdrop.addEventListener("click", () => modals.intro.close());
    modals.settings.backdrop.addEventListener("click", () => modals.settings.close());
    modals.credits.backdrop.addEventListener("click", () => modals.credits.close());
    modals.levels.backdrop.addEventListener("click", () => modals.levels.close());
    modals.completion.backdrop.addEventListener("click", handleCloseCompletionModal);
  }

  async function handleFirstInteraction() {
    await sound.unlockSfx();
    if (!modals.appIntro.isOpen()) {
      await sound.tryAutoStartMusic();
    }
    syncAudioButtons();
  }

  function handleGlobalButtonClick(event) {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (!button || button.disabled || button.dataset.hasOwnSound === "true") {
      return;
    }

    sound.playUiClick();
  }

  function getSpeechScene(sceneKey) {
    return speechScenes[sceneKey];
  }

  function buildSpeechWordSpans(element) {
    const words = (element.dataset.fullText || "").split(/\s+/).filter(Boolean);

    element.innerHTML = "";
    words.forEach((word, index) => {
      const span = document.createElement("span");
      span.className = "app-intro-word";
      span.textContent = index < words.length - 1 ? `${word} ` : word;
      element.appendChild(span);
    });

    return Array.from(element.querySelectorAll(".app-intro-word"));
  }

  function revealSpeechWords(wordGroups) {
    wordGroups.forEach((group) => {
      group.forEach((wordEl) => {
        wordEl.classList.add("is-visible");
      });
    });
  }

  function resetSpeechScene(sceneKey) {
    const scene = getSpeechScene(sceneKey);

    clearTimeout(scene.state.timer);
    scene.state.timer = null;
    scene.state.isAnimating = false;
    scene.state.isFullyRevealed = false;
    scene.imageEl.classList.remove("is-visible");
    scene.resetLayout();
    scene.textEls.forEach((el) => {
      el.innerHTML = "";
    });
  }

  function finalizeSpeechScene(sceneKey) {
    const scene = getSpeechScene(sceneKey);

    clearTimeout(scene.state.timer);
    scene.state.timer = null;
    scene.state.isAnimating = false;
    scene.state.isFullyRevealed = true;
    scene.actionsEl.classList.remove("hidden");
  }

  function skipSpeechScene(sceneKey) {
    const scene = getSpeechScene(sceneKey);
    if (!scene.state.isAnimating) {
      return;
    }

    const wordGroups = scene.textEls.map((el) => Array.from(el.querySelectorAll(".app-intro-word")));
    revealSpeechWords(wordGroups);
    finalizeSpeechScene(sceneKey);
  }

  function animateSpeechScene(sceneKey) {
    const scene = getSpeechScene(sceneKey);

    clearTimeout(scene.state.timer);
    scene.state.timer = null;
    scene.state.isAnimating = true;
    scene.state.isFullyRevealed = false;
    scene.prepareLayout();

    const segments = scene.textEls.map((el) => ({
      words: buildSpeechWordSpans(el),
      index: 0
    }));

    window.requestAnimationFrame(() => {
      scene.imageEl.classList.add("is-visible");
    });

    function step() {
      const currentSegment = segments.find((segment) => segment.index < segment.words.length);

      if (!currentSegment) {
        finalizeSpeechScene(sceneKey);
        return;
      }

      const nextWord = currentSegment.words[currentSegment.index];
      nextWord.classList.add("is-visible");
      currentSegment.index += 1;

      sound.playSpeechBlip({
        punctuation: /[.,!?;:»…]$/.test(nextWord.textContent || "")
      });

      scene.state.timer = setTimeout(step, 34);
    }

    scene.state.timer = setTimeout(step, 150);
  }

  async function transitionBetweenModals(fromController, toController, afterTransition) {
    const transitionMs = 220;
    const fromModalEl = fromController.modal;
    const toModalEl = toController.modal;

    toController.open();
    toModalEl.classList.add("modal-seamless-enter");
    fromModalEl.classList.add("modal-seamless-exit");

    await new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        toModalEl.classList.add("is-transition-visible");
        fromModalEl.classList.add("is-transition-hidden");
        window.setTimeout(resolve, transitionMs);
      });
    });

    fromController.close();
    if (typeof afterTransition === "function") {
      afterTransition();
    }

    toModalEl.classList.remove("modal-seamless-enter", "is-transition-visible");
    fromModalEl.classList.remove("modal-seamless-exit", "is-transition-hidden");
  }

  function openAppIntroModal() {
    modals.appIntro.open();
    resetSpeechScene("appIntro");
    window.requestAnimationFrame(() => {
      dom.appIntroImage.classList.add("is-visible");
    });
  }

  async function handleAppIntroPromptContinue() {
    await sound.unlockSfx();
    animateSpeechScene("appIntro");
  }

  async function handleEnterKitchen() {
    if (appIntroStage !== "speech" || getSpeechScene("appIntro").state.isAnimating) {
      return;
    }

    await sound.playDoor();
    await sound.setMusicTrack("./audio/theme.mp3", { forcePlay: true });
    syncAudioButtons();
    await transitionBetweenModals(modals.appIntro, modals.intro, () => {
      resetSpeechScene("appIntro");
    });
  }

  function openCompletionIntroModal() {
    modals.completionIntro.open();
    animateSpeechScene("completionIntro");
  }

  async function handleCompletionIntroContinue() {
    if (getSpeechScene("completionIntro").state.isAnimating) {
      skipSpeechScene("completionIntro");
      return;
    }

    sound.playPuzzleSuccess();
    await transitionBetweenModals(modals.completionIntro, modals.completion, () => {
      resetSpeechScene("completionIntro");
    });
    await sound.setMusicTrack("./audio/credit.mp3", { forcePlay: true });
    syncAudioButtons();
  }

  function openSettingsFlow() {
    closeSecondaryModals();
    syncAudioButtons();
    modals.settings.open();
  }

  function toggleHeaderCompactMode() {
    dom.body.classList.toggle("header-collapsed");
    const isCollapsed = dom.body.classList.contains("header-collapsed");

    dom.headerToggleBtn.setAttribute(
      "aria-label",
      isCollapsed ? "Afficher l'en-tête" : "Réduire ou afficher l'en-tête"
    );
    dom.headerToggleBtn.setAttribute(
      "title",
      isCollapsed ? "Afficher l'en-tête" : "Réduire ou afficher l'en-tête"
    );
  }

  function openLevelsFlow() {
    closeSecondaryModals();
    refreshLevelsUI();
    modals.levels.open();
  }

  function openCreditsFlow() {
    modals.settings.close();
    modals.credits.open();
  }

  async function handleResetBoard() {
    closeAllModals();
    const wasEmpty = Object.keys(state.placed).length === 0;
    state = Engine.createEmptyState(currentLevel);
    renderAll();
    UI.setMessage("Liste des ingrédients vide.", "neutral");
    await sound.unlockSfx();
    sound.playReset({ empty: wasEmpty });
  }

  async function handleValidateBoard() {
    if (isServingAnimationRunning) {
      return;
    }

    const result = Engine.validateState(currentLevel, state);

    if (!result.ok) {
      UI.setMessage(result.errors.join(" "), "error");
    }

    sound.playRing();
    isServingAnimationRunning = true;

    try {
      await UI.playServeAnimation();

      if (!result.ok) {
        openFailureModal(result.errors);
        return;
      }

      progression.markCompleted(currentLevel.id);
      refreshLevelsUI();
      UI.setMessage("Burger réussi. Cette organisation est valide.", "success");

      if (progression.areAllCompleted()) {
        await openCompletionModal();
        return;
      }

      openVictoryModal();
    } finally {
      isServingAnimationRunning = false;
    }
  }

  function renderAll() {
    UI.clearServeAnimation();
    UI.renderLevelMeta(currentLevel);
    UI.renderActivities(currentLevel, state, {
      onToggleSplit: handleToggleSplit
    });
    UI.renderAgenda(currentLevel, state, {
      onDropActivity: handleDropActivity,
      onRemoveActivity: handleRemoveActivity
    });
  }

  function refreshLevelsUI() {
    renderLevelsList();
  }

  function renderLevelsList() {
    const ids = progression.getLevelIds();
    dom.levelsList.innerHTML = "";

    ids.forEach((id) => {
      const level = LEVELS[id];
      const isActive = currentLevel.id === id;
      const isCompleted = progression.isCompleted(id);
      const button = document.createElement("button");

      button.type = "button";
      button.className = `level-option-btn${isActive ? " is-active" : ""}`;
      button.setAttribute("aria-current", isActive ? "true" : "false");
      button.innerHTML = `
        <span class="level-option-label">${level.title}</span>
        ${isCompleted ? '<span class="level-option-status" aria-hidden="true">✓</span>' : ""}
      `;

      button.addEventListener("click", () => {
        if (isActive) {
          modals.levels.close();
          return;
        }

        switchLevel(id);
      });

      dom.levelsList.appendChild(button);
    });
  }

  function openVictoryModal() {
    const nextLevelId = getNextLevelId(currentLevel.id);
    const isLastLevel = !nextLevelId;

    dom.victoryTitle.textContent = "Commande envoyée !";
    dom.victoryText.textContent = isLastLevel
      ? "Tu as terminé le dernier burger disponible de ce POC."
      : "Cette organisation respecte toutes les contraintes. Tu peux passer au niveau suivant.";
    dom.victoryNextBtn.textContent = isLastLevel ? "Fermer" : "Niveau suivant";

    sound.playPuzzleSuccess();
    modals.victory.open();
  }

  function handleCloseAppIntroModal() {
    if (appIntroStage === "speech" && getSpeechScene("appIntro").state.isAnimating) {
      skipSpeechScene("appIntro");
      return;
    }

    modals.appIntro.close();
    resetSpeechScene("appIntro");
    modals.intro.open();
  }

  function openFailureModal(errors) {
    closeSecondaryModals();
    modals.intro.close();
    modals.victory.close();
    dom.failureList.innerHTML = "";

    errors.forEach((error) => {
      const li = document.createElement("li");
      li.textContent = error;
      dom.failureList.appendChild(li);
    });

    sound.playValidationError();
    modals.failure.open();
  }

  async function openCompletionModal() {
    closeSecondaryModals();
    modals.intro.close();
    modals.victory.close();
    openCompletionIntroModal();
  }

  async function handleCloseCompletionModal() {
    modals.completion.close();
    UI.clearServeAnimation();
    await sound.transitionToDefaultMusic();
    syncAudioButtons();
  }

  async function handleCloseCompletionIntroModal() {
    if (getSpeechScene("completionIntro").state.isAnimating) {
      skipSpeechScene("completionIntro");
      return;
    }

    sound.playPuzzleSuccess();
    await transitionBetweenModals(modals.completionIntro, modals.completion, () => {
      resetSpeechScene("completionIntro");
    });
    await sound.setMusicTrack("./audio/credit.mp3", { forcePlay: true });
    syncAudioButtons();
  }

  function handleCloseVictoryModal() {
    modals.victory.close();
    UI.clearServeAnimation();
  }

  function handleCloseFailureModal() {
    modals.failure.close();
    UI.clearServeAnimation();
  }

  function handleVictoryNext() {
    const nextLevelId = getNextLevelId(currentLevel.id);

    if (!nextLevelId) {
      handleCloseVictoryModal();
      return;
    }

    switchLevel(nextLevelId);
  }

  function switchLevel(levelId) {
    currentLevel = LEVELS[levelId];
    state = Engine.createEmptyState(currentLevel);
    closeAllModals();
    sound.restoreDefaultMusic();
    syncAudioButtons();
    renderAll();
    refreshLevelsUI();
    UI.setMessage(`Chargement du ${currentLevel.title}.`, "neutral");
    modals.intro.open();
  }

  function closeSecondaryModals() {
    resetSpeechScene("appIntro");
    resetSpeechScene("completionIntro");
    modals.appIntro.close();
    modals.completionIntro.close();
    modals.settings.close();
    modals.credits.close();
    modals.levels.close();
  }

  function closeAllModals() {
    resetSpeechScene("appIntro");
    resetSpeechScene("completionIntro");
    Object.values(modals).forEach((controller) => controller.close());
  }

  function getNextLevelId(levelId) {
    const ids = progression.getLevelIds();
    const index = ids.indexOf(levelId);

    if (index === -1 || index === ids.length - 1) {
      return null;
    }

    return ids[index + 1];
  }

  async function handleAudioToggle() {
    const result = await sound.toggleMusic();

    if (!result.ok) {
      UI.setMessage("Le navigateur a bloqué la lecture audio.", "error");
      await sound.playDropError();
      return;
    }

    syncAudioButtons();
    UI.setMessage(result.playing ? "Musique lancée." : "Musique en pause.", "neutral");
  }

  function syncAudioButtons() {
    sound.updateMusicButton(dom.settingsAudioBtn);
  }

  function handleResetCompletedLevels() {
    progression.reset();
    modals.completion.close();
    sound.restoreDefaultMusic();
    syncAudioButtons();
    refreshLevelsUI();
    UI.setMessage("Progression des niveaux réinitialisée.", "neutral");
  }

  async function handleToggleSplit(activityId) {
    const result = Engine.toggleSplit(currentLevel, state, activityId);

    if (!result.ok) {
      UI.setMessage(result.reason, "error");
      await sound.playDropError();
      return;
    }

    renderAll();
    UI.setMessage("Mode de découpage mis à jour.", "neutral");
    await sound.playDropSuccess();
  }

  function tryReplacePlacedActivityWithPoolActivity(activityId, slotId) {
    const targetActivityId = Engine.getAssignedActivityIdAtSlot(state, slotId);

    if (!targetActivityId) {
      return Engine.placeActivity(currentLevel, state, activityId, slotId);
    }

    const targetPlaced = state.placed[targetActivityId];
    if (!targetPlaced) {
      return { ok: false, reason: "Ingrédient cible introuvable." };
    }

    const targetStartSlotId = targetPlaced.startSlotId;

    Engine.removeActivity(currentLevel, state, targetActivityId, { compact: false });

    const replaceResult = Engine.placeActivity(currentLevel, state, activityId, slotId);
    if (replaceResult.ok) {
      return {
        ok: true,
        replaced: true,
        removedActivityId: targetActivityId
      };
    }

    const restoreResult = Engine.placeActivity(
      currentLevel,
      state,
      targetActivityId,
      targetStartSlotId
    );

    if (!restoreResult.ok) {
      return {
        ok: false,
        reason: "Le remplacement a échoué et l'état précédent n'a pas pu être restauré proprement."
      };
    }

    return replaceResult;
  }

  async function handleDropActivity(payload, slotId) {
    if (!payload || !payload.activityId) return;

    if (payload.source === "placed") {
      await handlePlacedActivityDrop(payload, slotId);
      return;
    }

    const placeResult = tryReplacePlacedActivityWithPoolActivity(payload.activityId, slotId);

    if (!placeResult.ok) {
      UI.setMessage(placeResult.reason, "error");
      await sound.playDropError();
      return;
    }

    renderAll();
    UI.setMessage(placeResult.replaced ? "Ingrédient remplacé." : "Activité placée.", "neutral");
    await sound.playDropSuccess();
  }

  async function handlePlacedActivityDrop(payload, slotId) {
    const targetActivityId = Engine.getAssignedActivityIdAtSlot(state, slotId);

    if (targetActivityId && targetActivityId !== payload.activityId) {
      const swapResult = Engine.swapPlacedActivities(
        currentLevel,
        state,
        payload.activityId,
        targetActivityId
      );

      if (!swapResult.ok) {
        UI.setMessage(swapResult.reason, "error");
        await sound.playDropError();
        return;
      }

      renderAll();
      UI.setMessage("Activités interchangées.", "neutral");
      await sound.playDropSuccess();
      return;
    }

    const moveResult = Engine.movePlacedActivity(currentLevel, state, payload.activityId, slotId);

    if (!moveResult.ok) {
      UI.setMessage(moveResult.reason, "error");
      await sound.playDropError();
      return;
    }

    renderAll();
    UI.setMessage("Activité déplacée.", "neutral");
    await sound.playDropSuccess();
  }

  async function handleRemoveActivity(activityId) {
    Engine.removeActivity(currentLevel, state, activityId);
    renderAll();
    UI.setMessage("Activité retirée.", "neutral");
    await sound.playDropError();
  }

  boot();
})();
