const DEFAULT_URL = "https://igma-joy-pixels.lovable.app";

const urlInput = document.getElementById("url");
const openBtn = document.getElementById("open");
const loginBtn = document.getElementById("login");
const saveBtn = document.getElementById("save");

const getUrl = () => (urlInput.value.trim() || DEFAULT_URL).replace(/\/+$/, "");

chrome.storage.local.get(["appUrl"], ({ appUrl }) => {
  urlInput.value = appUrl || DEFAULT_URL;
});

saveBtn.addEventListener("click", () => {
  chrome.storage.local.set({ appUrl: getUrl() }, () => {
    saveBtn.textContent = "✓ Salvo";
    setTimeout(() => (saveBtn.textContent = "💾 Salvar URL"), 1200);
  });
});

const openWindow = (path) => {
  const base = getUrl();
  chrome.storage.local.set({ appUrl: base });
  chrome.windows.create({
    url: `${base}${path}`,
    type: "popup",
    width: 480,
    height: 760,
  });
  window.close();
};

openBtn.addEventListener("click", () => openWindow("/#debug-tool"));
loginBtn.addEventListener("click", () => openWindow("/auth"));
