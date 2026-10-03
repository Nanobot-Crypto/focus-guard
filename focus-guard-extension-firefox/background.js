const API = "http://localhost:37291/api/url";

async function checkUrl(tabId) {
  try {
    const tab = await browser.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith("about:") || tab.url.startsWith("moz-extension:")) return;
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: tab.url, title: tab.title || "" })
    });
  } catch {}
}

browser.tabs.onActivated.addListener(({ tabId }) => checkUrl(tabId));
browser.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === "complete" && tab.active) checkUrl(tabId);
});
