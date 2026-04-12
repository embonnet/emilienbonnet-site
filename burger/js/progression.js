(function () {
  // Persistance minimale de la progression des niveaux.
  function createProgressionStore({ storageKey, levels }) {
    let completedLevels = loadCompletedLevels();

    function getLevelIds() {
      return Object.keys(levels).map(Number).sort((a, b) => a - b);
    }

    function loadCompletedLevels() {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
          .map(Number)
          .filter((value) => Number.isInteger(value) && levels[value])
          .sort((a, b) => a - b);
      } catch {
        return [];
      }
    }

    function saveCompletedLevels() {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(completedLevels));
      } catch {}
    }

    return {
      getCompletedLevels() {
        return completedLevels.slice();
      },

      isCompleted(levelId) {
        return completedLevels.includes(levelId);
      },

      markCompleted(levelId) {
        if (completedLevels.includes(levelId)) {
          return false;
        }

        completedLevels = completedLevels.concat(levelId).sort((a, b) => a - b);
        saveCompletedLevels();
        return true;
      },

      reset() {
        completedLevels = [];

        try {
          window.localStorage.removeItem(storageKey);
        } catch {}
      },

      areAllCompleted() {
        return getLevelIds().every((id) => completedLevels.includes(id));
      },

      getLevelIds
    };
  }

  window.ProgressionStore = {
    createProgressionStore
  };
})();
