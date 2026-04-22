const PROJECT_ID = "4cd1da86-e6a4-4c5c-9228-726b5a96b927";
const DEFAULT_URL = `https://id-preview--${PROJECT_ID}.lovable.app`;
const PUBLISHED_URL = "https://igma-joy-pixels.lovable.app";
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
const promptInput = $("prompt");
const filesInput = $("files");
const thumbs = $("thumbs");
const sendBtn = $("send");
const emailInput = $("email");
const passwordInput = $("password");
const saveCredsBtn = $("saveCreds");
const testLoginBtn = $("testLogin");
const clearCredsBtn = $("clearCreds");
const googleLoginBtn = $("googleLogin");
const statusEl = $("status");
const authDot = $("authDot");
const authText = $("authText");
const projectInfo = $("projectInfo");
const tabSelect = $("tabSelect");

let attached = [];
let detectedTabs = []; // { id, url, title }
let selectedUrl = null;

const isLovableUrl = (value) =>
  /^https:\/\/.+\.(lovable\.app|lovableproject\.com)(\/|$)/i.test(value || "");

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

// --- Project auto-detection ---

const detectLovableTabs = () =>
  new Promise((resolve) => {
    chrome.tabs.query(
      { url: ["https://*.lovable.app/*", "https://*.lovableproject.com/*"] },
      (tabs) => resolve(tabs || [])
    );
  });

const renderProjectDetection = async () => {
  const tabs = await detectLovableTabs();
  detectedTabs = tabs;

  // Active tab first
  const [activeTab] = await new Promise((r) =>
    chrome.tabs.query({ active: true, currentWindow: true }, r)
  );
  const activeIsLovable = activeTab && isLovableUrl(activeTab.url);

  if (activeIsLovable) {
    selectedUrl = activeTab.url.replace(/\/+$/, "");
    projectInfo.innerHTML = `
      <div class="detected">
        ✓ Projeto detectado na aba ativa
        <div class="detected-url">${selectedUrl}</div>
      </div>
    `;
    tabSelect.style.display = "none";
    return;
  }

  if (tabs.length === 1) {
    selectedUrl = tabs[0].url.replace(/\/+$/, "");
    projectInfo.innerHTML = `
      <div class="detected">
        ✓ 1 aba Lovable encontrada
        <div class="detected-url">${selectedUrl}</div>
      </div>
    `;
    tabSelect.style.display = "none";
    return;
  }

  if (tabs.length > 1) {
    selectedUrl = tabs[0].url.replace(/\/+$/, "");
    projectInfo.innerHTML = `<div class="detected">✓ ${tabs.length} abas Lovable encontradas — escolha:</div>`;
    tabSelect.style.display = "block";
    tabSelect.innerHTML = tabs
      .map(
        (t, i) =>
          `<option value="${t.url}" ${i === 0 ? "selected" : ""}>${(t.title || t.url).slice(0, 50)}</option>`
      )
      .join("");
    tabSelect.onchange = () => {
      selectedUrl = tabSelect.value.replace(/\/+$/, "");
    };
    return;
  }

  // Fallback: nenhuma aba aberta — usaremos o projeto padrão
  selectedUrl = DEFAULT_URL;
  projectInfo.innerHTML = `
    <div class="detected warn">
      ⚠ Nenhuma aba Lovable aberta — uma nova será criada
      <div class="detected-url">${DEFAULT_URL}</div>
    </div>
  `;
  tabSelect.style.display = "none";
};

// --- Auth helpers ---

const supabaseLogin = async (email, password) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.msg || `HTTP ${res.status}`);
  return json;
};

const refreshSessionIfNeeded = async (session) => {
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
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
  new Promise((r) =>
    chrome.storage.local.get(
      ["debugEmail", "debugPassword", "debugSession", "debugAuthMode"],
      r
    )
  );

const ensureValidSession = async () => {
  const { debugEmail, debugPassword, debugSession, debugAuthMode } = await getStoredCreds();

  if (debugAuthMode === "google") {
    if (!debugSession) return null;
    const refreshed = await refreshSessionIfNeeded(debugSession);
    if (refreshed) {
      await chrome.storage.local.set({ debugSession: refreshed });
      return refreshed;
    }
    return null;
  }

  if (!debugEmail || !debugPassword) return null;
  let session = debugSession ? await refreshSessionIfNeeded(debugSession) : null;
  if (!session) session = await supabaseLogin(debugEmail, debugPassword);
  await chrome.storage.local.set({ debugSession: session, debugAuthMode: "password" });
  return session;
};

// --- Google OAuth via chrome.identity.launchWebAuthFlow ---

const googleSignIn = async () => {
  const redirectUri = chrome.identity.getRedirectURL();
  const authorizeUrl =
    `${SUPABASE_URL}/auth/v1/authorize` +
    `?provider=google` +
    `&redirect_to=${encodeURIComponent(redirectUri)}`;

  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authorizeUrl, interactive: true },
      (url) => {
        if (chrome.runtime.lastError || !url) {
          reject(new Error(chrome.runtime.lastError?.message || "Login cancelado"));
        } else {
          resolve(url);
        }
      }
    );
  });

  const hash = new URL(responseUrl).hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const expires_in = parseInt(params.get("expires_in") || "3600", 10);
  const token_type = params.get("token_type") || "bearer";

  if (!access_token || !refresh_token) {
    const err = params.get("error_description") || params.get("error") || "Sem token retornado";
    throw new Error(err);
  }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${access_token}` },
  });
  const user = userRes.ok ? await userRes.json() : null;

  return {
    access_token,
    refresh_token,
    expires_in,
    expires_at: Math.floor(Date.now() / 1000) + expires_in,
    token_type,
    user,
  };
};

const updateAuthIndicator = async () => {
  const { debugEmail, debugAuthMode, debugSession } = await getStoredCreds();

  if (debugAuthMode === "google") {
    const session = await ensureValidSession();
    if (session?.access_token) {
      const who = session.user?.email || debugSession?.user?.email || "Google";
      setAuthStatus(true, `Logado com Google (${who})`);
    } else {
      setAuthStatus(false, "Sessão Google expirada — entre novamente");
    }
    return;
  }

  if (!debugEmail) {
    setAuthStatus(false, "Sem login — clique em 🔐 abaixo");
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

chrome.storage.local.get(["lastPrompt", "debugEmail", "debugPassword"], ({ lastPrompt, debugEmail, debugPassword }) => {
  if (lastPrompt) promptInput.value = lastPrompt;
  if (debugEmail) emailInput.value = debugEmail;
  if (debugPassword) passwordInput.value = debugPassword;
  renderProjectDetection();
  updateAuthIndicator();
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
  await chrome.storage.local.remove(["debugEmail", "debugPassword", "debugSession", "debugAuthMode"]);
  emailInput.value = "";
  passwordInput.value = "";
  setStatus("Sessão e credenciais removidas.", "info");
  updateAuthIndicator();
});

googleLoginBtn.addEventListener("click", async () => {
  googleLoginBtn.disabled = true;
  setStatus("Abrindo login Google...", "info");
  try {
    const session = await googleSignIn();
    await chrome.storage.local.set({
      debugSession: session,
      debugAuthMode: "google",
      debugEmail: session.user?.email || null,
    });
    setStatus(`✓ Conectado como ${session.user?.email || "Google user"}`, "success");
    updateAuthIndicator();
  } catch (e) {
    setStatus(`Falha Google: ${e.message}`, "error");
  } finally {
    googleLoginBtn.disabled = false;
  }
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

// --- Send ---

const buildTargetUrl = (baseUrl) => {
  const u = new URL(baseUrl);
  u.searchParams.set("debug", "auto");
  u.hash = "debug-tool";
  return u.toString();
};

const findExistingTab = async (targetBaseUrl) => {
  const origin = new URL(targetBaseUrl).origin;
  const tabs = await new Promise((r) =>
    chrome.tabs.query({ url: `${origin}/*` }, r)
  );
  return tabs?.[0] || null;
};

sendBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus("Escreva a instrução primeiro.", "error");
    return;
  }
  if (!selectedUrl) {
    setStatus("Nenhum projeto selecionado.", "error");
    return;
  }
  sendBtn.disabled = true;
  chrome.storage.local.set({ lastPrompt: prompt });

  try {
    setStatus("Autenticando...", "info");
    let session = null;
    try {
      session = await ensureValidSession();
    } catch (e) {
      throw new Error(`Login falhou: ${e.message}. Salve credenciais admin primeiro.`);
    }
    if (!session?.access_token) {
      throw new Error("Sem login válido. Clique em '🔐 Entrar com Google' ou salve email/senha.");
    }

    let urls = [];
    if (attached.length > 0) {
      setStatus(`Enviando ${attached.length} imagem(ns)...`, "info");
      for (let i = 0; i < attached.length; i++) {
        const url = await uploadImage(attached[i], session.access_token);
        urls.push({ name: attached[i].name, type: attached[i].type, url });
      }
    }

    let message = `${PROMPT_PREFIX}\n\n${prompt}`;
    if (urls.length > 0) {
      message += `\n\n---\n${IMAGE_INSTRUCTIONS}\n\nIMAGENS ANEXADAS (${urls.length}):\n`;
      urls.forEach((u, i) => {
        message += `\n[Imagem ${i + 1}: ${u.name} (${u.type})]\n${u.url}\n`;
      });
    }

    await chrome.storage.local.set({
      pendingDebugMessage: message,
      pendingSession: session,
      pendingAt: Date.now(),
    });

    setStatus("✓ Conectando ao projeto...", "success");

    // Reaproveita aba existente quando possível, em vez de criar nova
    const targetUrl = buildTargetUrl(selectedUrl);
    const existing = await findExistingTab(selectedUrl);
    if (existing) {
      await chrome.tabs.update(existing.id, { url: targetUrl, active: true });
      await chrome.windows.update(existing.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: targetUrl });
    }

    attached = [];
    renderThumbs();
    setTimeout(() => window.close(), 600);
  } catch (err) {
    setStatus(`Erro: ${err.message}`, "error");
    sendBtn.disabled = false;
  }
});
