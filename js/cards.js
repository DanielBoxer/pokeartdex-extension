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
import { sortOptions } from "./utils.js";
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

function getIgnoredIdsFromDOM() {
  return [
    ...elements.cardList.querySelectorAll("input[data-ignore-id]:checked"),
  ].map((cb) => cb.dataset.ignoreId);
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
      if (artistNames.length > 0) {
        const first = artistNames[0];
        elements.artistInput.value = first;
        elements.artistSelect.value = first;
        updateArtistSearchVisibility();
        loadCollectionFromStorage(first);
      }
    },
  });
}

const { getSelectedArtist } = initArtistDropdown();

function loadCollectionFromStorage(artist) {
  loadCollections().then((collections) => {
    const entry = collections[artist];
    if (!entry) return updateFeedback(`No saved data for "${artist}".`);

    currentArtist = artist;
    currentCards = entry.cards || [];
    ignoredIds = new Set(entry.ignored || []);
    updatedAt = entry.updatedAt || "";

    renderCurrentCards(entry.owned || []);
    updateProgressAndValue(currentCards, entry.owned || []);
    updateFeedback(`Loaded ${currentCards.length} cards for ${artist}.`);
  });
}

elements.loadBtn.addEventListener("click", async () => {
  const artist = elements.artistInput.value.trim();
  if (!artist) return;
  updateFeedback(`Searching cards for ${artist}...`);

  const cards = await getCardsByArtist(artist);
  currentArtist = artist;
  currentCards = cards;
  ignoredIds = new Set();
  updatedAt = "";
  elements.artistSelect.selectedIndex = 0;

  renderCurrentCards([]);
  updateProgressAndValue(cards, []);
  updateFeedback(`Loaded ${cards.length} cards from API for "${artist}".`);
});

elements.sortDropdown.addEventListener("change", () => {
  const sortFn = sortOptions[elements.sortDropdown.value];
  if (sortFn) currentCards.sort(sortFn);
  renderCurrentCards(getOwnedIdsFromDOM());
});

elements.groupBySet.addEventListener("change", () => {
  renderCurrentCards(getOwnedIdsFromDOM());
});

elements.saveBtn.addEventListener("click", () => {
  const owned = getOwnedIdsFromDOM();
  const ignored = getIgnoredIdsFromDOM();
  const artist = elements.artistInput.value.trim();

  if (
    artist &&
    confirm(
      `Save collection for "${artist}" with ${owned.length} owned and ${ignored.length} ignored cards?`
    )
  ) {
    saveCollection(artist, {
      cards: currentCards,
      owned,
      ignored,
    }).then(() => {
      updateFeedback(`Saved collection for "${artist}".`);
      updateProgressAndValue(currentCards, owned);
      initArtistDropdown();
    });
  }
});

elements.deleteBtn?.addEventListener("click", () => {
  const artist = elements.artistInput.value.trim();
  if (artist && confirm(`Delete saved collection for "${artist}"?`)) {
    deleteCollection(artist).then(() => {
      clearCollectionDisplay(elements);
      updateFeedback(`Deleted collection for "${artist}".`);
    });
  }
});

elements.ignoreAllBtn?.addEventListener("click", () => {
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
});

elements.cardList.addEventListener("change", (e) => {
  if (e.target.matches("input[data-id]")) {
    const owned = getOwnedIdsFromDOM();
    updateProgressAndValue(currentCards, owned);
  }
});

elements.refreshBtn?.addEventListener("click", async () => {
  updateFeedback("Refreshing card data...");
  const cards = await getCardsByArtist(currentArtist);
  const owned = getOwnedIdsFromDOM();
  const ignored = [...ignoredIds];

  await saveCollection(currentArtist, {
    cards,
    owned,
    ignored,
  });

  updatedAt = new Date().toISOString();
  currentCards = cards;
  renderCurrentCards(owned);
  updateProgressAndValue(cards, owned);
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
