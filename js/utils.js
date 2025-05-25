export function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleDateString();
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
    if (!ownedIds.has(card.id)) return sum;
    return sum + getMarketPrice(card);
  }, 0);
}

export function getMarketPrice(card) {
  const prices = card.tcgplayer?.prices || {};
  for (const p of Object.values(prices)) {
    if (p.market || p.mid || p.low || p.high) {
      return p.market ?? p.mid ?? p.low ?? p.high;
    }
  }
  return 0;
}

export function capitalizeName(name) {
  return name
    .split(" ")
    .map((word) =>
      word.length > 1
        ? word[0].toUpperCase() + word.slice(1).toLowerCase()
        : word.toUpperCase()
    )
    .join(" ");
}

export function totalPrice(cards) {
  return cards.reduce((sum, c) => sum + getMarketPrice(c), 0);
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
