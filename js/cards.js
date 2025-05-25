import { getCardsByArtist } from "./search.js";
import {
  saveCollection,
  deleteCollection,
  loadCollections,
  loadSearchSites,
} from "./storage.js";
import {
  updateFeedback,
  getUIElements,
  renderCardList,
  clearCollectionDisplay,
  updateProgressAndValue,
} from "./cardDisplay.js";
import { sortOptions, capitalizeName } from "./utils.js";
import { createSearchControls } from "./searchControls.js";
import { setupArtistDropdown } from "./artistDropdown.js";

const siteMap = await loadSearchSites();
const elements = getUIElements();

let currentCards = [];
let currentArtist = "";
let ownedIds = new Set();

let ignoredIds = new Set();
let updatedAt = "";
let lastSearchedCards = [];

export function clearRecentCards() {
  lastSearchedCards = [];
  renderCurrentCards();
}

function renderCurrentCards() {
  renderCardList({
    cards: currentCards,
    ownedIds,
    ignoredIds,
    container: elements.cardList,
    lastSearchedCards,
    updatedAt,
    siteMap,
    groupBy: elements.groupBySet?.checked,
  });
}

async function saveCurrentState() {
  updatedAt = new Date().toISOString();
  await saveCollection(currentArtist, {
    cards: currentCards,
    owned: [...ownedIds],
    ignored: [...ignoredIds],
    updatedAt,
  });
}

function showSearchUI() {
  elements.controlsWrapper.style.display = "none";
  elements.artistSearchSection.style.display = "block";
  elements.artistInput.value = "";
  elements.artistSelect.selectedIndex = 0;
  clearCollectionDisplay(elements);
}

function showCollectionUI() {
  elements.artistSearchSection.style.display = "none";
  elements.controlsWrapper.style.display = "block";
  updateFeedback("");
}

function loadAndDisplayCollection(artist, entry) {
  currentArtist = artist;
  currentCards = entry.cards || [];
  ignoredIds = new Set(entry.ignored || []);
  updatedAt = entry.updatedAt || "";

  ownedIds = new Set(entry.owned || []);

  renderCurrentCards();
  updateProgressAndValue(currentCards, ownedIds);
  updateFeedback(`Loaded ${currentCards.length} cards for ${artist}.`);
}

function initArtistDropdown() {
  return setupArtistDropdown(elements.artistSelect, {
    onChange: (artist) => {
      elements.artistInput.value = artist;
      updateArtistSearchVisibility();

      if (!artist) {
        clearCollectionDisplay(elements);
        updateFeedback("No collection selected.");
        return;
      }

      loadCollectionFromStorage(artist);
    },
    onLoaded: (artistNames) => {
      const collectionControls = elements.controlsWrapper;

      if (artistNames.length === 0) {
        collectionControls.style.display = "none";
      } else {
        collectionControls.style.display = "block";

        const selected = elements.artistSelect.value;
        if (selected) {
          elements.artistInput.value = selected;
          loadCollectionFromStorage(selected);
        }
      }

      updateArtistSearchVisibility();
    },
  });
}

const artistDropdown = initArtistDropdown();
const getSelectedArtist = artistDropdown.getSelectedArtist;

function loadCollectionFromStorage(artist) {
  loadCollections().then((collections) => {
    const entry = collections[artist];
    if (!entry) return updateFeedback(`No saved data for "${artist}".`);
    loadAndDisplayCollection(artist, entry);
  });
}

elements.loadBtn.addEventListener("click", async () => {
  let artist = elements.artistInput.value.trim();
  if (!artist) return;

  artist = capitalizeName(artist);
  elements.artistInput.value = artist;

  updateFeedback(`Searching cards for ${artist}...`);

  currentCards = await getCardsByArtist(artist);
  currentArtist = artist;
  ignoredIds = new Set();
  updatedAt = new Date().toISOString();
  elements.artistSelect.selectedIndex = 0;

  await saveCollection(artist, {
    cards: currentCards,
    owned: [],
    ignored: [],
    updatedAt,
  });

  artistDropdown.refresh(artist);
  renderCurrentCards();
  updateProgressAndValue(currentCards, ownedIds);
  updateFeedback(
    `Loaded and saved ${currentCards.length} cards for "${artist}".`
  );
});

elements.sortDropdown.addEventListener("change", () => {
  const sortFn = sortOptions[elements.sortDropdown.value];
  if (sortFn) currentCards.sort(sortFn);
  renderCurrentCards();
});

elements.groupBySet.addEventListener("change", () => {
  renderCurrentCards();
});

elements.deleteBtn?.addEventListener("click", async () => {
  const artist = elements.artistInput.value.trim();
  if (!artist) return;

  if (confirm(`Delete saved collection for "${artist}"?`)) {
    await deleteCollection(artist);

    clearCollectionDisplay(elements);
    updateFeedback(`Deleted collection for "${artist}".`);

    const collections = await loadCollections();
    const remaining = Object.keys(collections);

    if (remaining.length === 0) {
      showSearchUI();
    } else {
      initArtistDropdown();
    }
  }
});

elements.newCollectionBtn?.addEventListener("click", () => {
  showSearchUI();
  updateFeedback("");
});

function toggleIgnoreAll() {
  const all = elements.cardList.querySelectorAll("input[data-ignore-id]");
  const toggle = ![...all].every((cb) => cb.checked);

  all.forEach((cb) => {
    cb.checked = toggle;
    const id = cb.dataset.ignoreId;
    const li = cb.closest("li");

    if (toggle) {
      ignoredIds.add(id);
      if (li) li.style.opacity = "0.5";
    } else {
      ignoredIds.delete(id);
      if (li) li.style.opacity = "1";
    }
  });

  saveCurrentState();
}

elements.ignoreAllBtn?.addEventListener("click", toggleIgnoreAll);

elements.cardList.addEventListener("change", (e) => {
  if (e.target.matches("input[data-id]")) {
    const id = e.target.dataset.id;
    if (e.target.checked) {
      ownedIds.add(id);
    } else {
      ownedIds.delete(id);
    }
    updateProgressAndValue(currentCards, ownedIds);
    saveCurrentState();
  }
});

elements.backBtn?.addEventListener("click", () => {
  showCollectionUI();
  initArtistDropdown();
});

elements.refreshBtn?.addEventListener("click", async () => {
  updateFeedback("Refreshing card data...");

  currentCards = await getCardsByArtist(currentArtist);

  await saveCurrentState();

  renderCurrentCards();
  updateProgressAndValue(currentCards, ownedIds);
  updateFeedback("Collection refreshed.");
});

createSearchControls(elements.searchControls, {
  artist: getSelectedArtist,
  onSearchComplete: ({ cards }) => {
    lastSearchedCards = cards;
    renderCurrentCards();
  },
});

function updateArtistSearchVisibility() {
  elements.artistSearchSection.style.display =
    elements.artistSelect.value === "" ? "block" : "none";
}

elements.artistSelect.addEventListener("change", updateArtistSearchVisibility);
updateArtistSearchVisibility();
