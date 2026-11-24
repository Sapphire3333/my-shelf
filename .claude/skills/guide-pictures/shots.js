/* The guide's pictures: what each one shows, and the things its numbered
   lines point at. shoot.py runs this in a fresh page of the app
   (index.html?db=smoke, its own throwaway database) for every picture and
   both devices, then calls __guideShot(name).

   A SHOT is { at(dev) → {clip, spots} }, async, run after the shelf below is
   seeded and the screen is drawn:
     clip   the element (or a list of them) the picture is cut around, or a
            rect {x,y,w,h} in the window's pixels; pad() widens it
     spots  {key: element} — the things a page's numbered lines can point at.
            A page names the keys it wants (GUIDE in index.html), so one
            picture of a menu serves every item on it.
   Everything on the shelf is invented. Nothing here may ever name a real
   book, author, song or anything off the owner's own shelf. */
(() => {
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = (s, root) => (root || document).querySelector(s);
const until = async (f, ms = 4000) => { const t = Date.now(); let v; while (!(v = f()) && Date.now() - t < ms) await wait(60); return v; };
const $$ = (s, root) => [...(root || document).querySelectorAll(s)];
/* the bottom of whatever stays stuck at the top of the window (the tab bar
   once the page has scrolled), and the top of whatever is fixed at its foot
   (a phone's tab bar): a picture is cut between the two */
const pinned = (y, pick) => { let v = null;
  for (const x of [innerWidth * .2, innerWidth * .5, innerWidth * .8])
    for (const e of document.elementsFromPoint(x, y))
      for (let a = e; a && a !== document.documentElement; a = a.parentElement) {
        const p = getComputedStyle(a).position;
        if (p === "sticky" || p === "fixed") { const r = a.getBoundingClientRect(); v = v == null ? pick(r) : (pick === top ? Math.max(v, pick(r)) : Math.min(v, pick(r))); break; } }
  return v; };
function top(r) { return r.bottom; }
function foot(r) { return r.top; }
const stuckTop = () => scrollY > 0 ? (pinned(3, top) || 0) : 0;
const stuckFoot = () => { const v = pinned(innerHeight - 3, foot); return v == null || v < innerHeight / 2 ? innerHeight : v; };
/* scroll so the thing stands just under what is stuck at the top */
const place = async (el, gap = 14) => { el.scrollIntoView({ block: "start" }); await wait(200); window.scrollBy(0, -(stuckTop() + gap)); await wait(400); };
const need = (s, root) => { const e = $(s, root); if (!e) throw new Error("not on the screen: " + s); return e; };

/* ---- the made-up shelf ---- */
const T = [
  ["The Lantern Keeper", "Mira Vantwell", "reading", ["Fantasy"], 412, 9],
  ["Salt and Meridian", "Oskar Dellamere", "finished", ["Literary fiction"], 288, 8],
  ["A Harbour of Small Lights", "Ines Kowalczyk", "want", ["Romance"], 344],
  ["The Orchard Cipher", "Tobias Rennick", "finished", ["Mystery"], 376, 7],
  ["Ember Road", "Hollis Graye", "want", ["Science fiction"], 502],
  ["Willow, Winter", "Ada Brennagh", "finished", ["Literary fiction"], 198, 10],
  ["The Cinder Atlas", "Mira Vantwell", "want", ["Fantasy"], 455],
  ["Quill and Marrow", "Pell Ashby", "reading", ["Horror"], 310],
  ["Night Trains to Nowhere", "Corin Sallow", "finished", ["Travel"], 264, 6],
  ["The Hollow Tide", "Hollis Graye", "want", ["Science fiction"], 390],
  ["Paper Moons", "Lio Marchetti", "finished", ["Poetry"], 112, 8],
  ["A Field Guide to Quiet", "Ada Brennagh", "want", ["Nonfiction"], 240],
];
window.__guideSeed = async (dev) => {
  const au = $("#auLocal");
  if (au) { au.click(); await wait(900); }
  /* in memory only, like the sweep's stand-ins: nothing calls a save */
  settings.fontScale = dev === "ph" ? 132 : 135;
  settings.scrap = false; settings.bookEdit = false;
  settings.sfx = false;
  books.length = 0;
  T.forEach((r, i) => {
    const [title, author, status, gs, pages, rating] = r;
    gs.forEach(g => { if (!genres[g]) genres[g] = genreColor(g); });
    const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
    books.push(Object.assign(blankBook("guide-b" + i), {
      title, author, status, genres: gs, pages, rating: rating || "",
      progress: status === "reading" ? Math.round(pages * (i ? .62 : .34)) : 0,
      summary: "An invented blurb for a book that does not exist, long enough to wrap over two or three lines on a phone.",
      ...(i === 6 || i === 0 ? { series: "The Lantern Cycle", seriesNum: i ? "2" : "1", seriesTotal: "3" } : {}),
      readings: status === "finished" ? [{ id: "gr" + i, start: day(60 + i * 9), end: day(40 + i * 9) }]
        : status === "reading" ? [{ id: "gr" + i, start: day(6 + i), end: "", open: true }] : [],
      created: Date.now() - (i + 1) * 3 * 864e5, modified: Date.now() - i * 864e5,
    }));
  });
  applyLook();
  await wait(300);
};

/* the clip around some elements, widened by pad on each side and kept in
   the window */
const box = (els, pad = 16, extra = {}) => {
  const rs = [].concat(els).filter(Boolean).map(e => e.getBoundingClientRect ? e.getBoundingClientRect() : e);
  let x0 = Math.min(...rs.map(r => r.left ?? r.x)), y0 = Math.min(...rs.map(r => r.top ?? r.y));
  let x1 = Math.max(...rs.map(r => (r.right ?? (r.x + r.w)))), y1 = Math.max(...rs.map(r => (r.bottom ?? (r.y + r.h))));
  x0 -= (extra.left ?? pad); y0 -= (extra.top ?? pad); x1 += (extra.right ?? pad); y1 += (extra.bottom ?? pad);
  x0 = Math.max(0, x0); y0 = Math.max(stuckTop(), y0);
  x1 = Math.min(innerWidth, x1); y1 = Math.min(stuckFoot(), y1);
  return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
};

const SHOTS = {};
window.__guideShots = SHOTS;

/* ＋ Add book with its menu open, over the Library */
SHOTS["add-menu"] = { async at(dev) {
  await goTab("library"); window.scrollTo(0, 0); await wait(500);
  const btn = need("#addBook");
  btn.click(); await wait(350);
  const m = await until(() => { const x = $("#addMenu"); return x && !x.hidden && x; });
  if (!m) throw new Error("the ＋ Add book menu did not open");
  const it = k => need(`#addMenu [data-add="${k}"]`);
  const r = m.getBoundingClientRect(), b = btn.getBoundingClientRect();
  const clip = dev === "ph"
    ? box([btn, m], 10, { left: 400 })
    : box([btn, m], 24, { left: 330, bottom: 20 });
  return { clip, spots: { btn, blank: it("blank"), text: it("text"), isbn: it("isbn"), series: it("series"), mdex: it("mangadex") } };
} };

/* a new AI story's page: the kind set to 🤖 AI story, and 💬 Bring in a chat… */
SHOTS["ai-editor"] = { async at(dev) {
  await openBook(uid(), true); await wait(800);
  /* the kind of book is under ▸ 📗 The book itself, folded on a new book */
  const fold = [...document.querySelectorAll("#edPage .edsechead")].find(b => /The book itself/.test(b.textContent));
  if (!fold) throw new Error("no ▸ 📗 The book itself on a new book's page");
  if (fold.getAttribute("aria-expanded") !== "true") { fold.click(); await wait(500); }
  need('#kindRow [data-kind="ai"]').click(); await wait(600);
  /* ticking it draws the row again: find it afresh */
  const ai = need('#kindRow [data-kind="ai"]').closest("label") || need('#kindRow [data-kind="ai"]');
  const chat = await until(() => $("#chatIn"));
  if (!chat) throw new Error("💬 Bring in a chat… did not show for an AI story");
  fold.scrollIntoView({ block: "start" }); window.scrollBy(0, -16); await wait(400);
  const f = fold.getBoundingClientRect(), c = chat.getBoundingClientRect(), sec = need("#edsec-book").getBoundingClientRect();
  const clip = box({ x: Math.min(f.left, sec.left), y: f.top, w: Math.max(f.right, sec.right) - Math.min(f.left, sec.left), h: c.bottom - f.top }, dev === "ph" ? 8 : 16);
  if (dev !== "ph") clip.w = Math.min(clip.w, 900);
  return { clip, spots: { fold, kindAi: ai, chatIn: chat } };
} };

/* make claudeReady() true without a real sign-in. shoot.py blocks every
   request to the sync server, so nothing is ever sent with it */
const signedIn = () => { if (!SYNC.supa) SYNC.supa = {}; SYNC.user = { id: "guide-shots", email: "" }; };
const QUEUE = [
  ["Moth and Lantern", "Ines Kowalczyk", "finished"], ["The Glass Orchard", "Tobias Rennick", "finished"],
  ["Ember Road", "Hollis Graye", "want"], ["A Year of Small Boats", "Corin Sallow", "want"],
  ["Six Winters North", "Ada Brennagh", "want"], ["The Salt Ledger", "Oskar Dellamere", "reading"],
];
const seedQueue = () => {
  importQueue.length = 0;
  QUEUE.forEach(([title, author, status], i) => importQueue.push({ id: "gq" + i, title, author, status, pages: 200 + i * 41 }));
  if (typeof markDupes === "function") markDupes();
};
const careAt = async () => {
  await goTab("care"); await wait(400);
  const csv = await until(() => $("#csvBtn"), 6000);
  if (!csv) throw new Error("Shelf care's import card did not draw");
  return csv;
};

/* 🧰 Shelf care's import card */
SHOTS["care-import"] = { async at(dev) {
  signedIn(); seedQueue();
  const csv = await careAt();
  const sec = csv.closest(".sec"), head = $(".heading", sec);
  await place(head);
  const btns = ["#csvBtn", "#impPhoto", "#impPaste", "#impShop", "#impFicDir", "#ao3Mark", "#pageMark", "#chatMark"].map(x => $(x, sec)).filter(Boolean);
  const r = head.getBoundingClientRect(), s = sec.getBoundingClientRect();
  const bottom = Math.max(...btns.map(b => b.getBoundingClientRect().bottom));
  const clip = box({ x: s.left, y: r.top, w: s.width, h: bottom - r.top }, dev === "ph" ? 6 : 14);
  return { clip, spots: { csv, photo: $("#impPhoto"), paste: $("#impPaste"), ficdir: $("#impFicDir"), ao3: $("#ao3Mark") } };
} };

/* the import list, with rows waiting */
SHOTS["import-list"] = { async at(dev) {
  seedQueue();
  books.push(Object.assign(blankBook("guide-dup"), { title: "Ember Road", author: "Hollis Graye", status: "want" }));
  if (typeof markDupes === "function") markDupes();
  await careAt();
  if (typeof refreshImport === "function") refreshImport();
  await wait(500);
  const list = need("#impList");
  await place(list);
  const one = $("[data-impone]", list), tick = $("[data-imptick]", list), all = $("[data-impall]", list), fill = $("[data-impfill]", list);
  const l = list.getBoundingClientRect();
  const clip = box({ x: l.left, y: l.top, w: l.width, h: Math.min(l.height, innerHeight - l.top - 4, dev === "ph" ? 780 : 640) }, dev === "ph" ? 6 : 12);
  return { clip, spots: { one, tick, all, fill } };
} };

/* the ReadEra card on 🧰 Shelf care */
SHOTS["care-readera"] = { async at(dev) {
  await careAt();
  const re = need("#reBtn"), sec = re.closest(".sec");
  await place(sec);
  return { clip: box(sec, dev === "ph" ? 6 : 14), spots: { re } };
} };

/* Library → ☁ Drive, with files in a folder and some just arrived. Drive
   itself is never asked: the list is put in place of what it would say */
SHOTS["drive-tab"] = { async at(dev) {
  const fo = { id: "gdf0", name: "Books" };
  settings.drive = Object.assign({}, settings.drive || {}, { folder: fo });
  const F = [
    { id: "gdx1", name: "Mira Vantwell - The Cinder Atlas.epub", p: "gdf0", size: 812345, kind: "epub" },
    { id: "gdx2", name: "Hollis Graye - The Hollow Tide.epub", p: "gdf0", size: 1203456, kind: "epub" },
    { id: "gdx3", name: "Lio Marchetti - Paper Moons.pdf", p: "gdf0", size: 2304567, kind: "pdf" },
    { id: "gdx4", name: "Pell Ashby - The Lamplighter's Debt.epub", p: "gdf1", size: 654321, kind: "epub" },
    { id: "gdx5", name: "A Quiet Kind of Weather.html", p: "gdf2", size: 98765, kind: "html" },
  ];
  drvFilesMemo = { at: Date.now() - 2 * 3600e3, dirs: [{ id: "gdf1", name: "New", p: "gdf0" }, { id: "gdf2", name: "Fics", p: "gdf0" }] };
  drvFolderFiles = async () => F;
  drvKeptRows = async () => {};
  drvLoadGis = async () => {};
  drvNewList = () => [
    { k: "new", f: F[3], meta: { title: "The Lamplighter's Debt", author: "Pell Ashby" } },
    { k: "fic", f: F[4] },
  ];
  await goTab("library"); await wait(300);
  setKindTab("drive"); await wait(900);
  const tab = $('[data-kt="drive"]'), nb = await until(() => $("#dsNew"), 4000), rd = $("[data-dsread]");
  const want = nb && $("[data-dnbring]", nb), fic = nb && $$("[data-dnbring]", nb)[1];
  const top = tab || nb;
  top.scrollIntoView({ block: "start" }); window.scrollBy(0, -16); await wait(400);
  const els = [tab, nb, rd].filter(Boolean);
  const clip = box(els, dev === "ph" ? 6 : 16);
  clip.h = Math.min(clip.h, dev === "ph" ? 800 : 900);
  return { clip, spots: { tab, want, fic, read: rd } };
} };

/* Library → 🧰 Tools: 🧭 Like your favourites and 🔎 Is the next one out? */
SHOTS["lib-tools"] = { async at(dev) {
  signedIn();
  simFav = { "guide-b5": { at: Date.now(), by: "Claude Code", mark: 10, rows: [
    { t: "The Winter Almanac", a: "Ruth Elsworthy", ser: "", why: "" },
    { t: "Lanterns Over the Harbour", a: "Ines Kowalczyk", ser: "", why: "" },
    { t: "A Map of Quiet Rooms", a: "Ada Brennagh", ser: "", why: "" }] } };
  settings.libBench = true;
  await goTab("library"); await wait(600);
  const tog = need("#benchTog");
  if (tog.getAttribute("aria-expanded") !== "true") { tog.click(); await wait(400); }
  const sf = await until(() => $("[data-simfavopen]")), nx = $("[data-nxopen]");
  if (!sf) throw new Error("🧭 Like your favourites did not show in 🧰 Tools");
  tog.scrollIntoView({ block: "center" }); await wait(300);
  const clip = box([tog, sf, nx].filter(Boolean), dev === "ph" ? 8 : 18, { left: dev === "ph" ? 8 : 40, right: dev === "ph" ? 8 : 40 });
  return { clip, spots: { tools: tog, simfav: sf, nextout: nx } };
} };

/* a book's page: More like this, not on your shelf */
SHOTS["book-sim"] = { async at(dev) {
  /* the fold is drawn open, as it is once pressed, with three picks a file
     of yours would have brought, so nothing is looked up */
  simFav = { "guide-b5": { at: Date.now(), by: "Claude Code", mark: 10, rows: [
    { t: "The Winter Almanac", a: "Ruth Elsworthy", ser: "", why: "" },
    { t: "Lanterns Over the Harbour", a: "Ines Kowalczyk", ser: "", why: "" },
    { t: "A Map of Quiet Rooms", a: "Ada Brennagh", ser: "", why: "" }] } };
  SIM_OPEN.add("guide-b5");
  await openBook("guide-b5"); await wait(900);
  const d = await until(() => { const x = $("#secSim"); return x && x.getBoundingClientRect().height > 30 && x; }, 4000);
  if (!d) throw new Error("More like this did not show on the book's page: " + (($("#secSim") || {}).outerHTML || "none").slice(0, 200));
  const go = $("[data-simgo]", d), add = $("[data-simadd]", d), sum = $("summary", d);
  sum.scrollIntoView({ block: "start" }); window.scrollBy(0, -20); await wait(400);
  const r = d.getBoundingClientRect();
  const clip = box({ x: r.left, y: r.top, w: r.width, h: Math.min(r.height, dev === "ph" ? 720 : 620) }, dev === "ph" ? 6 : 14);
  return { clip, spots: { fold: sum, simgo: go, add } };
} };

/* an author's panel: 🔎 Look their other books up */
SHOTS["author-panel"] = { async at(dev) {
  await goTab("library"); await wait(300);
  openAuthorPanel("Mira Vantwell"); await wait(700);
  const p = await until(() => { const x = $("#authPanel"); return x && !x.hidden && x; });
  if (!p) throw new Error("the author's panel did not open");
  const more = need("#apMore", p);
  /* what Open Library would answer, put in its place: nothing is asked */
  authMore = { rows: [{ title: "The Ember Psalter", year: 2021 }, { title: "Atlas of Small Fires", year: 2017 }, { title: "Night Gardens", year: 2013 }] };
  renderAuthorPanel("Mira Vantwell"); await wait(500);
  const head = [...p.querySelectorAll(".grouphead")].find(h => /More by them/.test(h.textContent));
  const want = $("[data-apwant]", p);
  if (!head || !want) throw new Error("More by them? did not draw its rows");
  head.scrollIntoView({ block: "start" }); await wait(300);
  const r = p.getBoundingClientRect(), h = head.getBoundingClientRect(), rows = [...p.querySelectorAll("[data-apwant]")];
  const last = rows[rows.length - 1].getBoundingClientRect();
  const clip = box({ x: r.left, y: h.top, w: r.width, h: last.bottom - h.top }, 10);
  return { clip, spots: { more: head, want } };
} };

/* the dev page reads this back to see each picture's crop and spots drawn */
window.__guideShot = async (name, dev) => {
  const s = SHOTS[name];
  if (!s) throw new Error("no such picture: " + name);
  const r = await s.at(dev);
  await wait(250);
  const spots = {};
  for (const k in r.spots) {
    const e = r.spots[k];
    if (!e) continue;
    const q = e.getBoundingClientRect ? e.getBoundingClientRect() : e;
    spots[k] = [Math.round((q.left ?? q.x) - r.clip.x), Math.round((q.top ?? q.y) - r.clip.y),
      Math.round(q.width ?? q.w), Math.round(q.height ?? q.h)];
  }
  /* the spots are kept against the clip; the clip itself goes back to
     DevTools in the page's own pixels, which count from the top of the
     page, not of the window */
  return { clip: Object.assign({}, r.clip, { x: r.clip.x + scrollX, y: r.clip.y + scrollY }), spots };
};
})();
