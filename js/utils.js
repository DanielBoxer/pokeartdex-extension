export function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleString();
}

export function groupBy(array, fn) {
  return array.reduce((acc, item) => {
    const key = fn(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function calculateOwnedValue(cards, ownedIds) {
  return cards.reduce((sum, card) => {
    if (!ownedIds.includes(card.id)) return sum;
    const price = card.tcgplayer?.prices?.holofoil?.mid ?? 0;
    return sum + price;
  }, 0);
}

function getMarketPrice(card) {
  const prices = card.tcgplayer?.prices || {};
  for (const p of Object.values(prices)) {
    if (p.market || p.mid || p.low || p.high) {
      return p.market ?? p.mid ?? p.low ?? p.high;
    }
  }
  return 0;
}

export const sortOptions = {
  "name-asc": (a, b) => a.name.localeCompare(b.name),
  "name-desc": (a, b) => b.name.localeCompare(a.name),
  "price-low": (a, b) => getMarketPrice(a) - getMarketPrice(b),
  "price-high": (a, b) => getMarketPrice(b) - getMarketPrice(a),
  "date-new": (a, b) =>
    new Date(b.set?.releaseDate || 0) - new Date(a.set?.releaseDate || 0),
  "date-old": (a, b) =>
    new Date(a.set?.releaseDate || 0) - new Date(b.set?.releaseDate || 0),
};
