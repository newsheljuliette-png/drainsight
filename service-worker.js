
const CACHE_NAME = "drainsight-v1";
const APP_PATH = "/drainsight/";

const FILES_TO_CACHE = [
  APP_PATH,
  APP_PATH + "index.html",
  APP_PATH + "manifest.webmanifest",
  APP_PATH + "icon-192.png",
  APP_PATH + "icon-512.png"
];

// Save basic app files for offline access
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Remove old cached versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Use the network first, then cached app pages
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle local GET requests
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(APP_PATH)
  ) {
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
