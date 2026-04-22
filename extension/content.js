// Content script: roda na página do app Lovable. Quando há uma mensagem
// pendente no storage da extensão e a URL contém ?debug=auto, dispara o
// CustomEvent("lovable-debug-error") que o app já escuta para abrir o overlay.
(async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") !== "auto") return;

    const { pendingDebugMessage, pendingAt } = await chrome.storage.local.get([
      "pendingDebugMessage",
      "pendingAt",
    ]);

    if (!pendingDebugMessage) return;
    // Expira em 2 minutos
    if (pendingAt && Date.now() - pendingAt > 120000) {
      await chrome.storage.local.remove(["pendingDebugMessage", "pendingAt"]);
      return;
    }

    // Aguarda o app carregar
    const fire = () => {
      window.dispatchEvent(
        new CustomEvent("lovable-debug-error", { detail: pendingDebugMessage })
      );
      chrome.storage.local.remove(["pendingDebugMessage", "pendingAt"]);
    };

    if (document.readyState === "complete") {
      setTimeout(fire, 800);
    } else {
      window.addEventListener("load", () => setTimeout(fire, 800), { once: true });
    }
  } catch (e) {
    console.warn("[Lovable Debug Tool] content script error:", e);
  }
})();
