import { loadCollections, loadSearchSites } from "./storage.js";
import { search, searchInStock } from "./search.js";
import { sites } from "./sites.js";

function buildSearchControlsUI(searchSites, knownSites) {
  const containerDiv = document.createElement("div");
  containerDiv.className = "search-controls";
  containerDiv.style.display = "flex";
  containerDiv.style.flexDirection = "column";

  const mainRow = document.createElement("div");
  mainRow.className = "search-controls-main-row";
  mainRow.style.display = "flex";
  mainRow.style.gap = "0.5em";

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
  searchBtn.textContent = "Search";

  siteSelect.style.flex = "2";
  tabLimitInput.style.flex = "1";
  searchBtn.style.flex = "none";

  mainRow.appendChild(siteSelect);
  mainRow.appendChild(tabLimitInput);
  mainRow.appendChild(searchBtn);
  containerDiv.appendChild(mainRow);

  const secondRow = document.createElement("div");
  secondRow.className = "search-controls-extra-row";
  secondRow.style.display = "flex";
  secondRow.style.gap = "0.5em";
  secondRow.style.marginTop = "0.5em";
  secondRow.style.alignItems = "center";
  secondRow.style.display = "none";

  const holoLabel = document.createElement("label");
  holoLabel.textContent = "Holo only";
  holoLabel.style.display = "flex";
  holoLabel.style.alignItems = "center";
  const holoCheckbox = document.createElement("input");
  holoCheckbox.type = "checkbox";
  holoCheckbox.id = "sharedHoloOnly";
  holoCheckbox.style.marginRight = "0.25em";
  holoLabel.prepend(holoCheckbox);

  const inStockBtn = document.createElement("button");
  inStockBtn.id = "sharedInStockBtn";
  inStockBtn.textContent = "Search In Stock";

  secondRow.appendChild(holoLabel);
  secondRow.appendChild(inStockBtn);
  containerDiv.appendChild(secondRow);

  function updateExtraRowVisibility() {
    const selectedName = siteSelect.value;
    const selectedUrl = searchSites[selectedName];
    const isSupported = knownSites.some((site) => site.url === selectedUrl);
    secondRow.style.display = isSupported ? "flex" : "none";
  }

  siteSelect.addEventListener("change", updateExtraRowVisibility);
  updateExtraRowVisibility();

  return {
    containerDiv,
    siteSelect,
    tabLimitInput,
    searchBtn,
    inStockBtn,
    holoCheckbox,
  };
}

async function handleSearch({ artist, siteKey, maxTabs, collections }) {
  const collection = collections[artist];
  if (!collection) return null;

  const { owned = [], ignored = [], cards: currentCards = [] } = collection;

  const openedCards = await search({
    artist,
    siteKey,
    maxTabs,
    cards: currentCards,
    ownedIds: owned,
    ignoredIds: ignored,
  });

  return { cards: openedCards };
}

export async function createSearchControls(container, options = {}) {
  const searchSites = await loadSearchSites();
  const {
    containerDiv,
    siteSelect,
    tabLimitInput,
    searchBtn,
    inStockBtn,
    holoCheckbox,
  } = buildSearchControlsUI(searchSites, sites);

  container.innerHTML = "";
  container.appendChild(containerDiv);

  let currentCancel = null;
  let progressSpan = null;

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

  inStockBtn.addEventListener("click", async () => {
    // cancel if already running
    if (currentCancel) {
      currentCancel();
      currentCancel = null;
      inStockBtn.textContent = "Search In Stock";
      if (progressSpan) progressSpan.remove();
      return;
    }

    const artist = options.artist?.() ?? "";
    const siteKey = siteSelect.value;
    const holoOnly = holoCheckbox.checked;
    if (!artist || !siteKey) return;

    progressSpan = document.createElement("span");
    progressSpan.style.marginLeft = "0.5em";
    progressSpan.textContent = "(0 / ?)";
    inStockBtn.textContent = "Cancel";
    inStockBtn.after(progressSpan);

    const collections = await loadCollections();
    const { owned = [], ignored = [], cards = [] } = collections[artist] || {};

    const { cancel, total, result } = await searchInStock({
      artist,
      siteKey,
      holoOnly,
      cards,
      ownedIds: owned,
      ignoredIds: ignored,
      onProgress: ({ checked }) => {
        progressSpan.textContent = `(${checked} / ${total})`;
      },
      onComplete: () => {
        inStockBtn.textContent = "Search In Stock";
        currentCancel = null;
        if (progressSpan) progressSpan.remove();
      },
    });

    if (total === 0) {
      inStockBtn.textContent = "Search In Stock";
      currentCancel = null;
      if (progressSpan) progressSpan.remove();
      return;
    }

    progressSpan.textContent = `(0 / ${total})`;
    currentCancel = cancel;

    const { inStock } = await result;

    currentCancel = cancel;
  });
}
