(function () {
  // Helpers legers pour manipuler les modales de facon uniforme.
  function createModalController(modalId) {
    const modal = document.getElementById(modalId);

    if (!modal) {
      throw new Error(`Modal introuvable : ${modalId}`);
    }

    function open() {
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
    }

    function close() {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }

    function isOpen() {
      return !modal.classList.contains("hidden");
    }

    return {
      modal,
      open,
      close,
      isOpen,
      backdrop: modal.querySelector(".overlay-backdrop")
    };
  }

  window.Modals = {
    createModalController
  };
})();
