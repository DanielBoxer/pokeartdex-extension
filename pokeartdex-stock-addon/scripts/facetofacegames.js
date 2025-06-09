export default function checkStock(message) {
  const { searchNumber, cardName } = message;

  try {
    const cards = document.querySelectorAll(`.bb-card-title`);
    if (!cards.length) return [];

    const results = [];
    for (const cardTitleElement of cards) {
      const titleText = cardTitleElement.querySelector("a").textContent;
      if (!(titleText.includes(cardName) && titleText.includes(searchNumber))) {
        // wrong card
        continue;
      }

      const parent = cardTitleElement.parentElement;
      const cardMetafieldsElement = parent.querySelector(".bb-card-metafields");

      const reverseHoloDiv = cardMetafieldsElement.querySelector(
        '[data-label="Reverse Holo"]'
      );
      const holoDiv = cardMetafieldsElement.querySelector(
        '[data-label="Holo"]'
      );

      const vendorGroup = parent.querySelector(".bb-card-vendor-group");
      const inventoryElem = vendorGroup?.querySelector(".bb-card-inventory");
      const isOutOfStock = inventoryElem?.textContent.includes("Out of stock");

      results.push({
        isHolo: !!(reverseHoloDiv || holoDiv),
        isOutOfStock,
      });
    }

    return results;
  } catch (error) {
    console.error("Error in checkStock:", error);
    return [];
  }
}
