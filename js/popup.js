import { createSearchControls } from "./searchControls.js";
import { setupArtistDropdown } from "./artistDropdown.js";

document.getElementById("openManager").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("html/cards.html") }, () => {
    // close the popup after opening manager
    window.close();
  });
});

const { getSelectedArtist } = setupArtistDropdown(
  document.getElementById("savedArtists")
);

createSearchControls(document.getElementById("externalSearchControls"), {
  artist: getSelectedArtist,
});
