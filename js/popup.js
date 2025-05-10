import { createSearchControls } from "./searchControls.js";
import { setupArtistDropdown } from "./artistDropdown.js";

document.getElementById("openManager").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("html/cards.html") }, () => {
    // close the popup after opening manager
    window.close();
  });
});

const controlsWrapper = document.getElementById("controlsWrapper");
const savedArtistsSelect = document.getElementById("savedArtists");

const { getSelectedArtist } = setupArtistDropdown(savedArtistsSelect, {
  onLoaded: (artists) => {
    if (artists.length === 0) {
      controlsWrapper.style.display = "none";
    } else {
      controlsWrapper.style.display = "block";

      createSearchControls(document.getElementById("externalSearchControls"), {
        artist: getSelectedArtist,
      });
    }
  },
});
