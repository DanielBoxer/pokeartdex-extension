import { loadCollections } from "./storage.js";

export function setupArtistDropdown(selectElement, options = {}) {
  function getSelectedArtist() {
    return selectElement.value;
  }

  function renderOption(value, label) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    return opt;
  }

  function populate() {
    loadCollections().then((collections) => {
      selectElement.innerHTML = "";
      selectElement.appendChild(renderOption("", "Unsaved collection"));

      const artists = Object.keys(collections);
      artists.forEach((artist) => {
        const count = collections[artist]?.cards?.length || 0;
        selectElement.appendChild(renderOption(artist, `${artist} (${count})`));
      });

      if (artists.length > 0) {
        selectElement.value = artists[0];
      }

      options.onLoaded?.(artists);
    });
  }

  selectElement.addEventListener("change", () => {
    options.onChange?.(selectElement.value);
  });

  populate();

  return { getSelectedArtist };
}
