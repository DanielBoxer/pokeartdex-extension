import {
  saveApiKey,
  loadApiKey,
  exportCollections,
  importCollections,
  loadSearchSites,
  saveSearchSites,
} from "./storage.js";

const apiKeyInput = document.getElementById("apiKey");
const statusEl = document.getElementById("status");
const siteListEl = document.getElementById("siteList");
const newSiteName = document.getElementById("newSiteName");
const newSiteUrl = document.getElementById("newSiteUrl");
const addSiteBtn = document.getElementById("addSiteBtn");

apiKeyInput.addEventListener("input", async () => {
  const apiKey = apiKeyInput.value.trim();
  await saveApiKey(apiKey);
  setTimeout(() => (statusEl.textContent = ""), 2000);
});

document
  .getElementById("exportCollections")
  .addEventListener("click", exportCollections);

document.getElementById("importFile").addEventListener("change", (e) => {
  importCollections(e, () => {
    statusEl.textContent = "Collections imported.";
    setTimeout(() => (statusEl.textContent = ""), 2000);
  });
});

function renderSiteList(sites) {
  siteListEl.innerHTML = "";

  for (const [name, url] of Object.entries(sites)) {
    const row = document.createElement("div");
    row.className = "site-entry";

    const nameInput = document.createElement("input");
    nameInput.value = name;
    nameInput.disabled = true;

    const urlInput = document.createElement("input");
    urlInput.value = url;
    urlInput.disabled = true;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      delete sites[name];
      await saveSearchSites(sites);
      renderSiteList(sites);
    });

    row.append(nameInput, urlInput, removeBtn);
    siteListEl.appendChild(row);
  }
}

addSiteBtn.addEventListener("click", async () => {
  const name = newSiteName.value.trim();
  const url = newSiteUrl.value.trim();
  if (!name || !url) return;

  const sites = await loadSearchSites();
  sites[name] = url;
  await saveSearchSites(sites);

  newSiteName.value = "";
  newSiteUrl.value = "";
  renderSiteList(sites);
});

loadSearchSites().then(renderSiteList);

loadApiKey().then((key) => {
  apiKeyInput.value = key;
});
