// Nhà mình: service worker (cài như app + nhận thông báo).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch {}
  const call = d.kind === "call";
  e.waitUntil(self.registration.showNotification(d.title || "Nhà mình", {
    body: d.body || "Có tin mới",
    icon: "icon.svg",
    tag: call ? "call" : "msg", renotify: true, requireInteraction: call,
    vibrate: call ? [500, 200, 500, 200, 500] : [150],
    data: { url: self.registration.scope },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.startsWith(url) && "focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
