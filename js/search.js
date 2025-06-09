import { loadCollections, loadApiKey, loadSearchSites } from "./storage.js";

const previouslySearched = {};

export async function getCardsByArtist(artist) {
  const baseUrl = "https://api.pokemontcg.io/v2";
  const cardsEndpoint = `${baseUrl}/cards`;
  const apiKey = await loadApiKey();

  const query = `artist:"${artist}"`;
  const params = new URLSearchParams({
    q: query,
    pageSize: "250",
    select: "id,name,number,images,set,tcgplayer",
  });

  const url = `${cardsEndpoint}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { "X-Api-Key": apiKey },
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();

  if (!Array.isArray(data.data)) throw new Error("Invalid response");
  return data.data;
}

function formatCardNumber(card) {
  const total = card.set?.printedTotal ?? "";
  const isNumeric = /^\d+$/.test(card.number);

  // promos don't need the set total
  if (isNumeric && total) {
    const padded = String(card.number).padStart(String(total).length, "0");
    return `${padded}/${total}`;
  }

  return card.number;
}

async function getSearchPool({ artist, siteKey, filterOptions = {} }) {
  const {
    cards = null,
    maxTabs = Infinity,
    ownedIds = [],
    ignoredIds = [],
  } = filterOptions;

  const cardList = cards || (await getCardsByArtist(artist));

  const [collections, searchSites] = await Promise.all([
    loadCollections(),
    loadSearchSites(),
  ]);

  const baseUrl = searchSites[siteKey];
  if (!baseUrl) {
    console.warn(`Unknown site key: ${siteKey}`);
    return { cards: [], siteMap: searchSites };
  }

  const ownedSet = new Set(ownedIds);
  const ignoredSet = new Set(ignoredIds);

  previouslySearched[artist] ??= new Set();

  const pool = cardList
    .filter((c) => !ownedSet.has(c.id))
    .filter((c) => !ignoredSet.has(c.id))
    .filter((c) => !previouslySearched[artist].has(c.id));

  const fallbackPool = cardList
    .filter((c) => !ownedSet.has(c.id))
    .filter((c) => !ignoredSet.has(c.id));

  const finalPool = pool.length > 0 ? pool : fallbackPool;
  const shuffled = finalPool.sort(() => Math.random() - 0.5);
  const cardsToUse = shuffled.slice(0, maxTabs);

  cardsToUse.forEach((card) => previouslySearched[artist].add(card.id));

  return { cards: cardsToUse, siteMap: searchSites };
}

export async function search({
  artist,
  siteKey,
  cards,
  ownedIds = [],
  ignoredIds = [],
  maxTabs = 10,
}) {
  const { cards: cardsToOpen, siteMap } = await getSearchPool({
    artist,
    siteKey,
    filterOptions: { cards, ownedIds, ignoredIds, maxTabs },
  });

  for (const card of cardsToOpen) {
    const url = buildSearchUrl(card, siteKey, siteMap);
    if (url) chrome.tabs.create({ url });
  }

  return cardsToOpen;
}

function sendCardPoolToStockAddon(
  cardPool,
  { holoOnly = true, onProgress, onComplete }
) {
  const STOCK_CHECK_ADDON_ID = "{584ef28a-3339-460d-b62e-9f5d77130bda}";

  const progressListener = (message, sender) => {
    if (sender.id !== STOCK_CHECK_ADDON_ID) return;

    if (message.type === "stock-progress") {
      onProgress?.(message);
    }

    if (message.type === "stock-complete") {
      onComplete?.(message);
      chrome.runtime.onMessageExternal.removeListener(progressListener);
    }
  };

  chrome.runtime.onMessageExternal.addListener(progressListener);

  chrome.runtime.sendMessage(
    STOCK_CHECK_ADDON_ID,
    {
      type: "check-stock",
      cards: cardPool,
      holoOnly,
    },
    (response) => {
      chrome.runtime.onMessage.removeListener(progressListener);

      if (chrome.runtime.lastError) {
        alert("PokeArtDex Stock Addon not installed");
        return;
      }

      if (onComplete) onComplete(response);
    }
  );

  return () => {
    chrome.runtime.sendMessage(STOCK_CHECK_ADDON_ID, {
      type: "cancel-stock-check",
    });

    chrome.runtime.onMessageExternal.removeListener(progressListener);
  };
}

export async function searchInStock({
  artist,
  siteKey,
  cards,
  ownedIds = [],
  ignoredIds = [],
  holoOnly = true,
  onProgress = null,
  onComplete = null,
}) {
  const { cards: cardsToOpen, siteMap } = await getSearchPool({
    artist,
    siteKey,
    filterOptions: { cards, ownedIds, ignoredIds },
  });

  const cardPool = cardsToOpen.map((card) => ({
    id: card.id,
    url: buildSearchUrl(card, siteKey, siteMap),
    cardName: card.name,
    searchNumber: formatCardNumber(card),
  }));

  let resolveLater;
  const result = new Promise((resolve) => {
    resolveLater = resolve;
  });

  const cancel = sendCardPoolToStockAddon(cardPool, {
    holoOnly,
    onProgress,
    onComplete: (response) => {
      onComplete?.(response);
      resolveLater({
        cards: cardPool,
        cancel,
        inStock: response.inStock,
      });
    },
  });

  return {
    cancel,
    total: cardPool.length,
    result,
  };
}

export function buildSearchUrl(card, siteKey, siteMap) {
  const baseUrl = siteMap?.[siteKey];
  if (!baseUrl) {
    console.warn("Missing base URL for siteKey:", siteKey);
    return null;
  }

  const query = `${card.name} ${formatCardNumber(card)} ${card.set.name}`;
  const fullUrl = baseUrl + encodeURIComponent(query);
  return fullUrl;
}
