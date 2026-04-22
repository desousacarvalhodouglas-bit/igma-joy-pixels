// ============================================================
// popup.js — v4.0.0
// Usa project_id + Bearer token capturados automaticamente da Lovable
// (mesma estratégia do "2_frontend").
// ============================================================

const LOVABLE_API = "https://api.lovable.dev";

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
  collected.projectId = data.projectId || null;
  collected.bearerToken = data.bearerToken || null;
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

// ---------- Send ----------

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
  setStatus("Enviando para a Lovable...", "info");

  try {
    // Converte imagens para base64 (Lovable aceita data URLs em chat content)
    const imageDataUrls = [];
    for (const img of attached) {
      const dataUrl = await fileToBase64(img.file);
      imageDataUrls.push(dataUrl);
    }

    // Monta o conteúdo no formato esperado pela Lovable Chat API
    const content = [];
    if (prompt) content.push({ type: "text", text: prompt });
    for (const url of imageDataUrls) {
      content.push({ type: "image_url", image_url: { url } });
    }

    const res = await fetch(
      `${LOVABLE_API}/projects/${collected.projectId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${collected.bearerToken}`,
        },
        body: JSON.stringify({
          message: prompt,
          content: content.length > 1 ? content : undefined,
          images: imageDataUrls.length > 0 ? imageDataUrls : undefined,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    setStatus("✓ Mensagem enviada para a Lovable!", "success");
    promptInput.value = "";
    attached = [];
    renderThumbs();
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
