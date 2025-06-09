import checkStockF2F from "./scripts/facetofacegames.js";
import checkStock401 from "./scripts/401games.js";

const POKEARTDEX_EXTENSION_ID = "{bf5d6795-8427-4434-8b2d-30d9a8080ef5}";
let currentStockCheck = null;

chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (sender.id !== POKEARTDEX_EXTENSION_ID) return;

    if (message.type === "check-stock") {
      currentStockCheck?.cancel?.();

      const cards = message.cards ?? [];
      const holoOnly = message.holoOnly ?? true;

      currentStockCheck = checkStockPool(cards, holoOnly, (progress) => {
        chrome.runtime.sendMessage(POKEARTDEX_EXTENSION_ID, {
          type: "stock-progress",
          checked: progress.checked,
          total: cards.length,
        });
      });

      currentStockCheck.promise.then((inStockResults) => {
        sendResponse({ inStock: inStockResults });
      });

      return true;
    }

    if (message.type === "cancel-stock-check") {
      currentStockCheck?.cancel();
    }
  }
);

function checkStockPool(
  cards,
  holoOnly = true,
  onProgress,
  maxTabsAtOnce = 10
) {
  let cancelled = false;
  const results = [];
  const queue = [...cards];
  const active = new Set();
  let checked = 0;

  const cancel = () => {
    cancelled = true;
    active.clear();
  };

  const promise = new Promise((resolve) => {
    let completed = 0;

    async function spawnNext() {
      if (cancelled || queue.length === 0) return;

      const card = queue.shift();
      const task = checkSingleCard(card, holoOnly).then((res) => {
        checked++;
        completed++;
        onProgress({ checked });

        if (cancelled) return;

        if (res) results.push(res);

        if (completed === cards.length) {
          chrome.runtime.sendMessage(POKEARTDEX_EXTENSION_ID, {
            type: "stock-complete",
            total: cards.length,
          });
          resolve(results);
        } else {
          spawnNext();
        }
      });

      active.add(task);
    }

    const initial = Math.min(maxTabsAtOnce, queue.length);
    for (let i = 0; i < initial; i++) spawnNext();
  });

  return { promise, cancel };
}

function checkSingleCard(card, holoOnly) {
  return new Promise((resolve) => {
    const domain = new URL(card.url).hostname;
    let stockCheckFn = null;

    if (domain.includes("facetofacegames.com")) {
      stockCheckFn = checkStockF2F;
    } else if (domain.includes("401games.ca")) {
      stockCheckFn = checkStock401;
    } else {
      return resolve(null);
    }

    openTabAndCheckStock(card, stockCheckFn, holoOnly, resolve);
  });
}

function openTabAndCheckStock(card, stockCheckFn, holoOnly, onComplete) {
  chrome.tabs.create({ url: card.url, active: false }, (tab) => {
    if (!tab?.id) return onComplete(null);
    const tabId = tab.id;

    chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
      if (updatedTabId !== tabId || info.status !== "complete") return;

      chrome.tabs.onUpdated.removeListener(listener);
      setTimeout(() => {
        runStockCheckScript(tabId, card, stockCheckFn, holoOnly, onComplete);
      }, 1000);
    });
  });
}

function runStockCheckScript(tabId, card, stockCheckFn, holoOnly, onComplete) {
  chrome.scripting.executeScript(
    {
      target: { tabId },
      func: stockCheckFn,
      args: [
        {
          cardName: card.cardName,
          searchNumber: card.searchNumber,
        },
      ],
    },
    (results) => {
      try {
        const result = results?.[0]?.result;
        if (!Array.isArray(result)) throw new Error("Invalid result");

        const valid = result.every(
          (r) =>
            typeof r.isHolo === "boolean" && typeof r.isOutOfStock === "boolean"
        );
        if (!valid) throw new Error("Invalid result format");

        const match = holoOnly
          ? result.some((r) => !r.isOutOfStock && r.isHolo)
          : result.some((r) => !r.isOutOfStock);

        if (match) {
          onComplete({ ...card, result });
        } else {
          chrome.tabs.remove(tabId);
          onComplete(null);
        }
      } catch {
        chrome.tabs.remove(tabId);
        onComplete(null);
      }
    }
  );
}
