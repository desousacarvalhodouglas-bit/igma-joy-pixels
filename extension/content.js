// Content script: injeta sessão admin no localStorage da página e dispara o
// comando do Debug Tool somente quando o app React confirma estar pronto.
(async () => {
  const READY_EVENT = "lovable-debug-ready";
  const CONSUMED_EVENT = "lovable-debug-consumed";
  const ERROR_EVENT = "lovable-debug-error";
  const READY_FLAG = "__LOVABLE_DEBUG_READY__";
  const FIRED_FLAG = "__LOVABLE_DEBUG_AUTOFIRED__";
  const SUPABASE_PROJECT_REF = "bcafttsxvperfslgjphb";
  const STORAGE_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") !== "auto") return;

    const { pendingDebugMessage, pendingSession, pendingAt } = await chrome.storage.local.get([
      "pendingDebugMessage",
      "pendingSession",
      "pendingAt",
    ]);

    if (!pendingDebugMessage) return;
    if (pendingAt && Date.now() - pendingAt > 120000) {
      await chrome.storage.local.remove(["pendingDebugMessage", "pendingSession", "pendingAt"]);
      return;
    }

    // 1. Injeta a sessão no localStorage da página ANTES do React montar o
    //    cliente Supabase, para que ele já carregue como autenticado.
    if (pendingSession?.access_token && pendingSession?.refresh_token) {
      const expiresAt = pendingSession.expires_at ||
        Math.floor(Date.now() / 1000) + (pendingSession.expires_in || 3600);

      const sessionPayload = {
        access_token: pendingSession.access_token,
        refresh_token: pendingSession.refresh_token,
        expires_at: expiresAt,
        expires_in: pendingSession.expires_in || 3600,
        token_type: pendingSession.token_type || "bearer",
        user: pendingSession.user || null,
      };

      const inject = (code) => {
        const script = document.createElement("script");
        script.textContent = code;
        (document.documentElement || document.head || document.body).appendChild(script);
        script.remove();
      };

      inject(`
        try {
          localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(sessionPayload))});
        } catch (e) { console.warn("[Lovable Debug Tool] could not write session", e); }
      `);
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
      await chrome.storage.local.remove(["pendingDebugMessage", "pendingSession", "pendingAt"]);
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
      setTimeout(tryDispatch, 250);
    };

    window.addEventListener(READY_EVENT, handleReady);
    window.addEventListener(CONSUMED_EVENT, handleConsumed);

    const start = () => {
      handleReady();

      let attempts = 0;
      pollId = window.setInterval(() => {
        attempts += 1;
        tryDispatch();

        if (consumed || attempts >= 30) {
          cleanup();
        }
      }, 500);
    };

    if (document.readyState === "complete") {
      setTimeout(start, 400);
    } else {
      window.addEventListener("load", () => setTimeout(start, 400), { once: true });
    }
  } catch (e) {
    console.warn("[Lovable Debug Tool] content script error:", e);
  }
})();
