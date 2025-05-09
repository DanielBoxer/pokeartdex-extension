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
  getOwnedIdsFromDOM,
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
let ignoredIds = new Set();
let updatedAt = "";
let lastSearchedCards = [];

function renderCurrentCards(ownedIds = []) {
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

async function saveCurrentState(owned) {
  updatedAt = new Date().toISOString();
  await saveCollection(currentArtist, {
    cards: currentCards,
    owned,
    ignored: [...ignoredIds],
    updatedAt,
  });
}

function showSearchUI() {
  document.getElementById("controlsWrapper").style.display = "none";
  document.getElementById("artistSearchSection").style.display = "block";
  elements.artistInput.value = "";
  elements.artistSelect.selectedIndex = 0;
  clearCollectionDisplay(elements);
}

function loadAndDisplayCollection(artist, entry) {
  currentArtist = artist;
  currentCards = entry.cards || [];
  ignoredIds = new Set(entry.ignored || []);
  updatedAt = entry.updatedAt || "";

  renderCurrentCards(entry.owned || []);
  updateProgressAndValue(currentCards, entry.owned || []);
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
      const collectionControls = document.getElementById("controlsWrapper");

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
  renderCurrentCards([]);
  updateProgressAndValue(currentCards, []);
  updateFeedback(
    `Loaded and saved ${currentCards.length} cards for "${artist}".`
  );
});

elements.sortDropdown.addEventListener("change", () => {
  const sortFn = sortOptions[elements.sortDropdown.value];
  if (sortFn) currentCards.sort(sortFn);
  renderCurrentCards(getOwnedIdsFromDOM());
});

elements.groupBySet.addEventListener("change", () => {
  renderCurrentCards(getOwnedIdsFromDOM());
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

  saveCurrentState(getOwnedIdsFromDOM());
}

elements.ignoreAllBtn?.addEventListener("click", toggleIgnoreAll);

elements.cardList.addEventListener("change", (e) => {
  if (e.target.matches("input[data-id]")) {
    const owned = getOwnedIdsFromDOM();
    updateProgressAndValue(currentCards, owned);
    saveCurrentState(owned);
  }
});

elements.refreshBtn?.addEventListener("click", async () => {
  updateFeedback("Refreshing card data...");

  currentCards = await getCardsByArtist(currentArtist);
  const owned = getOwnedIdsFromDOM();

  await saveCurrentState(owned);

  renderCurrentCards(owned);
  updateProgressAndValue(currentCards, owned);
  updateFeedback("Collection refreshed.");
});

createSearchControls(document.getElementById("externalSearchControls"), {
  artist: getSelectedArtist,
  onSearchComplete: ({ cards, ownedIds }) => {
    lastSearchedCards = cards.slice(0, ownedIds.length);
    renderCurrentCards(ownedIds);
  },
});

function updateArtistSearchVisibility() {
  const section = document.getElementById("artistSearchSection");
  section.style.display = elements.artistSelect.value === "" ? "block" : "none";
}

elements.artistSelect.addEventListener("change", updateArtistSearchVisibility);
updateArtistSearchVisibility();
