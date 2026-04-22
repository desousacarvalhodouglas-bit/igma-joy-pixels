// ============================================================
// content.js — Extrai o project_id da URL lovable.dev/projects/{uuid}
// ============================================================
(function () {
  "use strict";

  const extractProjectId = (url) => {
    const match = url.match(/lovable\.dev\/projects\/([a-f0-9\-]{36})/i);
    return match ? match[1] : null;
  };

  const sendProjectId = () => {
    const projectId = extractProjectId(window.location.href);
    if (!projectId) return;
    try {
      chrome.runtime.sendMessage(
        { type: "PROJECT_ID_FOUND", projectId },
        () => {
          if (chrome.runtime.lastError) {
            /* silencia */
          }
        }
      );
    } catch (_) {}
  };

  sendProjectId();

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      sendProjectId();
    }
  });
  observer.observe(document, { subtree: true, childList: true });

  window.addEventListener("popstate", sendProjectId);
  window.addEventListener("hashchange", sendProjectId);
  setInterval(sendProjectId, 2000);
})();
