// ============================================================
// popup.js — v5.0.0
// Envia via Edge Function própria (sem chave de sessão externa).
// Endpoint: <SUPABASE_URL>/functions/v1/lovable-proxy
// Payload: { project_id, bearer, message, images: [base64] }
// ============================================================

const SUPABASE_URL = "https://bcafttsxvperfslgjphb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYWZ0dHN4dnBlcmZzbGdqcGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzQwNTYsImV4cCI6MjA4MzU1MDA1Nn0.eaCDIVgdvm31TCK1qTnbdh-SNUw718UFAsGWd7ifvPc";
const PROXY_ENDPOINT = `${SUPABASE_URL}/functions/v1/lovable-proxy`;

const $ = (id) => document.getElementById(id);
const promptInput = $("prompt");
const filesInput = $("files");
const thumbs = $("thumbs");
const sendBtn = $("send");
const refreshBtn = $("refresh");
const clearBtn = $("clear");
const statusEl = $("status");
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

  let pid = data.projectId || null;
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

// ---------- Send (via Edge Function própria) ----------

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

  sendBtn.disabled = true;
  setStatus("Enviando...", "info");

  try {
    const imagesBase64 = [];
    for (const img of attached) {
      const dataUrl = await fileToBase64(img.file);
      imagesBase64.push(dataUrl);
    }

    const res = await fetch(PROXY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
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
      const detail = result?.details
        ? ` — ${typeof result.details === "string" ? result.details : JSON.stringify(result.details).slice(0, 200)}`
        : "";
      const msg = result?.error || `HTTP ${res.status}`;
      throw new Error(`${msg}${detail}`);
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
refreshCollected();
