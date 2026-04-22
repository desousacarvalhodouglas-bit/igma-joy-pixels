// ============================================================
// background.js — Captura Bearer token da API Lovable
// ============================================================

// Intercepta requisições para capturar o Authorization Bearer
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!details.requestHeaders) return;

    for (const header of details.requestHeaders) {
      if (
        header.name.toLowerCase() === "authorization" &&
        header.value &&
        header.value.startsWith("Bearer ")
      ) {
        const token = header.value.replace("Bearer ", "").trim();
        chrome.storage.local.set({ bearerToken: token, bearerCapturedAt: Date.now() }, () => {
          chrome.runtime
            .sendMessage({ type: "TOKEN_CAPTURED", token })
            .catch(() => {});
        });
        break;
      }
    }
  },
  {
    urls: ["https://api.lovable.dev/*", "https://lovable.dev/*"],
  },
  ["requestHeaders"]
);

// Mensageria entre content / popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PROJECT_ID_FOUND") {
    chrome.storage.local.set(
      { projectId: message.projectId, projectIdCapturedAt: Date.now() },
      () => sendResponse({ success: true })
    );
    return true;
  }

  if (message.type === "GET_COLLECTED_DATA") {
    chrome.storage.local.get(
      ["bearerToken", "projectId", "bearerCapturedAt", "projectIdCapturedAt"],
      (data) => sendResponse(data)
    );
    return true;
  }

  if (message.type === "CLEAR_DATA") {
    chrome.storage.local.remove(
      ["bearerToken", "projectId", "bearerCapturedAt", "projectIdCapturedAt"],
      () => sendResponse({ success: true })
    );
    return true;
  }
});
