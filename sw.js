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
/* Where a shared file waits between the share sheet handing it over and the app
   opening to collect it. Its own cache, so the build-stamped one can be thrown
   away on every update without losing a file that is mid-journey. */
const SHARE = "my-shelf-share";
const SHARED_KEY = "shared-backup";
/* a share with no file in it — a line selected in a reader, a link to a
   book's page — is kept here as JSON and the app is sent on with ?shared=t */
const SHARED_TEXT_KEY = "shared-text";

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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== SHARE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ---- a file shared to the app from somewhere else ----
   Android hands the file to a POST, which no page can read on the way past, so
   the worker takes it, puts it down in a cache of its own, and sends the
   browser on to the app with a flag. The app collects it on arrival. Sharing a
   ReadEra backup this way saves walking down to Internal storage → ReadEra →
   Backups by hand, which is the whole point.
   The redirect must be an absolute address and a 303, so the browser turns the
   POST into a GET rather than asking to re-send it. */
self.addEventListener("fetch", e => {
  const req = e.request;

  if (req.method === "POST" && new URL(req.url).pathname.endsWith("/share-target")) {
    e.respondWith((async () => {
      let ok = 0;
      try {
        const form = await req.formData();
        const file = form.get("file");
        /* Android hands a shared LINE of text over as a small text file when
           the target takes files — measured on the phone: "know what…" arrived
           as a file and was read as a backup. Words are words. */
        const isWords = file && file.size && file.size < 20000 && /^text\/plain/i.test(file.type || "");
        if (isWords) {
          const text = await file.text();
          const c = await caches.open(SHARE);
          await c.put(SHARED_TEXT_KEY, new Response(JSON.stringify({ title: "", text, url: "", at: Date.now() }), {
            headers: { "content-type": "application/json" }
          }));
          ok = "t";
        } else if (file && file.size) {
          const c = await caches.open(SHARE);
          await c.put(SHARED_KEY, new Response(file, {
            headers: { "content-type": file.type || "application/octet-stream",
                       "x-shared-name": encodeURIComponent(file.name || "shared") }
          }));
          ok = 1;
        } else {
          const title = String(form.get("title") || ""), text = String(form.get("text") || ""), url = String(form.get("url") || "");
          if ((title + text + url).trim()) {
            const c = await caches.open(SHARE);
            await c.put(SHARED_TEXT_KEY, new Response(JSON.stringify({ title, text, url, at: Date.now() }), {
              headers: { "content-type": "application/json" }
            }));
            ok = "t";
          }
        }
      } catch (err) { ok = 0; }
      return Response.redirect(new URL("./?shared=" + ok, self.registration.scope).href, 303);
    })());
    return;
  }

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
  // unpkg.com is the fallback home for the same libraries, tried when jsdelivr
  // is blocked or unreachable on a device — whichever one answered gets kept.
  if (url.hostname === "cdn.jsdelivr.net" || url.hostname === "unpkg.com" || url.hostname === "tessdata.projectnaptha.com") {
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
  // Cache under the address without its query, and look it up the same way. The
  // layout check loads index.html ten times a sweep with a different ?devcheck=
  // stamp each time, and every one of those was kept as its own three-quarters
  // of a megabyte until the next build cleared the cache. None of our own files
  // mean anything different for having a query on the end.
  const key = url.origin + url.pathname;
  e.respondWith((async () => {
    const net = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return res;
    });
    const cached = await caches.match(key);
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
