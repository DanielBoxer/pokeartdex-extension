export default function checkStock(message) {
  const { searchNumber, cardName } = message;

  try {
    const host = document.getElementById("fast-simon-serp-app");
    if (!host) return [];

    const shadow = host.shadowRoot;
    if (!shadow) return [];

    const cards = shadow.querySelectorAll(".product-card");
    if (!cards.length) return [];

    const results = [];
    for (const card of Array.from(cards).slice(0, 5)) {
      const titleElem = card.querySelector(".fs-product-title");
      if (!titleElem) continue;

      const titleText = titleElem.textContent;
      if (!(titleText.includes(cardName) && titleText.includes(searchNumber))) {
        continue;
      }

      const isHolo = titleText.includes("Holo");
      const isOutOfStock = !!card?.querySelector(".out-of-stock");

      results.push({ isHolo, isOutOfStock });
    }

    return results;
  } catch (error) {
    console.error("Error in checkStock:", error);
    return [];
  }
}
