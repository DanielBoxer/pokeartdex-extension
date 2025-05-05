import { saveCollection, deleteCollection } from "./storage.js";
import {
  updateFeedback,
  clearCollectionDisplay,
  updateProgressAndValue,
} from "./cardDisplay.js";

export function initCollectionManager({
  artistInput,
  cardList,
  onCollectionLoaded,
  withSaveDeleteButtons = true,
  saveButton,
  deleteButton,
}) {
  if (withSaveDeleteButtons) {
    saveButton?.addEventListener("click", () => {
      const owned = [
        ...cardList.querySelectorAll("input[data-id]:checked"),
      ].map((cb) => cb.dataset.id);

      const ignored = [
        ...cardList.querySelectorAll("input[data-ignore-id]:checked"),
      ].map((cb) => cb.dataset.ignoreId);

      const artist = artistInput.value.trim();
      const cards = onCollectionLoaded.getCurrentCards?.() || [];

      if (
        artist &&
        confirm(
          `Save collection for "${artist}" with ${owned.length} owned and ${ignored.length} ignored cards?`
        )
      ) {
        saveCollection(artist, { cards, owned, ignored }).then(() => {
          updateFeedback(`Saved collection for "${artist}".`);
          updateProgressAndValue(cards, owned);
        });
      }
    });

    deleteButton?.addEventListener("click", () => {
      const artist = artistInput.value.trim();
      if (artist && confirm(`Delete saved collection for "${artist}"?`)) {
        deleteCollection(artist).then(() => {
          updateFeedback(`Deleted collection for "${artist}".`);
          clearCollectionDisplay(elements);
        });
      }
    });
  }
}
