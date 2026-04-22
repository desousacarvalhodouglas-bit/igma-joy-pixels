const DEFAULT_URL = "https://igma-joy-pixels.lovable.app";

const urlInput = document.getElementById("url");
const openBtn = document.getElementById("open");
const saveBtn = document.getElementById("save");

chrome.storage.local.get(["appUrl"], ({ appUrl }) => {
  urlInput.value = appUrl || DEFAULT_URL;
});

saveBtn.addEventListener("click", () => {
  const value = urlInput.value.trim() || DEFAULT_URL;
  chrome.storage.local.set({ appUrl: value }, () => {
    saveBtn.textContent = "✓ Salvo";
    setTimeout(() => (saveBtn.textContent = "Salvar URL"), 1200);
  });
});

openBtn.addEventListener("click", () => {
  const value = urlInput.value.trim() || DEFAULT_URL;
  chrome.storage.local.set({ appUrl: value });
  // Hash sinaliza ao app que veio da extensão (pode auto-abrir o popup admin)
  chrome.tabs.create({ url: `${value}/#debug-tool` });
  window.close();
});
