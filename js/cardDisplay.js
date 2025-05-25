import { buildSearchUrl } from "./search.js";
import {
  formatDate,
  groupBy,
  calculateOwnedValue,
  totalPrice,
  sortOptions,
  getMarketPrice,
} from "./utils.js";
import { clearRecentCards } from "./cards.js";

export function getUIElements() {
  return {
    artistInput: document.getElementById("artist"),
    cardList: document.getElementById("cardList"),
    feedback: document.getElementById("feedback"),
    progress: document.getElementById("ownedProgress"),
    totalValue: document.getElementById("totalValue"),
    artistSelect: document.getElementById("savedArtists"),
    lastUpdated: document.getElementById("lastUpdated"),
    sortDropdown: document.getElementById("sortBy"),
    groupBySet: document.getElementById("groupBySet"),
    searchControls: document.getElementById("externalSearchControls"),
    controlsWrapper: document.getElementById("controlsWrapper"),
    artistSearchSection: document.getElementById("artistSearchSection"),
    // buttons
    loadBtn: document.getElementById("loadArtist"),
    deleteBtn: document.getElementById("deleteCollection"),
    refreshBtn: document.getElementById("refreshCollection"),
    newCollectionBtn: document.getElementById("newCollectionBtn"),
    ignoreAllBtn: document.getElementById("ignoreAllBtn"),
    backBtn: document.getElementById("backButton"),
  };
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function groupBySet(cards) {
  return groupBy(cards, (card) => card.set?.name || "Unknown Set");
}

export function updateProgress(owned, total) {
  setText("ownedProgress", `Owned: ${owned} / ${total}`);
}

export function updateValueDisplay(value) {
  setText("totalValue", `Estimated Value: $${value.toFixed(2)}`);
}

export function updateFeedback(msg) {
  setText("feedback", msg);
}

export function clearCollectionDisplay(elements) {
  elements.cardList.innerHTML = "";
  updateProgress(0, 0);
  updateValueDisplay(0);
}

export function updateProgressAndValue(cards, ownedIds) {
  updateProgress(ownedIds.size, cards.length);
  updateValueDisplay(calculateOwnedValue(cards, ownedIds));
}

function renderRecentCards(cards, ownedIds, ignoredIds, container, siteMap) {
  if (cards.length === 0) return;

  const headerRow = document.createElement("div");
  headerRow.className = "row";

  const header = document.createElement("h4");
  header.textContent = "Recently Searched";
  header.style.marginRight = "auto";

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear";
  clearBtn.className = "button small-button space-bottom";
  clearBtn.addEventListener("click", () => {
    clearRecentCards();
  });

  headerRow.appendChild(header);
  headerRow.appendChild(clearBtn);
  container.appendChild(headerRow);

  cards.forEach((card) =>
    renderCardItem(card, ownedIds, ignoredIds, container, siteMap)
  );
}

function renderGroupedCards(
  cards,
  ownedIds,
  ignoredIds,
  container,
  siteMap,
  sortKey,
  sortFn
) {
  const grouped = groupBySet(cards);

  const sortedGroups = Object.entries(grouped).sort((a, b) => {
    if (!sortFn) return a[0].localeCompare(b[0]);

    if (sortKey === "price-high" || sortKey === "price-low") {
      const valueA = totalPrice(a[1]);
      const valueB = totalPrice(b[1]);
      return sortKey === "price-high" ? valueB - valueA : valueA - valueB;
    }

    if (sortKey === "name-asc") return a[0].localeCompare(b[0]);
    if (sortKey === "name-desc") return b[0].localeCompare(a[0]);

    const cardA = a[1][0];
    const cardB = b[1][0];
    return sortFn(cardA, cardB);
  });

  sortedGroups.forEach(([setName, group]) => {
    const header = document.createElement("h4");

    if (sortKey?.startsWith("price")) {
      const price = totalPrice(group);
      header.textContent = `${setName} - $${price.toFixed(2)}`;
    } else {
      const date = formatDate(group[0]?.set?.releaseDate) || "Unknown";
      header.textContent = `${setName} - ${date}`;
    }

    container.appendChild(header);

    const cardSortFn = sortFn || ((a, b) => a.name.localeCompare(b.name));

    group
      .slice()
      .sort(cardSortFn)
      .forEach((card) =>
        renderCardItem(card, ownedIds, ignoredIds, container, siteMap)
      );
  });
}

function renderFlatCards(cards, ownedIds, ignoredIds, container, siteMap) {
  cards.forEach((card) =>
    renderCardItem(card, ownedIds, ignoredIds, container, siteMap)
  );
}

export function renderCardList({
  cards,
  ownedIds,
  ignoredIds,
  container,
  lastSearchedCards = [],
  updatedAt,
  siteMap,
  groupBy = true,
}) {
  container.innerHTML = "";

  const { sortDropdown, lastUpdated } = getUIElements();
  const sortKey = sortDropdown?.value;
  const sortFn = sortOptions[sortKey];

  if (lastUpdated) {
    lastUpdated.textContent = `Last updated: ${
      updatedAt ? formatDate(updatedAt) : "N/A"
    }`;
  }

  // don't show recently searched cards in list
  const recentIds = new Set(lastSearchedCards.map((c) => c.id));
  const remaining = cards.filter((c) => !recentIds.has(c.id));

  renderRecentCards(
    lastSearchedCards,
    ownedIds,
    ignoredIds,
    container,
    siteMap
  );

  if (groupBy) {
    renderGroupedCards(
      remaining,
      ownedIds,
      ignoredIds,
      container,
      siteMap,
      sortKey,
      sortFn
    );
  } else {
    renderFlatCards(remaining, ownedIds, ignoredIds, container, siteMap);
  }
}

function renderCardItem(card, ownedIds, ignoredIds, container, siteMap) {
  const owned = ownedIds.has(card.id);
  const ignored = ignoredIds.has(card.id);

  const li = document.createElement("li");
  li.style.opacity = ignored ? "0.5" : "1";

  const row = document.createElement("div");
  row.className = "card-row";

  const ownedBox = document.createElement("input");
  ownedBox.type = "checkbox";
  ownedBox.className = "owned-box";
  ownedBox.dataset.id = card.id;
  if (owned) ownedBox.checked = true;

  const ignoreBox = document.createElement("input");
  ignoreBox.type = "checkbox";
  ignoreBox.className = "ignore-box";
  ignoreBox.dataset.ignoreId = card.id;
  if (ignored) ignoreBox.checked = true;

  const img = document.createElement("img");
  img.src = card.images.small;
  img.width = 60;
  img.height = 84;
  img.className = "zoomable";

  const details = document.createElement("div");
  details.className = "card-details";

  const title = document.createElement("strong");
  title.textContent = card.name;

  const number = document.createElement("span");
  number.className = "card-number";
  number.textContent = ` - #${card.number}/${card.set?.printedTotal ?? "?"}`;

  const searchBtn = document.createElement("button");
  searchBtn.className = "space-top";
  searchBtn.textContent = "Search";

  ignoreBox.addEventListener("change", (e) => {
    li.style.opacity = e.target.checked ? "0.5" : "1";
  });

  searchBtn.addEventListener("click", () => {
    const siteKey = document.querySelector("#sharedSiteSelect")?.value;
    const url = buildSearchUrl(card, siteKey, siteMap);
    if (url) chrome.tabs.create({ url });
  });

  const price = getMarketPrice(card);

  const priceEl = document.createElement("span");
  priceEl.className = "card-price";
  priceEl.textContent = ` - $${price.toFixed(2)}`;

  details.appendChild(title);
  details.appendChild(document.createTextNode(" "));
  details.appendChild(number);
  details.appendChild(priceEl);
  details.appendChild(document.createElement("br"));
  details.appendChild(searchBtn);

  row.appendChild(ownedBox);
  row.appendChild(ignoreBox);
  row.appendChild(img);
  row.appendChild(details);
  li.appendChild(row);

  container.appendChild(li);
}
