import { sites } from "./sites.js";

const STORAGE_KEYS = {
  collections: "collections",
  apiKey: "apiKey",
  searchSites: "searchSites",
};

const DOWNLOAD_FILENAME = "pokeartdex-collections.json";

function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (data) => resolve(data[key]));
  });
}

// search sites

export function loadSearchSites() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.searchSites, (data) => {
      const saved = data[STORAGE_KEYS.searchSites];

      if (saved && typeof saved === "object") {
        resolve(saved);
      } else {
        const fallback = Object.fromEntries(
          sites.map(({ name, url }) => [name, url])
        );
        resolve(fallback);
      }
    });
  });
}

export function saveSearchSites(sites) {
  return chrome.storage.local.set({ [STORAGE_KEYS.searchSites]: sites });
}

// collections

export async function saveCollection(artist, { cards, owned, ignored }) {
  const collections = (await getFromStorage(STORAGE_KEYS.collections)) || {};
  collections[artist] = {
    cards,
    owned,
    ignored,
    updatedAt: new Date().toISOString(),
  };
  return chrome.storage.local.set({ [STORAGE_KEYS.collections]: collections });
}

export async function deleteCollection(artist) {
  const collections = (await getFromStorage(STORAGE_KEYS.collections)) || {};
  delete collections[artist];
  return chrome.storage.local.set({ [STORAGE_KEYS.collections]: collections });
}

export async function loadCollections() {
  return (await getFromStorage(STORAGE_KEYS.collections)) || {};
}

export async function exportCollections() {
  const collections = (await getFromStorage(STORAGE_KEYS.collections)) || {};
  const blob = new Blob([JSON.stringify(collections, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = DOWNLOAD_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}

export function importCollections(event, callback) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (typeof imported !== "object" || Array.isArray(imported)) {
        throw new Error("Invalid format");
      }

      chrome.storage.local.set(
        { [STORAGE_KEYS.collections]: imported },
        callback
      );
    } catch (err) {
      alert("Failed to import: invalid JSON.");
    }
  };
  reader.readAsText(file);
}

// settings

export function saveApiKey(key) {
  return chrome.storage.local.set({ [STORAGE_KEYS.apiKey]: key });
}

export async function loadApiKey() {
  return (await getFromStorage(STORAGE_KEYS.apiKey)) || "";
}
