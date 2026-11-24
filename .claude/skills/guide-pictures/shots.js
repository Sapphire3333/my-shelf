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
  ["The Hollow Tide", "Hollis Graye", "finished", ["Science fiction"], 390, 8],
  ["Paper Moons", "Lio Marchetti", "finished", ["Poetry"], 112, 8],
  ["A Field Guide to Quiet", "Ada Brennagh", "want", ["Nonfiction"], 240],
];
window.__guideSeed = async (dev) => {
  const au = $("#auLocal");
  if (au) { au.click(); await wait(900); }
  /* nothing pops up over a picture: the medals' first count, their toasts,
     the owl's remarks (a fresh shelf earns a few medals the moment it is seeded) */
  try { achXpCard = () => {}; achToast = () => {}; owlSay = () => {}; } catch (e) {}
  /* in memory only, like the sweep's stand-ins: nothing calls a save */
  settings.fontScale = dev === "ph" ? 132 : 135;
  settings.scrap = false; settings.bookEdit = false;
  /* settings outlive a page in the same browser: every picture starts from
     the same tabs and drawers, whatever the one before it opened */
  settings.todayTab = "reading"; settings.libFilt = false; settings.libTools = false; settings.libBench = false;
  settings.vMoreOpen = false; delete settings.viewFold;
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
      /* three on Today's Up next */
      ...({ 2: { upnext: 1 }, 4: { upnext: 2 }, 6: { upnext: 3 } })[i] || {},
      /* a series read one book of, the next waiting: Today's Series tab */
      ...(i === 9 ? { series: "Tidewater", seriesNum: "1" } : i === 4 ? { series: "Tidewater", seriesNum: "2" } : {}),
      ...(i === 5 ? { favorite: true } : {}),
      ...(i === 1 ? { quotes: ["A made-up line kept from a made-up book, long enough to be the quote of the day."] } : {}),
      readings: status === "finished" ? [{ id: "gr" + i, start: day(60 + i * 9), end: day(40 + i * 9) }]
        : status === "reading" ? [{ id: "gr" + i, start: day(6 + i), end: "", open: true }] : [],
      created: Date.now() - (i + 1) * 3 * 864e5, modified: Date.now() - i * 864e5,
    }));
  });
  /* a collection two stories into, for Series → Collections, the next story */
  books.push(Object.assign(blankBook("guide-c1"), { title: "Tales from the Salt Road", author: "Oskar Dellamere", type: "collection",
    status: "want", genres: ["Literary fiction"], created: Date.now() - 50 * 864e5,
    entries: ["The Ferryman's Wife", "Lamps at Low Tide", "A Wind from the Orchard", "The Last Toll"].map((t, k) =>
      Object.assign(blankEntry(), { title: t, status: k < 2 ? "finished" : "want", rating: k < 2 ? 8 : "" })) }));
  applyLook();
  await wait(300);
};

/* the clip around some elements, widened by pad on each side and kept in
   the window */
const box = (els, pad = 16, extra = {}) => {
  const rs = [].concat(els).filter(Boolean).map(e => e.getBoundingClientRect ? e.getBoundingClientRect() : e);
  if (!rs.length) throw new Error("nothing on the screen to cut a picture around");
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
  await place(fold);
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

/* 📚 Straight from Goodreads, under the import card's buttons */
SHOTS["care-goodreads"] = { async at(dev) {
  await careAt();
  const add = need("#grAdd"), row = add.parentElement, say = $("#grSay");
  await place(row);
  const shelves = $$("[data-grshelf]", row);
  return { clip: box([row, say].filter(Boolean), dev === "ph" ? 8 : 14), spots: { shelf: shelves[0], add } };
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
const driveStandIn = () => {
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
};
SHOTS["drive-tab"] = { async at(dev) {
  driveStandIn();
  await goTab("library"); await wait(300);
  setKindTab("drive"); await wait(900);
  const tab = $('[data-kt="drive"]'), nb = await until(() => $("#dsNew"), 4000), rd = $("[data-dsread]");
  const want = nb && $("[data-dnbring]", nb), fic = nb && $$("[data-dnbring]", nb)[1];
  const top = tab || nb;
  await place(top);
  const els = [tab, nb, rd].filter(Boolean);
  const clip = box(els, dev === "ph" ? 6 : 16);
  clip.h = Math.min(clip.h, dev === "ph" ? innerHeight - clip.y - 4 : 900);
  return { clip, spots: { tab, want, fic, read: rd } };
} };

/* Library → ☁ Drive, down at the folder's files and their 📖 Read */
SHOTS["drive-read"] = { async at(dev) {
  driveStandIn();
  await goTab("library"); await wait(300);
  setKindTab("drive"); await wait(900);
  const read = await until(() => $("[data-dsread]"), 4000);
  if (!read) throw new Error("no 📖 Read in the Drive tab");
  const row = read.closest(".snap") || read;
  const folders = [...document.querySelectorAll("[data-dsdir]")], first = folders[0] || row;
  await place(first, 20);
  return { clip: box([first, row], dev === "ph" ? 6 : 14), spots: { read, folder: folders[0] } };
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
  await place(sum, 20);
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

/* the Library's head: 🔎 in the corner, the find box, ☰ Filters, ☑ Select books, the look, ⋯ More */
SHOTS["lib-bar"] = { async at(dev) {
  await goTab("library"); window.scrollTo(0, 0); await wait(600);
  const jump = need("#jumpBtn"), find = need("#libFind"), filt = $("#filtTog"), sel = $("#selTog"), look = $("#layTog"), more = $("#libMore"), sort = $("#toolsTog");
  const kinds = $('[data-kt="books"]') || $("[data-kt]");
  const els = [jump, find, filt, sel, look, more, sort, kinds].filter(e => e && e.getClientRects().length);
  /* the whole width of the page, from the corner's 🔎 down to the shelf's own bar */
  const m = need("#main").getBoundingClientRect(), r = box(els, 0);
  const clip = box({ x: m.left, y: r.y, w: m.width, h: r.h }, dev === "ph" ? 6 : 14);
  return { clip, spots: { jump, find, filt, sel, look, more, sort } };
} };

/* Today: the book in your hands, with ✎ Log my page and 🌅 Your day */
SHOTS["today-door"] = { async at(dev) {
  await goTab("overview"); window.scrollTo(0, 0); await wait(900);
  const door = need("#secDoor"), log = $(".doorbtns [data-pgedit],.doorbtns [data-doorlog]", door), day = $("[data-dayopen]", door);
  const pen = [...door.querySelectorAll("[data-pgedit]")].find(e => !e.closest(".doorbtns"));
  return { clip: box(door, dev === "ph" ? 6 : 14), spots: { door: $(".rtitle", door) || door, log, pen, day } };
} };

/* Today: Up next, with 🎡 Spin, 📖 Start it and the arrows */
SHOTS["today-upnext"] = { async at(dev) {
  await goTab("overview"); await wait(900);
  const sec = need("#secUpNext");
  await place(sec);
  return { clip: box(sec, dev === "ph" ? 6 : 14), spots: { spin: $("[data-wheel]", sec), start: $("[data-setst]", sec), move: $$("[data-unmv]", sec)[1] || $("[data-unmv]", sec) } };
} };

/* a row's stage disc pressed: the stages, ⏭ Up next and 📌 Priority */
SHOTS["lib-stage"] = { async at(dev) {
  await goTab("library"); await wait(600);
  const row = [...document.querySelectorAll('.row[data-open="guide-b11"]')][0];
  if (!row) throw new Error("the made-up book for the stage picture is not on the shelf");
  await place(row, dev === "ph" ? 90 : 120);
  const dot = need(".stdot[data-cyc]", row);
  dot.click(); await wait(500);
  const pick = await until(() => { const x = $(".stpick"); return x && x.getClientRects().length && x; });
  if (!pick) throw new Error("the stage list did not open");
  const up = $("[data-upnext]", pick), fin = [...pick.querySelectorAll("[data-setst]")].find(b => /Finished/.test(b.textContent));
  return { clip: box([row, pick], dev === "ph" ? 6 : 14), spots: { dot, up, fin, pick } };
} };

/* Today's three tabs: 📖 Reading, 📚 Series, ❝ Notes */
SHOTS["today-tabs"] = { async at(dev) {
  await goTab("overview"); window.scrollTo(0, 0); await wait(900);
  const bar = need(".todaytabs"), t = k => $(`[data-ttab="${k}"]`, bar);
  return { clip: box(bar, dev === "ph" ? 6 : 12), spots: { reading: t("reading"), series: t("series"), notes: t("notes") } };
} };

/* Today → 📚 Series: the next story of a collection, the next book of a series */
SHOTS["today-series"] = { async at(dev) {
  await goTab("overview"); await wait(700);
  todayTabSet("series"); await wait(700);
  const sec = need("#secSeries");
  await place(sec);
  const coll = $("#secContinue .rnrow", sec), next = $("#secNextLine", sec), start = $("#secNextLine [data-setst]", sec);
  const r = sec.getBoundingClientRect();
  const clip = box({ x: r.left, y: r.top, w: r.width, h: Math.min(r.height, dev === "ph" ? innerHeight - r.top - 4 : 620) }, dev === "ph" ? 6 : 14);
  return { clip, spots: { coll, next: next && ($(".rtitle", next) || next), start } };
} };

/* 🎡 Spin: the wheel of Up next and Want to read */
SHOTS["today-wheel"] = { async at(dev) {
  await goTab("overview"); await wait(800);
  need("[data-wheel]").click(); await wait(900);
  const p = await until(() => { const x = $("#wheelPanel"); return x && x.getClientRects().length && x; });
  if (!p) throw new Error("the wheel did not open");
  return { clip: box(p, 6), spots: { whspin: $("[data-whspin]", p), whmore: $("[data-whmore]", p) } };
} };

/* 🌅 Your day, open */
SHOTS["today-day"] = { async at(dev) {
  await goTab("overview"); await wait(800);
  need("[data-dayopen]").click(); await wait(1200);
  const p = await until(() => { const x = $("#ydPanel"); return x && x.getClientRects().length && x; });
  if (!p) throw new Error("Your day did not open");
  const row = k => $(`[data-ydtog="${k}"]`, p);
  /* the scratch card opens by itself, being the first not done: shut it, so the rows show */
  const sc = row("scratch"); if (sc && sc.getAttribute("aria-expanded") === "true") { sc.click(); await wait(400); }
  const r = p.getBoundingClientRect();
  return { clip: box({ x: r.left, y: r.top, w: r.width, h: Math.min(r.height, innerHeight - r.top) }, 6),
    spots: { scratch: row("scratch"), tasks: row("tasks"), tarot: row("tarot"), globe: row("globe") } };
} };

/* 🌅 Your day → ❄️ The snow globe, open */
SHOTS["today-globe"] = { async at(dev) {
  await goTab("overview"); await wait(800);
  need("[data-dayopen]").click(); await wait(1200);
  const p = await until(() => { const x = $("#ydPanel"); return x && x.getClientRects().length && x; });
  if (!p) throw new Error("Your day did not open");
  let row = need('[data-ydtog="globe"]', p);
  if (row.getAttribute("aria-expanded") !== "true") { row.click(); await wait(600); }
  row = need('[data-ydtog="globe"]', p);
  const shake = need("[data-globe]", p);
  row.scrollIntoView({ block: "start" }); await wait(300);
  const a = row.getBoundingClientRect(), b = shake.getBoundingClientRect(), r = p.getBoundingClientRect();
  return { clip: box({ x: r.left, y: a.top, w: r.width, h: b.bottom - a.top }, 10), spots: { globe: row, shake } };
} };

/* Today → ❝ Notes: the big picture (and the room), the owl's story */
SHOTS["today-notes"] = { async at(dev) {
  await goTab("overview"); await wait(700);
  todayTabSet("notes"); await wait(800);
  const big = $("#secBig"), story = $("#secStory");
  const first = big || story;
  if (!first) throw new Error("the Notes tab has neither the big picture nor the owl's story");
  await place(first);
  const els = [big, story].filter(Boolean), r = box(els, 0);
  const clip = box({ x: r.x, y: r.y, w: r.w, h: Math.min(r.h, innerHeight - r.y - 4) }, dev === "ph" ? 6 : 14);
  return { clip, spots: { room: $("[data-roomshow],[data-roomarrange]"), story: $("[data-story]") } };
} };

/* Today → ❝ Notes: the year, with Aim for */
SHOTS["today-year"] = { async at(dev) {
  await goTab("overview"); await wait(700);
  todayTabSet("notes"); await wait(800);
  const y = need("#secYear");
  await place(y);
  return { clip: box(y, dev === "ph" ? 6 : 14), spots: { goal: $("#goalIn", y), pages: $("#pgAimAdd", y) } };
} };

/* Library: ☰ Filters open, its stage pills */
SHOTS["lib-filters"] = { async at(dev) {
  settings.libFilt = true;
  await goTab("library"); window.scrollTo(0, 0); await wait(700);
  const filt = need("#filtTog"), pills = $$("[data-sf]");
  const want = pills.find(b => /Want/.test(b.textContent)), fav = pills.find(b => /Favourites/.test(b.textContent));
  const m = need("#main").getBoundingClientRect(), r = box([need("#libFind"), filt, ...pills], 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: r.h }, dev === "ph" ? 6 : 14), spots: { filt, want, fav, all: pills[0] } };
} };

/* Library: one row, its stage disc, heart and mark */
SHOTS["lib-row"] = { async at(dev) {
  await goTab("library"); await wait(600);
  const row = $('.row[data-open="guide-b5"]');
  if (!row) throw new Error("the made-up favourite is not on the shelf");
  await place(row, 60);
  return { clip: box(row, dev === "ph" ? 6 : 12), spots: { dot: $(".stdot[data-cyc]", row), heart: $(".favdot[data-favt]", row), mark: $("[data-ratep]", row) } };
} };

/* Library: ☑ Select books, two ticked, ⚙ Do something with them open */
SHOTS["lib-select"] = { async at(dev) {
  await goTab("library"); window.scrollTo(0, 0); await wait(600);
  if (!$("#selTog") || !$("#selTog").getClientRects().length) { const f = $("#filtTog"); if (f) { f.click(); await wait(500); } }
  need("#selTog").click(); await wait(600);
  for (const id of ["guide-b2", "guide-b4"]) { const r = $(`.row[data-open="${id}"]`); if (r) { r.click(); await wait(250); } }
  const phone = document.documentElement.dataset.phone === "1";
  if (phone) { need("#selBarGo").click(); await wait(700); }
  else { need("#selMoreTog").click(); await wait(600); }
  const coll = $("#selColl"), all = $("#selAll"), count = $("#selCount"), go = phone ? $("#selBarGo") : $("#selMoreTog");
  const panel = phone ? ($("#selSheet") || go) : ($("#selMore") || go);
  const els = [count, go, all, coll, panel].filter(e => e && e.getClientRects().length);
  const r = box(els, 0);
  return { clip: box({ x: r.x, y: r.y, w: r.w, h: Math.min(r.h, innerHeight - r.y - 2) }, dev === "ph" ? 6 : 14), spots: { count, go, all, coll } };
} };

/* Library: ⋯ More open on a computer; ☰ open on a phone (where Sort and the look live) */
SHOTS["lib-more"] = { async at(dev) {
  await goTab("library"); window.scrollTo(0, 0); await wait(600);
  const phone = document.documentElement.dataset.phone === "1";
  let tog = phone ? need("#filtTog") : need("#barMoreTog");
  if (tog.getAttribute("aria-expanded") !== "true") { tog.click(); await wait(600); }
  /* pressing it draws the Library again: find it afresh */
  tog = phone ? need("#filtTog") : need("#barMoreTog");
  const drop = phone ? null : $("#barMore");
  const look = $("#layTog"), sort = $("#toolsTog"), pin = $("[data-barpin]") || $("#followEdit");
  const els = [tog, drop, look, sort, pin].filter(e => e && e.getClientRects().length);
  const m = need("#main").getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: phone ? m.left : r.x, y: r.y, w: phone ? m.width : r.w, h: Math.min(r.h, innerHeight - r.y - 2) }, dev === "ph" ? 6 : 14),
    spots: { more: tog, look, sort, pin } };
} };

/* Library: ⇅ Sort & layout open */
SHOTS["lib-sort"] = { async at(dev) {
  settings.libTools = true; settings.libFilt = document.documentElement.dataset.phone === "1";
  await goTab("library"); window.scrollTo(0, 0); await wait(700);
  const sorts = $$("[data-sort]");
  if (!sorts.length) throw new Error("⇅ Sort & layout did not open");
  /* no scrolling here: the bar that follows you down the Library would cover the Sort row */
  if (document.documentElement.dataset.phone === "1") await place(sorts[0], 40);
  const groups = $$("[data-gb]"), cases = $("#bcGo"), print = $("#libPrint");
  const m = need("#main").getBoundingClientRect(), r = box([...sorts, ...groups, cases, print].filter(e => e && e.getClientRects().length), 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: Math.min(r.h, innerHeight - r.y - 2) }, dev === "ph" ? 6 : 14),
    spots: { sort: sorts[0], group: groups[1] || groups[0], cases, print } };
} };

/* Library: ⛶ Your bookcases */
SHOTS["lib-cases"] = { async at(dev) {
  await goTab("library"); await wait(500);
  openBookcases(); await wait(800);
  const p = await until(() => { const x = $("#bcPanel"); return x && x.getClientRects().length && x; });
  if (!p) throw new Error("the bookcases did not open");
  const r = p.getBoundingClientRect();
  return { clip: box({ x: r.left, y: r.top, w: r.width, h: Math.min(r.height, innerHeight - r.top) }, 4), spots: { add: $("#bcAdd", p), find: $("#bcFind", p) } };
} };

/* A BOOK'S PAGE. guide-b0 is being read (pages, a mark, a series); guide-b5 is finished, a favourite */
const bookAt = async (id) => { await openBook(id); await wait(1100); window.scrollTo(0, 0); await wait(200); return need("#edPage"); };
const vis = e => e && e.getClientRects().length ? e : null;

/* the head: stage, ✓ Finish it, ★, ♡, the page line, ⏱ Start, the sound, ✎ Edit, 🔎 Auto-fill */
SHOTS["book-head"] = { async at(dev) {
  const pg = await bookAt("guide-b0");
  const st = need("#vStatus"), timer = vis($("#vTimer")), amb = vis($("#vAmb"));
  const fin = [...pg.querySelectorAll("[data-vst]")].find(b => /Finish it/.test(b.textContent));
  const prog = pg.querySelector(".prog, .vprog, progress") || timer;
  const els = [need("#edBack"), st, timer, amb, fin].filter(Boolean);
  const m = pg.getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: r.h }, dev === "ph" ? 6 : 14),
    spots: { status: st, finish: fin, rate: vis($("#vRate")), fav: vis($("#vFav")), timer, amb, edit: vis($("#toEdit")), fill: vis($("#vFill")) } };
} };

/* what will you give it?, what you think will happen, a letter for the day you finish */
SHOTS["book-guess"] = { async at(dev) {
  const pg = await bookAt("guide-b0");
  const g = need("[data-vguess]"), pred = $("[data-predopen]"), go = vis($("#predGo")), letter = $("[data-cap]");
  /* room above the buttons for the card's own line, "What will you give it?" */
  await place(g, dev === "ph" ? 110 : 80);
  const els = [g, pred, go, letter].filter(e => e && e.getClientRects().length);
  const m = pg.getBoundingClientRect(), r = box(els, 0), top = g.getBoundingClientRect().top - (dev === "ph" ? 90 : 52);
  return { clip: box({ x: Math.max(m.left, r.x - 20), y: top, w: Math.min(r.w + 20, m.right - r.x), h: Math.min(r.y + r.h - top, innerHeight - top - 4) }, dev === "ph" ? 6 : 14),
    spots: { guess: g, pred, keep: go, letter } };
} };

/* 🏃 Sprint, 📖 Read it here, ☁ From Drive, ▸ More for this book, ▸ readings */
SHOTS["book-tools"] = { async at(dev) {
  const pg = await bookAt("guide-b0");
  const sprint = vis($("#vSprint")), read = vis($("#rdAdd")), drive = vis($("#rdDrive")), more = vis($("#vMore")), reads = vis($("#vReads"));
  const first = sprint || read;
  await place(first, 30);
  const els = [sprint, read, drive, more, reads].filter(Boolean);
  const m = pg.getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: r.x, y: r.y, w: Math.max(r.w, Math.min(m.width, 700)), h: r.h }, dev === "ph" ? 6 : 14),
    spots: { sprint, read, drive, more, reads } };
} };

/* a finished book's head: the stage, 📖 Read it again, the bookplate, 🧠 Questions for later */
SHOTS["book-done"] = { async at(dev) {
  const pg = await bookAt("guide-b5");
  const st = need("#vStatus"), again = [...pg.querySelectorAll("[data-vst],button")].find(b => /Read it again/.test(b.textContent));
  const ql = [...pg.querySelectorAll("button")].find(b => /Questions for later/.test(b.textContent));
  if (dev === "ph") await place(st, 20);
  const els = (dev === "ph" ? [st, again, ql] : [need("#edBack"), st, again, ql]).filter(e => e && e.getClientRects().length);
  const m = need("#edPage").getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: Math.min(r.h, innerHeight - r.y - 4) }, dev === "ph" ? 6 : 14),
    spots: { status: st, again, later: ql } };
} };

/* ▸ More for this book, open: 📤 Lent to…, 📥 Borrowed from…, 🎬 On screen, 🗺 A map of your own… */
SHOTS["book-more"] = { async at(dev) {
  const pg = await bookAt("guide-b0");
  if (!/▾/.test(need("#vMore").textContent)) { need("#vMore").click(); await wait(500); }
  const more = need("#vMore"), loans = $$("[data-loan]"), screen = vis($("#screenOpen")), map = vis($("#ownMapAdd"));
  await place(more, 30);
  const els = [more, ...loans, screen, map].filter(e => e && e.getClientRects().length);
  const m = pg.getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: r.x, y: r.y, w: Math.max(r.w, Math.min(m.width, 640)), h: r.h }, dev === "ph" ? 6 : 14),
    spots: { more, lent: loans[0], borrowed: loans[1], screen, map } };
} };

/* ▸ 1 reading, open: its dates, + Add a reading */
SHOTS["book-reads"] = { async at(dev) {
  const pg = await bookAt("guide-b0");
  if (!/▾/.test(need("#vReads").textContent)) { need("#vReads").click(); await wait(500); }
  const reads = need("#vReads"), add = need("[data-radd]"), date = vis($("[data-rst]"));
  await place(reads, 30);
  const els = [reads, add, date].filter(Boolean);
  const m = pg.getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: r.x, y: r.y, w: Math.max(r.w, Math.min(m.width, 560)), h: r.h }, dev === "ph" ? 6 : 14), spots: { reads, add, date } };
} };

/* ⚙ View, open: text size, cover size, 🖨 Print */
SHOTS["book-view"] = { async at(dev) {
  await bookAt("guide-b0");
  /* on a phone ⚙ View stands behind ⋯ at the top */
  const dots = vis($("#moreTog"));
  if (!vis($("#viewTog")) && dots) { dots.click(); await wait(500); }
  if (!/▴/.test(need("#viewTog").textContent)) { need("#viewTog").click(); await wait(500); }
  const tog = need("#viewTog"), print = need("#vPrint"), up = vis($("#fsUp"));
  const pop = print.closest(".vsbox,.viewsheet,[class*=view]") || print.parentElement.parentElement;
  const els = [tog, pop, print].filter(e => e && e.getClientRects().length);
  return { clip: box(els.concat(dots ? [dots] : []), dev === "ph" ? 6 : 12), spots: { dots, view: tog, print, size: up, fill: vis($("#vFill")) } };
} };

/* ✎ Edit: the folds of a book's page being written */
SHOTS["book-edit"] = { async at(dev) {
  const pg = await bookAt("guide-b0");
  need("#toEdit").click(); await wait(900);
  const heads = [...document.querySelectorAll("#edPage .edsechead")];
  const h = re => heads.find(x => re.test(x.textContent));
  const words = h(/Your words/), how = h(/How you read it/), itself = h(/The book itself/), filing = h(/Filing/);
  /* the first fold, ✍ Your words, stands open on a new edit: shut it so the four heads stand together */
  if (words && words.getAttribute("aria-expanded") === "true") { words.click(); await wait(400); }
  const done = vis($("#toView")) || vis($("[data-tov]"));
  const hs = [words, how, itself, filing].filter(Boolean);
  await place(hs[0], dev === "ph" ? 60 : 40);
  /* ✎ Edit drew the page again: measure the new one */
  const m = need("#edPage").getBoundingClientRect(), r = box(hs, 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: r.h }, dev === "ph" ? 6 : 14),
    spots: { words, how, itself, filing } };
} };

/* the quotes on a finished book: ❝ Add a quote…, 📷 off a photo */
SHOTS["book-quotes"] = { async at(dev) {
  const pg = await bookAt("guide-b5");
  { const q0 = $("#secQuotes") || $("#vQuotePhoto"); if (q0 && typeof vTabFor === "function") { vTabFor(q0); await wait(300); } }
  const photo = need("#vQuotePhoto"), sec = photo.closest(".sec,.hcard,section") || photo.parentElement;
  const add = sec.querySelector("input,textarea");
  await place(sec, 70);
  return { clip: box(sec, dev === "ph" ? 6 : 14, { top: 44 }), spots: { add, photo } };
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
    /* a thing that isn't drawn (hidden on this screen, or behind a menu) has no spot */
    if (!e || (e.getClientRects && !e.getClientRects().length)) continue;
    const q = e.getBoundingClientRect ? e.getBoundingClientRect() : e;
    /* nor one whose middle lies outside the picture */
    const cx = (q.left ?? q.x) + (q.width ?? q.w) / 2, cy = (q.top ?? q.y) + (q.height ?? q.h) / 2;
    if (cx < r.clip.x || cx > r.clip.x + r.clip.w || cy < r.clip.y || cy > r.clip.y + r.clip.h) continue;
    spots[k] = [Math.round((q.left ?? q.x) - r.clip.x), Math.round((q.top ?? q.y) - r.clip.y),
      Math.round(q.width ?? q.w), Math.round(q.height ?? q.h)];
  }
  /* the spots are kept against the clip; the clip itself goes back to
     DevTools in the page's own pixels, which count from the top of the
     page, not of the window */
  return { clip: Object.assign({}, r.clip, { x: r.clip.x + scrollX, y: r.clip.y + scrollY }), spots };
};
})();
