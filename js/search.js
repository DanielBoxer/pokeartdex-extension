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

export async function search({ artist, siteKey, maxTabs = 10, cards = null }) {
  if (!cards) {
    cards = await getCardsByArtist(artist);
  }

  const [collections, searchSites] = await Promise.all([
    loadCollections(),
    loadSearchSites(),
  ]);

  const baseUrl = searchSites[siteKey];
  if (!baseUrl) {
    console.warn(`Unknown site key: ${siteKey}`);
    return [];
  }

  const ownedIds = new Set(collections[artist]?.owned || []);
  previouslySearched[artist] ??= new Set();

  const unownedCards = cards.filter((c) => !ownedIds.has(c.id));
  const fresh = unownedCards.filter(
    (c) => !previouslySearched[artist].has(c.id)
  );

  let pool;
  if (fresh.length === 0) {
    previouslySearched[artist].clear();
    pool = unownedCards.slice();
  } else {
    pool = fresh;
  }

  const shuffled = pool.sort(() => Math.random() - 0.5);
  const tabsToOpen = shuffled.slice(0, maxTabs);

  for (const card of tabsToOpen) {
    previouslySearched[artist].add(card.id);
    const url = buildSearchUrl(card, siteKey, searchSites);
    if (url) chrome.tabs.create({ url });
  }

  return tabsToOpen;
}

export function buildSearchUrl(card, siteKey, siteMap) {
  const baseUrl = siteMap?.[siteKey];
  if (!baseUrl) {
    console.warn("Missing base URL for siteKey:", siteKey);
    return null;
  }

  const query = `${card.name} ${card.number}/${card.set?.printedTotal ?? ""}`;
  const fullUrl = baseUrl + encodeURIComponent(query);
  return fullUrl;
}
