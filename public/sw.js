const FITNOW_CACHE = "fitnow-shell-v1";
const APP_SHELL = [
  "./",
  "./index.react.html",
  "./manifest.webmanifest",
  "./icons/fitnow-icon-192.png",
  "./icons/fitnow-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(FITNOW_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== FITNOW_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(FITNOW_CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match("./index.react.html"));
    })
  );
});
