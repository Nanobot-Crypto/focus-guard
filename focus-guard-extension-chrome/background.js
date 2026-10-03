const API = "http://localhost:37291/api/url";

async function checkUrl(tabId) {
  console.log("[FocusGuard] checkUrl called for tab", tabId);
  try {
    const tab = await chrome.tabs.get(tabId);
    console.log("[FocusGuard] tab url:", tab.url, "title:", tab.title);
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("about:")) return;
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: tab.url, title: tab.title || "" })
    });
    const data = await res.json();
    console.log("[FocusGuard] response:", data);
  } catch (e) {
    console.error("[FocusGuard] error:", e);
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  console.log("[FocusGuard] onActivated fired", tabId);
  checkUrl(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  console.log("[FocusGuard] onUpdated fired", tabId, info.status);
  if (info.status === "complete" && tab.active) checkUrl(tabId);
});

console.log("[FocusGuard] background script loaded");

// Keep-alive: evita que el service worker se duerma y pierda eventos
chrome.alarms.create("keepAlive", { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive") {
    // No-op, solo mantiene el worker activo
  }
});
