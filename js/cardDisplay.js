import { buildSearchUrl } from "./search.js";
import { formatDate, groupBy, calculateOwnedValue } from "./utils.js";

export function getUIElements() {
  return {
    artistInput: document.getElementById("artist"),
    cardList: document.getElementById("cardList"),
    feedback: document.getElementById("feedback"),
    progress: document.getElementById("ownedProgress"),
    totalValue: document.getElementById("totalValue"),
    artistSelect: document.getElementById("savedArtists"),
    loadBtn: document.getElementById("loadArtist"),
    saveBtn: document.getElementById("saveCollection"),
    deleteBtn: document.getElementById("deleteCollection"),
    lastUpdated: document.getElementById("lastUpdated"),
    refreshBtn: document.getElementById("refreshCollection"),
    ignoreAllBtn: document.getElementById("ignoreAllBtn"),
    sortDropdown: document.getElementById("sortBy"),
    groupBySet: document.getElementById("groupBySet"),
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
  updateProgress(ownedIds.length, cards.length);
  updateValueDisplay(calculateOwnedValue(cards, ownedIds));
}

export function getOwnedIdsFromDOM() {
  return [...document.querySelectorAll("input[data-id]:checked")].map(
    (cb) => cb.dataset.id
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
  const lastUpdatedEl = document.getElementById("lastUpdated");
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = `Last updated: ${
      updatedAt ? formatDate(updatedAt) : "N/A"
    }`;
  }

  const remaining = cards.filter((c) => !lastSearchedCards.includes(c));

  if (lastSearchedCards.length > 0) {
    const header = document.createElement("h4");
    header.textContent = "🔍 Recently Searched";
    container.appendChild(header);
    lastSearchedCards.forEach((card) =>
      renderCardItem(card, ownedIds, ignoredIds, container, siteMap)
    );
  }

  if (groupBy) {
    const grouped = groupBySet(remaining);
    for (const [setName, group] of Object.entries(grouped)) {
      const header = document.createElement("h4");
      header.textContent = `${setName} — ${
        formatDate(group[0]?.set?.releaseDate) || "Unknown"
      }`;
      container.appendChild(header);
      group
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((card) =>
          renderCardItem(card, ownedIds, ignoredIds, container, siteMap)
        );
    }
  } else {
    remaining.forEach((card) =>
      renderCardItem(card, ownedIds, ignoredIds, container, siteMap)
    );
  }
}

function renderCardItem(card, ownedIds, ignoredIds, container, siteMap) {
  const owned = ownedIds.includes(card.id);
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

  const details = document.createElement("div");
  details.className = "card-details";

  const title = document.createElement("strong");
  title.textContent = card.name;

  const number = document.createElement("span");
  number.className = "card-number";
  number.textContent = `#${card.number}/${card.set?.printedTotal ?? "?"}`;

  const searchBtn = document.createElement("button");
  searchBtn.className = "card-search-btn";
  searchBtn.textContent = "Search";

  ignoreBox.addEventListener("change", (e) => {
    li.style.opacity = e.target.checked ? "0.5" : "1";
  });

  searchBtn.addEventListener("click", () => {
    const siteKey = document.querySelector("#sharedSiteSelect")?.value;
    const url = buildSearchUrl(card, siteKey, siteMap);
    if (url) chrome.tabs.create({ url });
  });

  details.appendChild(title);
  details.appendChild(document.createElement("br"));
  details.appendChild(number);
  details.appendChild(searchBtn);

  row.appendChild(ownedBox);
  row.appendChild(ignoreBox);
  row.appendChild(img);
  row.appendChild(details);
  li.appendChild(row);

  container.appendChild(li);
}
