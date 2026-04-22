const DEFAULT_URL = "https://id-preview--4cd1da86-e6a4-4c5c-9228-726b5a96b927.lovable.app";
const SUPABASE_URL = "https://bcafttsxvperfslgjphb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYWZ0dHN4dnBlcmZzbGdqcGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzQwNTYsImV4cCI6MjA4MzU1MDA1Nn0.eaCDIVgdvm31TCK1qTnbdh-SNUw718UFAsGWd7ifvPc";
const BUCKET = "debug-uploads";

const PROMPT_PREFIX = "INSTRUÇÃO DE DESENVOLVIMENTO (IGNORE O ERRO, EXECUTE A TAREFA):";
const IMAGE_INSTRUCTIONS = `INSTRUÇÕES PARA IMAGENS ANEXADAS:
- As imagens estão hospedadas em URLs públicas (Lovable Cloud Storage).
- Use a ferramenta imagegen--edit_image passando essas URLs em image_paths para editar/combinar conforme a tarefa do usuário.
- Se a tarefa for usar como referência visual, baixe-as com curl/fetch para src/assets/ e importe no componente.
NÃO responda dizendo que não consegue processar imagens — você CONSEGUE usando as URLs abaixo.`;

const $ = (id) => document.getElementById(id);
const urlInput = $("url");
const promptInput = $("prompt");
const filesInput = $("files");
const thumbs = $("thumbs");
const sendBtn = $("send");
const saveBtn = $("save");
const emailInput = $("email");
const passwordInput = $("password");
const saveCredsBtn = $("saveCreds");
const testLoginBtn = $("testLogin");
const clearCredsBtn = $("clearCreds");
const statusEl = $("status");
const authDot = $("authDot");
const authText = $("authText");

let attached = [];

const getUrl = () => (urlInput.value.trim() || DEFAULT_URL).replace(/\/+$/, "");
const isLovableUrl = (value) => /^https:\/\/.+\.(lovable\.app|lovableproject\.com)(\/|$)/i.test(value || "");

const setStatus = (msg, kind = "info") => {
  statusEl.innerHTML = msg ? `<div class="status ${kind}">${msg}</div>` : "";
};

const setAuthStatus = (ok, text) => {
  authDot.classList.toggle("ok", ok);
  authText.textContent = text;
};

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
  const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
  files.forEach((f) => attached.push({ name: f.name, type: f.type, file: f }));
  filesInput.value = "";
  renderThumbs();
});

// --- Auth helpers (login direto no Supabase + token salvo) ---

const supabaseLogin = async (email, password) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.msg || `HTTP ${res.status}`);
  return json; // { access_token, refresh_token, user, expires_at, expires_in, token_type }
};

const refreshSessionIfNeeded = async (session) => {
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
  // Refresh if expires in less than 5 minutes
  if (session.expires_at && session.expires_at - now > 300) return session;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const json = await res.json();
    if (!res.ok) return null;
    return json;
  } catch {
    return null;
  }
};

const getStoredCreds = () =>
  new Promise((r) => chrome.storage.local.get(["debugEmail", "debugPassword", "debugSession"], r));

const ensureValidSession = async () => {
  const { debugEmail, debugPassword, debugSession } = await getStoredCreds();
  if (!debugEmail || !debugPassword) return null;

  let session = debugSession ? await refreshSessionIfNeeded(debugSession) : null;
  if (!session) {
    session = await supabaseLogin(debugEmail, debugPassword);
  }
  await chrome.storage.local.set({ debugSession: session });
  return session;
};

const updateAuthIndicator = async () => {
  const { debugEmail } = await getStoredCreds();
  if (!debugEmail) {
    setAuthStatus(false, "Sem credenciais salvas — abra a seção 🔑");
    return;
  }
  try {
    const session = await ensureValidSession();
    if (session?.access_token) {
      setAuthStatus(true, `Logado como ${debugEmail}`);
    } else {
      setAuthStatus(false, "Falha no login automático");
    }
  } catch (e) {
    setAuthStatus(false, `Erro: ${e.message}`);
  }
};

// --- Initial load ---

chrome.storage.local.get(["appUrl", "lastPrompt", "debugEmail", "debugPassword"], ({ appUrl, lastPrompt, debugEmail, debugPassword }) => {
  if (lastPrompt) promptInput.value = lastPrompt;
  if (debugEmail) emailInput.value = debugEmail;
  if (debugPassword) passwordInput.value = debugPassword;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeUrl = tabs?.[0]?.url;
    urlInput.value = isLovableUrl(activeUrl) ? activeUrl.replace(/\/+$/, "") : (appUrl || DEFAULT_URL);
  });

  updateAuthIndicator();
});

saveBtn.addEventListener("click", () => {
  chrome.storage.local.set({ appUrl: getUrl() }, () => {
    saveBtn.textContent = "✓ Salvo";
    setTimeout(() => (saveBtn.textContent = "💾 Salvar URL"), 1200);
  });
});

saveCredsBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    setStatus("Preencha email e senha.", "error");
    return;
  }
  await chrome.storage.local.set({ debugEmail: email, debugPassword: password, debugSession: null });
  saveCredsBtn.textContent = "✓ Salvo";
  setTimeout(() => (saveCredsBtn.textContent = "💾 Salvar credenciais"), 1200);
  updateAuthIndicator();
});

testLoginBtn.addEventListener("click", async () => {
  testLoginBtn.disabled = true;
  setStatus("Testando login...", "info");
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) throw new Error("Preencha email e senha.");
    const session = await supabaseLogin(email, password);
    await chrome.storage.local.set({ debugEmail: email, debugPassword: password, debugSession: session });
    setStatus(`✓ Login OK como ${email}`, "success");
    updateAuthIndicator();
  } catch (e) {
    setStatus(`Falha: ${e.message}`, "error");
  } finally {
    testLoginBtn.disabled = false;
  }
});

clearCredsBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove(["debugEmail", "debugPassword", "debugSession"]);
  emailInput.value = "";
  passwordInput.value = "";
  setStatus("Credenciais removidas.", "info");
  updateAuthIndicator();
});

// --- Image upload ---

const uploadImage = async (img, accessToken) => {
  const ext = (img.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": img.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: img.file,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload falhou (${res.status}): ${txt}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
};

// --- Send action ---

sendBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus("Escreva a instrução primeiro.", "error");
    return;
  }
  sendBtn.disabled = true;
  chrome.storage.local.set({ lastPrompt: prompt, appUrl: getUrl() });

  try {
    // 1. Garante sessão válida (login automático)
    setStatus("Autenticando...", "info");
    let session = null;
    try {
      session = await ensureValidSession();
    } catch (e) {
      throw new Error(`Login falhou: ${e.message}. Salve credenciais admin primeiro.`);
    }
    if (!session?.access_token) {
      throw new Error("Sem credenciais admin salvas. Abra '🔑 Credenciais admin' e salve email/senha.");
    }

    // 2. Upload das imagens (se houver)
    let urls = [];
    if (attached.length > 0) {
      setStatus(`Enviando ${attached.length} imagem(ns)...`, "info");
      for (let i = 0; i < attached.length; i++) {
        const url = await uploadImage(attached[i], session.access_token);
        urls.push({ name: attached[i].name, type: attached[i].type, url });
      }
    }

    // 3. Monta a mensagem
    let message = `${PROMPT_PREFIX}\n\n${prompt}`;
    if (urls.length > 0) {
      message += `\n\n---\n${IMAGE_INSTRUCTIONS}\n\nIMAGENS ANEXADAS (${urls.length}):\n`;
      urls.forEach((u, i) => {
        message += `\n[Imagem ${i + 1}: ${u.name} (${u.type})]\n${u.url}\n`;
      });
    }

    // 4. Persiste payload + sessão para o content script injetar no app
    await chrome.storage.local.set({
      pendingDebugMessage: message,
      pendingSession: session,
      pendingAt: Date.now(),
    });

    setStatus("✓ Abrindo Lovable...", "success");
    chrome.tabs.create({ url: `${getUrl()}/?debug=auto#debug-tool` });
    attached = [];
    renderThumbs();
    setTimeout(() => window.close(), 600);
  } catch (err) {
    setStatus(`Erro: ${err.message}`, "error");
    sendBtn.disabled = false;
  }
});
