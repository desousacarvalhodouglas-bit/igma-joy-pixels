// Content script: lê a mensagem pendente e a injeta no contexto principal
// da página somente quando o app React já declarou que o listener do debug
// está pronto. Isso evita o race condition que fazia o comando se perder.
(async () => {
  const READY_EVENT = "lovable-debug-ready";
  const CONSUMED_EVENT = "lovable-debug-consumed";
  const ERROR_EVENT = "lovable-debug-error";
  const READY_FLAG = "__LOVABLE_DEBUG_READY__";
  const FIRED_FLAG = "__LOVABLE_DEBUG_AUTOFIRED__";

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") !== "auto") return;

    const { pendingDebugMessage, pendingAt } = await chrome.storage.local.get([
      "pendingDebugMessage",
      "pendingAt",
    ]);

    if (!pendingDebugMessage) return;
    if (pendingAt && Date.now() - pendingAt > 120000) {
      await chrome.storage.local.remove(["pendingDebugMessage", "pendingAt"]);
      return;
    }

    let consumed = false;
    let pollId = null;

    const cleanup = () => {
      window.removeEventListener(READY_EVENT, handleReady);
      window.removeEventListener(CONSUMED_EVENT, handleConsumed);
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    const handleConsumed = async () => {
      if (consumed) return;
      consumed = true;
      cleanup();
      await chrome.storage.local.remove(["pendingDebugMessage", "pendingAt"]);
    };

    const inject = (code) => {
      const script = document.createElement("script");
      script.textContent = code;
      (document.documentElement || document.head || document.body).appendChild(script);
      script.remove();
    };

    const tryDispatch = () => {
      if (consumed) return;

      inject(`
        (() => {
          if (!window.${READY_FLAG} || window.${FIRED_FLAG}) return;
          window.${FIRED_FLAG} = true;
          window.dispatchEvent(new CustomEvent(${JSON.stringify(ERROR_EVENT)}, {
            detail: ${JSON.stringify(pendingDebugMessage)}
          }));
          window.dispatchEvent(new CustomEvent(${JSON.stringify(CONSUMED_EVENT)}));
        })();
      `);
    };

    const handleReady = () => {
      setTimeout(tryDispatch, 150);
    };

    window.addEventListener(READY_EVENT, handleReady);
    window.addEventListener(CONSUMED_EVENT, handleConsumed);

    const start = () => {
      handleReady();

      let attempts = 0;
      pollId = window.setInterval(() => {
        attempts += 1;
        tryDispatch();

        if (consumed || attempts >= 20) {
          cleanup();
        }
      }, 500);
    };

    if (document.readyState === "complete") {
      setTimeout(start, 250);
    } else {
      window.addEventListener("load", () => setTimeout(start, 250), { once: true });
    }
  } catch (e) {
    console.warn("[Lovable Debug Tool] content script error:", e);
  }
})();
