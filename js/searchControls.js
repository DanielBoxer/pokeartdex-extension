import { loadCollections, loadSearchSites } from "./storage.js";
import { search } from "./search.js";

function buildSearchControlsUI(searchSites, layoutClass) {
  const containerDiv = document.createElement("div");
  containerDiv.className = layoutClass;

  const siteSelect = document.createElement("select");
  siteSelect.id = "sharedSiteSelect";

  for (const key of Object.keys(searchSites)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    siteSelect.appendChild(option);
  }

  const tabLimitInput = document.createElement("input");
  tabLimitInput.type = "number";
  tabLimitInput.id = "sharedTabLimit";
  tabLimitInput.value = "10";
  tabLimitInput.min = "1";
  tabLimitInput.max = "50";

  const searchBtn = document.createElement("button");
  searchBtn.id = "sharedSearchBtn";
  searchBtn.textContent = "Search for cards";

  containerDiv.appendChild(siteSelect);
  containerDiv.appendChild(tabLimitInput);
  containerDiv.appendChild(searchBtn);

  return {
    containerDiv,
    siteSelect,
    tabLimitInput,
    searchBtn,
  };
}

async function handleSearch({ artist, siteKey, maxTabs, collections }) {
  const collection = collections[artist];
  if (!collection) return null;

  const { owned = [], ignored = [], cards: currentCards = [] } = collection;
  const ownedSet = new Set(owned);
  const ignoredSet = new Set(ignored);

  const cardsToSearch = currentCards.filter(
    (card) => !ownedSet.has(card.id) && !ignoredSet.has(card.id)
  );

  const openedCards = await search({
    artist,
    siteKey,
    maxTabs,
    cards: cardsToSearch,
  });

  return { cards: openedCards };
}

export async function createSearchControls(container, options = {}) {
  const layoutClass =
    container.dataset.layout === "row"
      ? "search-controls-row"
      : "search-controls-column";

  const searchSites = await loadSearchSites();
  const { containerDiv, siteSelect, tabLimitInput, searchBtn } =
    buildSearchControlsUI(searchSites, layoutClass);

  container.innerHTML = "";
  container.appendChild(containerDiv);

  searchBtn.addEventListener("click", async () => {
    const artist = options.artist?.() ?? "";
    const siteKey = siteSelect.value;
    const maxTabs = parseInt(tabLimitInput.value, 10) || 10;
    if (!artist || !siteKey) return;

    const collections = await loadCollections();
    const result = await handleSearch({
      artist,
      siteKey,
      maxTabs,
      collections,
    });
    if (!result) return;

    options.onSearchComplete?.({
      artist,
      cards: result.cards,
      ownedIds: result.ownedIds,
    });
  });
}
