/* My Shelf — service worker.
   Makes the app itself open with no connection. Your books were always offline
   (they live in IndexedDB); this caches the page, config and the supabase library
   so the app can start at all when you're offline.

   Deliberately never touches Supabase traffic — API and Storage requests always
   go to the network, so you can't be served a stale library. */
/* The build stamp arrives in this worker's own address (sw.js?v=…), put there
   by index.html from version.js. Naming the cache after it means every build
   gets a fresh cache and the old one is deleted on activate — stale files
   can't outlive the build they belonged to. */
const CACHE = "my-shelf-" + (new URL(self.location.href).searchParams.get("v") || "v2");
const SHELL = ["./", "./index.html", "./version.js", "./config.js", "./manifest.json", "./icon.svg", "./icon.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, {cache: "reload"})))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Never cache Supabase — login, data and images must always be live.
  if (url.hostname.endsWith("supabase.co")) return;

  // The supabase library from the CDN. The "@2" tag floats, so cached-forever would
  // pin one version for good — serve the cached copy for speed/offline, but refresh
  // it in the background so updates do land eventually. The photo-reader's language
  // files live on tessdata.projectnaptha.com and get the same treatment, so reading
  // a photo keeps working offline once it has worked online.
  if (url.hostname === "cdn.jsdelivr.net" || url.hostname === "tessdata.projectnaptha.com") {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Our own files: network-first so updates land as soon as you're online,
  // falling back to the cached copy (and then the app shell) when you're not.
  // "Not online" used to mean only a request that failed outright — a connection
  // that is present but crawling (one bar, train wifi) kept the app blank for as
  // long as the request took to die. Now the network gets 2.5 seconds to answer;
  // after that the saved copy opens the app, and the network's answer, whenever
  // it does arrive, still refreshes the cache so the next open is current.
  e.respondWith((async () => {
    const net = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    });
    const cached = await caches.match(req);
    if (!cached) return net.catch(() => caches.match("./index.html"));
    // A 404 or a 500 is an answer, and the race used to accept it as the winner —
    // so a hiccup at the host, or a request landing mid-deploy, showed you an error
    // page while a perfectly good copy of the app sat in the cache unused. Only a
    // real answer can beat the cache; anything else counts as no answer at all.
    const winner = await Promise.race([
      net.then(res => (res && res.ok) ? res : null).catch(() => null),
      new Promise(r => setTimeout(r, 2500, null))
    ]);
    return winner || cached;
  })());
});
