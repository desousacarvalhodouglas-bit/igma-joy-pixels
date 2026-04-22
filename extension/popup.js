// ============================================================
// popup.js — v4.2.0
// Mesma forma de conexão do "2_frontend":
//   - captura project_id de lovable.dev/projects/{uuid}
//   - captura Bearer token de api.lovable.dev
//   - envia para o proxy PHP: cxpayments.sbs/api.php?action=send_message
//     com payload { key, project_id, bearer, message, images: [base64] }
// ============================================================

const PHP_ENDPOINT = "https://cxpayments.sbs/api.php";
const SESSION_KEY_STORAGE = "userSessionKey";

const $ = (id) => document.getElementById(id);
const promptInput = $("prompt");
const filesInput = $("files");
const thumbs = $("thumbs");
const sendBtn = $("send");
const refreshBtn = $("refresh");
const clearBtn = $("clear");
const statusEl = $("status");
const sessionKeyInput = $("sessionKey");
const saveSessionKeyBtn = $("saveSessionKey");
const readyDot = $("readyDot");
const readyText = $("readyText");
const projectIdValue = $("projectIdValue");
const tokenValue = $("tokenValue");

let attached = [];
let collected = { projectId: null, bearerToken: null };

// ---------- UI helpers ----------

const setStatus = (msg, kind = "info") => {
  statusEl.innerHTML = msg ? `<div class="status ${kind}">${msg}</div>` : "";
};

const mask = (token) =>
  token ? `${token.slice(0, 12)}…${token.slice(-8)} (${token.length} chars)` : "";

const setReadiness = () => {
  if (collected.projectId && collected.bearerToken) {
    readyDot.className = "dot ok";
    readyText.textContent = "Pronto para enviar!";
  } else if (!collected.projectId && !collected.bearerToken) {
    readyDot.className = "dot";
    readyText.textContent = "Aguardando project_id e token...";
  } else if (!collected.projectId) {
    readyDot.className = "dot warn";
    readyText.textContent = "Falta project_id (abra um projeto em lovable.dev)";
  } else {
    readyDot.className = "dot warn";
    readyText.textContent = "Falta token (interaja com o chat da Lovable)";
  }

  if (collected.projectId) {
    projectIdValue.textContent = collected.projectId;
    projectIdValue.classList.remove("empty");
  } else {
    projectIdValue.textContent = "— não detectado —";
    projectIdValue.classList.add("empty");
  }

  if (collected.bearerToken) {
    tokenValue.textContent = mask(collected.bearerToken);
    tokenValue.classList.remove("empty");
  } else {
    tokenValue.textContent = "— não capturado —";
    tokenValue.classList.add("empty");
  }
};

// ---------- Image attach ----------

const renderThumbs = () => {
  thumbs.innerHTML = "";
  attached.forEach((img, i) => {
    const url = URL.createObjectURL(img.file);
    const div = document.createElement("div");
    div.className = "thumb";
    div.innerHTML = `<img src="${url}" alt="${img.name}" /><button data-i="${i}">×</button>`;
    div.querySelector("button").addEventListener("click", () => {
      attached.splice(i, 1);
      renderThumbs();
    });
    thumbs.appendChild(div);
  });
};

filesInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []).filter((f) =>
    f.type.startsWith("image/")
  );
  files.forEach((f) =>
    attached.push({ name: f.name, type: f.type, file: f })
  );
  filesInput.value = "";
  renderThumbs();
});

// ---------- Collected data ----------

const extractProjectIdFromUrl = (url) => {
  if (!url) return null;
  const m = url.match(/lovable\.dev\/projects\/([a-f0-9\-]{36})/i);
  return m ? m[1] : null;
};

// Procura abas abertas em lovable.dev/projects/{uuid} e retorna o id
const detectProjectIdFromTabs = () =>
  new Promise((resolve) => {
    chrome.tabs.query({ url: "https://lovable.dev/*" }, (tabs) => {
      if (chrome.runtime.lastError || !tabs?.length) return resolve(null);
      tabs.sort((a, b) => Number(b.active) - Number(a.active));
      for (const t of tabs) {
        const id = extractProjectIdFromUrl(t.url);
        if (id) return resolve(id);
      }
      resolve(null);
    });
  });

const loadCollected = () =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_COLLECTED_DATA" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        resolve({});
        return;
      }
      resolve(res);
    });
  });

const refreshCollected = async () => {
  const data = await loadCollected();
  collected.bearerToken = data.bearerToken || null;

  // 1) Usa o que o content script já gravou
  let pid = data.projectId || null;

  // 2) Fallback: detecta direto pelas abas abertas no lovable.dev
  if (!pid) {
    pid = await detectProjectIdFromTabs();
    if (pid) {
      try {
        chrome.runtime.sendMessage({ type: "PROJECT_ID_FOUND", projectId: pid });
      } catch (_) {}
    }
  }

  collected.projectId = pid;
  setReadiness();
};

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "TOKEN_CAPTURED") {
    collected.bearerToken = message.token;
    setReadiness();
  }
  if (message?.type === "PROJECT_ID_FOUND") {
    collected.projectId = message.projectId;
    setReadiness();
  }
});

// ---------- File → base64 ----------

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ---------- Session key (validada pelo proxy PHP) ----------

const getSessionKey = () =>
  new Promise((resolve) =>
    chrome.storage.local.get([SESSION_KEY_STORAGE], (d) =>
      resolve(d[SESSION_KEY_STORAGE] || "")
    )
  );

const setSessionKey = (key) =>
  chrome.storage.local.set({ [SESSION_KEY_STORAGE]: key });

saveSessionKeyBtn?.addEventListener("click", async () => {
  const key = sessionKeyInput.value.trim();
  if (!key) {
    setStatus("Informe a chave de sessão.", "error");
    return;
  }
  await setSessionKey(key);
  setStatus("✓ Chave salva.", "success");
});

// ---------- Send (via proxy PHP — mesma forma do 2_frontend) ----------

sendBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt && attached.length === 0) {
    setStatus("Escreva uma instrução ou anexe uma imagem.", "error");
    return;
  }
  if (!collected.projectId) {
    setStatus(
      "Project ID ainda não detectado. Abra lovable.dev/projects/{id} no navegador.",
      "error"
    );
    return;
  }
  if (!collected.bearerToken) {
    setStatus(
      "Token não capturado. Abra um projeto na lovable.dev e envie qualquer mensagem no chat para gerar o token.",
      "error"
    );
    return;
  }

  const sessionKey = (sessionKeyInput.value.trim() || (await getSessionKey())).trim();
  if (!sessionKey) {
    setStatus(
      "Informe a chave de sessão (campo abaixo) e clique em '💾 Salvar chave'.",
      "error"
    );
    return;
  }

  sendBtn.disabled = true;
  setStatus("Enviando via proxy...", "info");

  try {
    const imagesBase64 = [];
    for (const img of attached) {
      const dataUrl = await fileToBase64(img.file);
      imagesBase64.push(dataUrl);
    }

    const res = await fetch(`${PHP_ENDPOINT}?action=send_message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: sessionKey,
        project_id: collected.projectId,
        bearer: collected.bearerToken,
        message: prompt,
        images: imagesBase64,
      }),
    });

    let result = null;
    try { result = await res.json(); } catch (_) {}

    if (res.ok && result?.success) {
      setStatus("✓ Mensagem enviada para a Lovable!", "success");
      promptInput.value = "";
      attached = [];
      renderThumbs();
    } else {
      const reason = result?.reason ? ` (${result.reason})` : "";
      const msg = result?.message || result?.error || `HTTP ${res.status}`;
      throw new Error(`${msg}${reason}`);
    }
  } catch (err) {
    setStatus(`Erro: ${err.message}`, "error");
  } finally {
    sendBtn.disabled = false;
  }
});

refreshBtn.addEventListener("click", () => {
  refreshCollected();
  setStatus("Dados recarregados.", "info");
});

clearBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_DATA" }, () => {
    collected = { projectId: null, bearerToken: null };
    setReadiness();
    setStatus("Captura limpa.", "info");
  });
});

// ---------- Init ----------

(async () => {
  const k = await getSessionKey();
  if (k && sessionKeyInput) sessionKeyInput.value = k;
})();
refreshCollected();
