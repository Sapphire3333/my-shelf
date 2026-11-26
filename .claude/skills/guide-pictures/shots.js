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
  /* the 🎬 pictures give a made-up key and the switch; no other picture keeps them */
  settings.tmdbKey = ""; delete settings.screenAll;
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

/* 🎲 Challenges: its three rooms and the Reading room's bands */
SHOTS["ch-rooms"] = { async at(dev) {
  chRoomSet("reading"); await goTab("challenges"); window.scrollTo(0, 0); await wait(900);
  const r = k => $(`[data-chroom="${k}"]`), b0 = $('[data-chband="0"]');
  const els = [r("reading"), r("games"), r("shop"), b0, $('[data-chband="4"]')].filter(e => e && e.getClientRects().length);
  const m = need("#main").getBoundingClientRect(), x = box(els, 0);
  return { clip: box({ x: m.left, y: x.y, w: m.width, h: x.h }, dev === "ph" ? 6 : 14),
    spots: { reading: r("reading"), games: r("games"), shop: r("shop"), bands: b0 } };
} };

/* 🎲 Challenges → 🛍 Shop: gold bought with XP, the aisles, 👁 try it on, a price */
SHOTS["ch-shop"] = { async at(dev) {
  chRoomSet("shop"); await goTab("challenges"); window.scrollTo(0, 0); await wait(1000);
  const gold = $("[data-goldbuy]"), aisle = $("[data-shoptab]"), tryOn = vis($("[data-shoptry]")), buy = vis($("[data-shopbuy]"));
  const els = [gold, aisle, tryOn, buy, $('[data-chroom="shop"]')].filter(e => e && e.getClientRects().length);
  const m = need("#main").getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: Math.min(r.h, innerHeight - r.y - 4) }, dev === "ph" ? 6 : 14),
    spots: { gold, aisle, tryon: tryOn, buy, shop: $('[data-chroom="shop"]') } };
} };

/* 🏅 Medals: the row of walls */
SHOTS["ach-jump"] = { async at(dev) {
  await goTab("ach"); window.scrollTo(0, 0); await wait(1200);
  const jumps = [...document.querySelectorAll("[data-achjump]")].filter(e => e.getClientRects().length);
  if (!jumps.length) throw new Error("no walls row on Medals");
  const m = need("#main").getBoundingClientRect(), r = box(jumps, 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: r.h }, dev === "ph" ? 6 : 12), spots: { jump: jumps[0] } };
} };

/* 🏅 Medals: Nearly there, and a medal on its wall */
SHOTS["ach-wall"] = { async at(dev) {
  await goTab("ach"); window.scrollTo(0, 0); await wait(1200);
  const near = need("[data-achnear]");
  await place(near, 50);
  const medal = [...document.querySelectorAll("#main button")].find(b => b.getClientRects().length && /Bronze|Silver|Gold/.test(b.textContent) && !b.dataset.achnear);
  const els = [near, medal].filter(e => e && e.getClientRects().length);
  const m = need("#main").getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: m.left, y: r.y - 30, w: m.width, h: Math.min(r.h + 30, innerHeight - r.y + 26) }, dev === "ph" ? 6 : 14),
    spots: { near, medal } };
} };

/* 🎲 Challenges → 📖 Reading → Today: today's three, 👀 tomorrow's, your runs */
SHOTS["ch-today"] = { async at(dev) {
  chRoomSet("reading"); await goTab("challenges"); window.scrollTo(0, 0); await wait(1000);
  const b0 = $('[data-chband="0"]'); if (b0) { b0.click(); await wait(500); }
  const peek = need("#qPeek"), run = vis($('[data-run="touch"]'));
  const three = [...document.querySelectorAll("#main *")].find(e => e.children.length === 0 && /^Today's three$/.test(e.textContent.trim()));
  await place(three || peek, 30);
  const els = [three, peek, run].filter(e => e && e.getClientRects().length);
  const m = need("#main").getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: Math.min(r.h, innerHeight - r.y - 4) }, dev === "ph" ? 6 : 14),
    spots: { three, peek } };
} };

/* a band of the Reading room, and the one button in it a way is about */
const chBand = async (k, sel) => {
  chRoomSet("reading"); await goTab("challenges"); window.scrollTo(0, 0); await wait(900);
  need(`[data-chband="${k}"]`).click(); await wait(700);
  const b = need(sel), card = b.closest(".qcard,.hcard,.sec") || b.parentElement;
  await place(card, 30);
  return { b, card, band: need(`[data-chband="${k}"]`) };
};
SHOTS["ch-month"] = { async at(dev) {
  const { b, card } = await chBand(2, "#customGo");
  return { clip: box(card, dev === "ph" ? 6 : 14, { top: 40 }), spots: { make: b } };
} };
SHOTS["ch-year"] = { async at(dev) {
  const { b, card } = await chBand(3, "#roadGo");
  return { clip: box(card, dev === "ph" ? 6 : 14, { top: 40 }), spots: { road: b } };
} };
SHOTS["ch-dare"] = { async at(dev) {
  const { b, card } = await chBand(4, "#qDraw");
  return { clip: box(card, dev === "ph" ? 6 : 14), spots: { dare: b } };
} };

/* 🎲 Challenges → 🕹 Games: the tiles */
SHOTS["ch-games"] = { async at(dev) {
  chRoomSet("games"); await goTab("challenges"); window.scrollTo(0, 0); await wait(1000);
  const tiles = [...document.querySelectorAll("#main .gtile[data-chgame]")].filter(e => e.getClientRects().length);
  if (!tiles.length) throw new Error("no game tiles");
  /* the day's game stands first in the room; the tiles are under it */
  await place(tiles[0], 70);
  const els = tiles.slice(0, dev === "ph" ? 4 : 6);
  const m = need("#main").getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: m.left, y: r.y - 46, w: m.width, h: Math.min(r.h + 46, innerHeight - r.y + 42) }, dev === "ph" ? 6 : 14),
    spots: { tile: tiles[0] } };
} };

/* 🏅 Medals → 🎴 Cards: a pack, the genre and author packs, the trading post */
SHOTS["ach-cards"] = { async at(dev) {
  await goTab("ach"); await wait(1100);
  const buy = need("[data-packbuy]"), post = vis($("[data-post]")), genre = vis($('[data-packtype="genre"]'));
  const sec = buy.closest(".sec") || buy.parentElement;
  const head = $(".heading", sec) || sec;
  await place(head, 60);
  const els = [head, buy, post, genre].filter(e => e && e.getClientRects().length);
  const m = need("#main").getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: Math.min(r.h, innerHeight - r.y - 4) }, dev === "ph" ? 6 : 14),
    spots: { buy, post, genre } };
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

/* ---- 📖 the reader, on a stand-in text ----
   The book being read (guide-b0) is given a file by name only; rdLoad hands
   the reader an invented text of six chapters instead of reading a file, the
   way the smoke does. Nothing of a real book. */
const READER_TEXT = (() => {
  let h = "";
  const para = ["The lantern keeper counted the boats as they came in, each one a small light on the dark water, and wrote the number in the book she kept under the stair.",
    "By the third week the harbour had learned her habits: the lamp lit at dusk, the window open an inch, the kettle on the stove that never quite boiled.",
    "Nobody asked what the numbers were for. They were simply kept, the way the tide was kept, and the weather, and the names of the boats that did not come back."];
  for (let i = 0; i < 6; i++) { h += "<h2>Chapter " + (i + 1) + "</h2>"; for (let k = 0; k < 7; k++) h += "<p>" + para[(i + k) % 3] + " " + para[(i + k + 1) % 3] + "</p>"; }
  return h;
})();
const readerAt = async (dev, opts) => {
  const b = books.find(x => x.id === "guide-b0");
  b.readFile = { name: "the-lantern-keeper.epub", size: 120000 };
  try { rdLoad = async () => READER_TEXT; } catch (e) {}
  if (opts && opts.before) opts.before(b);
  await openReader("guide-b0");
  await until(() => rdState && document.getElementById("readerPage") && $("#rdText p"), 6000);
  await wait(700);
  return need("#readerPage");
};
window.__guideReader = readerAt;
/* the reader's own picture in the text (an invented drawing), for 🖼 Keep this picture */
const READER_PIC = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><rect width="480" height="300" fill="#dbe7ee"/><circle cx="380" cy="80" r="34" fill="#f6e7c1"/><path d="M0 220 Q120 170 240 215 T480 205 V300 H0Z" fill="#2f6f8f"/><rect x="60" y="120" width="26" height="100" fill="#f8f4ea"/><path d="M60 120 h26 l-13 -30z" fill="#c8443c"/></svg>');
const readerTextWithPic = () => READER_TEXT.replace("</h2>", '</h2><p><img src="' + READER_PIC + '" alt="" style="max-width:100%"></p>');
/* the reader claims Claude is set up, so its 📖 and 💬 buttons draw (nothing is sent: the picture rig blocks the sync server) */
const claudeOn = () => { SYNC.supa = SYNC.supa || {}; SYNC.user = SYNC.user || { id: "guide" }; if (!CFG.url) CFG.url = "https://example.supabase.co"; };
/* select the first words of the second paragraph, the way a finger or a mouse would */
const readerSelect = async (words) => {
  const p = $$("#rdText p").find(x => x.textContent.trim().length > 40);
  const t = p.firstChild;
  /* a phone selects by itself (user-select is off there): hand the reader its own range */
  if ($(".rdview.rdtouch")) { rdState.tsel = { a: { n: t, o: 0 }, z: { n: t, o: words } }; rdOwnPaint(rdState); if (rdState.onSel) rdState.onSel(); await wait(400); return; }
  const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, words);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  document.dispatchEvent(new Event("selectionchange")); await wait(400);
};
const rdBar = () => need(".rdtop .rdbar"), rdFoot = () => need(".rdbottom");
/* the book's page: 📖 Read it here, ⤓ Another file, ☁ From Drive */
SHOTS["rd-open"] = { async at(dev) {
  const b = books.find(x => x.id === "guide-b0"); b.readFile = { name: "the-lantern-keeper.epub", size: 120000 };
  const keep = CFG.googleClientId; CFG.googleClientId = "guide.apps.googleusercontent.com";
  try { drvLoadGis = async () => {}; } catch (e) {}
  const pg = await bookAt("guide-b0");
  const open = need("#rdOpen"), add = vis($("#rdAdd")), drive = vis($("#rdDrive"));
  const row = open.closest(".vloan") || open.parentElement;
  await place(row, dev === "ph" ? 100 : 60);
  const m = pg.getBoundingClientRect(), r = box(row, 0), top = r.y - (dev === "ph" ? 60 : 46);
  CFG.googleClientId = keep;
  return { clip: box({ x: m.left, y: top, w: m.width, h: r.y + r.h - top }, dev === "ph" ? 6 : 14), spots: { open, add, drive } };
} };
/* the reader with its bars: ‹ Back, 🔖, ☰, ⇆ Pages at the top; the bar, the count, 🎧 Listen, 🌙 at the foot */
SHOTS["rd-page"] = { async at(dev) {
  const pg = await readerAt(dev);
  return { clip: box(pg, 0), spots: { back: $("#rdBack"), bm: $("#rdBm"), toc: $("#rdToc"), mode: $("#rdMode"), drag: $("#rdDrag"), pos: $("#rdPos"), listen: $("#rdListen"), night: $("#rdNight"), clock: $("#rdClock") } };
} };
/* words selected: 🖍 Highlight, 📖 What does it mean?, 💬 What does this mean? */
SHOTS["rd-sel"] = { async at(dev) {
  claudeOn();
  const pg = await readerAt(dev);
  /* three words, eighteen letters: a word to look up and a passage to explain, both on offer */
  await readerSelect(18);
  const keep = need("#rdKeep"), word = vis($("#rdWord")), mean = vis($("#rdMean"));
  const strip = keep.closest(".rdask") || keep.parentElement;
  return { clip: box([strip, rdFoot()], 6), spots: { keep, word, mean } };
} };
/* a longer passage selected: 💬 What does this mean? (a word alone offers 📖 instead) */
SHOTS["rd-mean"] = { async at(dev) {
  claudeOn();
  await readerAt(dev);
  await readerSelect(70);
  const keep = need("#rdKeep"), mean = need("#rdMean"), strip = keep.closest(".rdask") || keep.parentElement;
  return { clip: box([strip, rdFoot()], 6), spots: { keep, mean } };
} };
/* a highlight tapped: ❝ Keep it, ✕ Remove the mark */
SHOTS["rd-hl"] = { async at(dev) {
  const pg = await readerAt(dev);
  await readerSelect(5); need("#rdKeep").click(); await wait(500);
  const mk = await until(() => $("#rdText mark.rdhl"), 3000); if (!mk) throw new Error("no highlight was made");
  mk.click(); await wait(500);
  const bar = await until(() => $("#rdHlBar"), 3000); if (!bar) throw new Error("the highlight's bar didn't open");
  return { clip: box([bar, mk], 10), spots: { hlkeep: $("#rdHlKeep"), hloff: $("#rdHlOff") } };
} };
/* a picture in the text pressed: 🖼 Keep this picture */
SHOTS["rd-pic"] = { async at(dev) {
  try { rdLoad = async () => readerTextWithPic(); } catch (e) {}
  const b = books.find(x => x.id === "guide-b0"); b.readFile = { name: "the-lantern-keeper.epub", size: 120000 };
  await openReader("guide-b0"); await until(() => rdState && $("#rdText img"), 6000); await wait(600);
  const img = need("#rdText img"); img.scrollIntoView({ block: "center" }); await wait(300);
  /* the view hears a press as pointerdown then pointerup at the same point */
  { const r = img.getBoundingClientRect(), o = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, bubbles: true };
    img.dispatchEvent(new PointerEvent("pointerdown", o)); img.dispatchEvent(new PointerEvent("pointerup", o)); await wait(500); }
  const bar = await until(() => $("#rdPicBar"), 3000); if (!bar) throw new Error("the picture's bar didn't open");
  return { clip: box([bar, img], 10), spots: { pickeep: $("#rdPicKeep") } };
} };
/* ☰ the side panel on Contents: its tabs and the chapters */
SHOTS["rd-toc"] = { async at(dev) {
  await readerAt(dev);
  rdState.panelGo("toc"); await wait(500);
  const box_ = need("#rdTocBox"), tab = k => $('[data-rdtab="' + k + '"]', box_);
  return { clip: box(box_, 6), spots: { chapter: $(".rdtocch", box_), hl: tab("hl"), wd: tab("wd"), bm: tab("bm"), find: tab("find"), look: tab("look"), nb: tab("nb"), listen: tab("listen") } };
} };
/* 🔎 Find */
SHOTS["rd-find"] = { async at(dev) {
  await readerAt(dev);
  rdState.panelGo("find"); await wait(500);
  const box_ = need("#rdTocBox"), qf = need("#rdFindQ", box_); qf.value = "lantern"; need("#rdFindBtn", box_).click(); await wait(600);
  return { clip: box(box_, 6), spots: { findq: qf, findgo: $("#rdFindBtn", box_) } };
} };
/* Aa: typeface, size, paper, the eye-saving light */
SHOTS["rd-look"] = { async at(dev) {
  await readerAt(dev);
  rdState.panelGo("look"); await wait(500);
  const box_ = need("#rdTocBox");
  /* the panel scrolls: the typefaces at the top of the picture, the paper row in it */
  $$("[data-rdkface]", box_)[0].scrollIntoView({ block: "start" }); await wait(300);
  return { clip: box(box_, 6), spots: { face: $$("[data-rdkface]", box_)[1], size: $("#rdkSize", box_) } };
} };
/* Aa, further down: the eye-saving light */
SHOTS["rd-light"] = { async at(dev) {
  await readerAt(dev);
  rdState.panelGo("look"); await wait(500);
  const box_ = need("#rdTocBox");
  /* from the paper row down: the papers, ↺, then the light's rows */
  const pap = $$("[data-rdkpaper]", box_)[0], lab = pap.closest(".rdklab,.rdkrow,label,div") || pap;
  lab.scrollIntoView({ block: "start" }); await wait(300); $("#rdTocBox").scrollTop -= 30; await wait(200);
  return { clip: box(box_, 6), spots: { paper: $$("[data-rdkpaper]", box_)[2], lit: $("#rdkLit", box_), warm: $("#rdkWarm", box_), clock: $("#rdkClock", box_), awake: $("#rdkAwake", box_) } };
} };
/* 🎧: read aloud, the sleep timer, a sound for this book, songs */
SHOTS["rd-listen"] = { async at(dev) {
  await readerAt(dev);
  rdState.panelGo("listen"); await wait(600);
  const box_ = need("#rdTocBox");
  return { clip: box(box_, 6), spots: { go: $("#rdlGo", box_), voice: $("#rdlVoice", box_), sleep: $("#rdlSleep", box_), rain: $('[data-rdsnd="rain"]', box_), songs: $('[data-rdsnd="songs"]', box_), vol: $("#rdlVol", box_) } };
} };

/* ---- ✨ Insights: the invented shelf given a past, so every card has something to draw ----
   Readings in the year before, places the books are set, pages logged on
   recent days, a named stretch, a kept reading of the owner's taste (invented
   sentences), a prediction. In memory only, for these pictures. */
const insSeed = () => {
  const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const B = id => books.find(x => x.id === id);
  const places = { "guide-b1": ["Lisbon, Portugal"], "guide-b3": ["Maine"], "guide-b5": ["Norway"], "guide-b8": ["Japan"], "guide-b9": ["Peru"], "guide-b10": ["Lisbon, Portugal"], "guide-b0": ["Middle-earth"] };
  Object.keys(places).forEach(id => { const b = B(id); if (b) b.setIn = places[id]; });
  /* a second, earlier reading of two books (so there is a year before, and a re-read), and two more finished last year */
  const earlier = { "guide-b1": [430, 400, 6], "guide-b5": [520, 500, 8] };
  Object.keys(earlier).forEach(id => { const b = B(id), [s0, e0, mk] = earlier[id]; b.readings = [{ id: "gre" + id, start: day(s0), end: day(e0), mark: mk }].concat(b.readings || []); });
  [["guide-b2", 470, 450, 7], ["guide-b4", 390, 370, 9]].forEach(([id, s0, e0, mk]) => { const b = B(id); b.status = "finished"; b.rating = mk; b.readings = [{ id: "grl" + id, start: day(s0), end: day(e0) }]; });
  /* a book that has sat on the pile for over a year, with the cobweb */
  { const b = B("guide-b6"); b.created = Date.now() - 400 * 864e5; }
  /* pages logged on recent days, for the calendars and the climber's pace */
  [B("guide-b0"), B("guide-b7")].forEach((b, k) => { b.progLog = []; for (let i = 1; i <= 20; i++) if ((i + k) % 3) b.progLog.push({ d: day(i), p: Math.round(b.pages * (0.6 - i * 0.02)) }); });
  B("guide-b0").sessions = [{ secs: 1500, at: Date.now() - 2 * 864e5 }, { secs: 2400, at: Date.now() - 5 * 864e5 }];
  ["guide-b1", "guide-b3", "guide-b5", "guide-b8"].forEach((id, i) => { const b = B(id); b.format = ["print", "ebook", "audio", "print"][i]; b.pubYear = [1998, 2011, 1974, 2020][i]; b.lang = ["English", "English", "Norwegian", "English"][i]; });
  B("guide-b9").from = "a friend"; B("guide-b3").from = "the library";
  B("guide-b9").preds = [{ id: "gp1", t: "The brother knows more than he says", at: day(100), open: true, res: "yes", resAt: day(80) }];
  B("guide-b9").dnf = false;
  quests.eras = [{ id: "gera1", from: day(130), to: day(60), name: "The lighthouse summer", at: Date.now() }];
  settings.taste = { profile: "You read for the place as much as the people: harbours, small towns, weather. Quiet books rate highest with you, and a plot that hurries loses you.",
    high: ["Literary fiction with a strong sense of place", "A mystery told slowly"], quit: ["Anything that opens with a battle"], again: ["Mira Vantwell, every time"], tags: ["coastal: a book you will finish"], from: 8, at: new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10) };
  settings.insTab = "year";
};
const insAt = async (tab) => { insSeed(); await goTab("insights"); await wait(600); insTabSet(tab); await wait(500); window.scrollTo(0, 0); await wait(200); return need("#main"); };
const sec = (sel) => { const e = need(sel); return e.closest(".sec") || e; };
/* the five tabs, and 📝 Write me a full analysis above them */
SHOTS["in-tabs"] = { async at(dev) {
  const m = await insAt("year");
  const bar = need(".instabs"), ana = need("#anaGo");
  const tab = k => $('[data-itab="' + k + '"]', bar);
  return { clip: box([ana.closest(".sec") || ana, bar], dev === "ph" ? 6 : 14), spots: { ana, year: tab("year"), readertab: tab("reader"), numtab: tab("numbers"), timetab: tab("time"), placestab: tab("places") } };
} };
/* one card of a tab, placed at the top of the screen and cut to what fits */
const insCard = async (dev, tab, sel, spots) => {
  const m = await insAt(tab);
  const el = need(sel), card = el.closest(".sec") || el;
  await place(card, 20);
  const r = box(card, 0), mm = m.getBoundingClientRect();
  const out = {}; for (const k in spots) out[k] = typeof spots[k] === "string" ? $(spots[k]) : spots[k];
  return { clip: box({ x: mm.left, y: r.y, w: mm.width, h: Math.min(r.h, stuckFoot() - r.y) }, dev === "ph" ? 6 : 14), spots: out };
};
/* 🎁 Your year, wrapped: the year pills */
SHOTS["in-wrapped"] = { async at(dev) { return insCard(dev, "year", "[data-wrapy]", { wrapy: "[data-wrapy]", booky: "[data-booky]" }); } };
/* ✦ A year in stars */
SHOTS["in-sky"] = { async at(dev) { return insCard(dev, "year", "#secSky", { skyy: "[data-skyy]", skybig: "#skyBig", skysave: "#skySave" }); } };
/* 📅 Month by month */
SHOTS["in-month"] = { async at(dev) { return insCard(dev, "year", "[data-recappic]", { recappic: "[data-recappic]" }); } };
/* the year wrapped, open */
SHOTS["in-wrap"] = { async at(dev) {
  await insAt("year");
  need("[data-wrapy]").click(); await wait(900);
  const pg = need("#wrapPage");
  return { clip: box(pg, 0), spots: { wpsave: $("#wpSave", pg), wpprint: $("#wpPrint", pg), wpx: $("#wpX", pg) } };
} };
/* 🪞 You, as a reader: the sentences and ▸ Show me which */
SHOTS["in-reader"] = { async at(dev) {
  const m = await insAt("reader");
  const gap = need("#gapTog"), card = gap.closest(".sec") || gap;
  /* the sentences run long: the fold is brought to the top, with a few lines above it */
  gap.scrollIntoView({ block: "start" }); await wait(200); window.scrollBy(0, -(stuckTop() + (dev === "ph" ? 160 : 120))); await wait(300);
  const mm = m.getBoundingClientRect(), g = gap.getBoundingClientRect(), top = Math.max(stuckTop(), g.top - (dev === "ph" ? 160 : 120));
  return { clip: box({ x: mm.left, y: top, w: mm.width, h: Math.min(card.getBoundingClientRect().bottom, stuckFoot()) - top }, dev === "ph" ? 6 : 14), spots: { gaptog: gap } };
} };
/* 🏷 Genres, honestly rated */
SHOTS["in-genres"] = { async at(dev) { return insCard(dev, "reader", "[data-gord]", { gord: "[data-gord]" }); } };
/* ✨ Your taste, as Claude reads it (an invented reading kept), and what Claude is told */
SHOTS["in-taste"] = { async at(dev) {
  const r = await insCard(dev, "reader", "#secTaste", { tsedit: "#tsEdit", mefold: "#meFold summary" });
  r.spots.tsread = vis($("#tsRead")) || $("#tsEdit"); if (!r.spots.mefold) r.spots.mefold = $("#meFold");
  return r;
} };
/* 🔢 The numbers: the big number and the tiles */
SHOTS["in-numbers"] = { async at(dev) { return insCard(dev, "numbers", ".bignum", { bignum: ".bignum", stat: ".numgrid .stat" }); } };
/* Pages a day: the calendars */
SHOTS["in-days"] = { async at(dev) { return insCard(dev, "numbers", ".dcal", { dcal: ".dcal" }); } };
/* 🗓 When you finish */
SHOTS["in-finish"] = { async at(dev) {
  const r = await insCard(dev, "time", "[data-ysday]", {});
  /* a marked day, brought into the strip's view: the strips scroll sideways on a phone */
  const d = $$("[data-ysday]").find(e => /(^| )f[1-4]( |$)/.test(e.className)) || $("[data-ysday]");
  d.scrollIntoView({ inline: "center", block: "nearest" }); await wait(300);
  r.spots.ysday = d; return r;
} };
/* 📈 Your reading, drawn */
SHOTS["in-drawn"] = { async at(dev) { return insCard(dev, "time", "#secTimeline", { tlmove: "#secTimeline [data-tlmove]", tlzoom: "#secTimeline [data-tlzoom]", tlview: "#secTimeline [data-tlview]", tlbig: "#secTimeline [data-tlbig]" }); } };
/* 🗓 What you read, and when */
SHOTS["in-period"] = { async at(dev) { return insCard(dev, "time", "[data-insby]", { insby: "[data-insby]", insWhen: "#insWhen" }); } };
/* 🛂 Your passport */
SHOTS["in-passport"] = { async at(dev) { return insCard(dev, "places", "#secPassport", { ppst: "#secPassport .ppst", ppturn: "#secPassport [data-ppturn]" }); } };
/* 🗺 The atlas */
SHOTS["in-atlas"] = { async at(dev) { return insCard(dev, "places", "#secAtlas", { atlasbig: "#atlasBig", atpin: "#secAtlas .atpin" }); } };
/* ⛰ The mountain of unread books */
SHOTS["in-tbr"] = { async at(dev) { return insCard(dev, "places", "#secTbr", { tbrpic: '#secTbr [data-tbrpic="peak"]', tbrme: '#secTbr [data-tbrpic="me"]' }); } };

/* ---- 🎵 invented songs, as the Drive list would hold them ----
   Names of made-up artists and titles; nothing is fetched or played
   (TEST_RUN's stand-in player). Genres and moods as songTags would keep them. */
const MU_SONGS = [["Harbour Lights", "Slow Water"], ["Harbour Lights", "The Last Ferry"], ["Nell Ashgrove", "Paper Moons"], ["Nell Ashgrove", "Winter Kitchen"],
  ["The Orchard Choir", "Cipher"], ["The Orchard Choir", "Lantern Road"], ["Corin Sallow", "Night Train"], ["Corin Sallow", "Meridian"], ["Pell Ashby", "Quill and Marrow"], ["Lio Marchetti", "Field Guide"]];
const MU_GENRE = ["Folk", "Folk", "Indie", "Indie", "Choral", "Choral", "Jazz", "Jazz", "Rock", "Ambient"];
const MU_MOOD = ["calm", "nostalgic", "hopeful", "calm", "intense", "hopeful", "upbeat", "sad", "intense", "calm"];
const musicSeed = () => {
  musicMemo = { at: Date.now(), files: MU_SONGS.map((p, i) => ({ id: "gs" + i, n: p[0] + " - " + p[1] + ".mp3", s: 3500000 + i * 120000, t: 30000 + i * 700 })) };
  songTags = {}; MU_SONGS.forEach((p, i) => { songTags["gs" + i] = [MU_GENRE[i], 100, MU_MOOD[i], 100]; });
  settings.musicSort = "name"; musicFind = ""; musicGenre = ""; musicMood = "";
  try { musicMem.kept = { gs0: { s: 3500000, at: Date.now() }, gs2: { s: 3700000, at: Date.now() } }; } catch (e) {}
  CFG.googleClientId = CFG.googleClientId || "guide.apps.googleusercontent.com";
};
const musicAt = async () => { musicSeed(); setKindTab("music"); await wait(700); window.scrollTo(0, 0); await wait(200); return need("#musicShelf"); };
/* the 🎵 tab's head: the tab, ↻ Look again, 💾 🏷 🎭, 🎧 To Spotify, Keep on this device */
SHOTS["mu-head"] = { async at(dev) {
  const sh = await musicAt();
  const tab = need('.kindtabs [data-kt="music"]'), look = need('[data-music="look"]', sh), keep = vis($("#musicKeep", sh));
  const head = look.closest(".musichead") || look.parentElement, keepRow = keep ? (keep.closest(".hrow2,div") || keep) : null;
  const els = [tab, head, keepRow, $('[data-music="gpause"]', sh)].filter(e => e && e.getClientRects().length);
  const m = need("#main").getBoundingClientRect(), r = box(els, 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: r.h }, dev === "ph" ? 6 : 14),
    spots: { tab, look, keep, spotify: vis($('[data-music="spotify"]', sh)), moodpick: vis($('[data-music="moodpick"]', sh)), genres: vis($('[data-music="gpause"]', sh)) } };
} };
/* the list: the find box, the order pills, genre and mood chips, rows with ▶ */
SHOTS["mu-list"] = { async at(dev) {
  const sh = await musicAt();
  const find = need("#musicFind", sh), sort = need('.mstrip [data-music="sort"]', sh), genre = $('[data-music="genre"]', sh), mood = $('[data-music="mood"]', sh);
  /* a phone's chips take several lines: two rows fit under them, a computer shows four */
  const rows = $$(".mrow", sh).slice(0, dev === "ph" ? 2 : 4), play = $('[data-music="play"]', rows[0]);
  await place(find, 30);
  const m = need("#main").getBoundingClientRect(), r = box([find, sort, genre, mood, ...rows].filter(Boolean), 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: r.h }, dev === "ph" ? 6 : 14), spots: { find, sort, genre, mood, play, drop: vis($('[data-music="drop"]', sh)) } };
} };
/* the rows themselves: ▶ on each, 🗑 on a kept one (a phone's chips push them a screen down) */
SHOTS["mu-rows"] = { async at(dev) {
  const sh = await musicAt();
  const rows = $$(".mrow", sh).slice(0, 3), head = rows[0].previousElementSibling && rows[0].previousElementSibling.matches(".cap2") ? rows[0].previousElementSibling : null;
  await place(head || rows[0], 30);
  const m = need("#main").getBoundingClientRect(), r = box([head, ...rows].filter(Boolean), 0);
  return { clip: box({ x: m.left, y: r.y, w: m.width, h: r.h }, dev === "ph" ? 6 : 14), spots: { play: $('[data-music="play"]', rows[0]), drop: vis($('[data-music="drop"]', sh)) } };
} };
/* ▸ 📲 Songs already in a folder on this device?, open, with 📲 Choose the folder */
SHOTS["mu-folder"] = { async at(dev) {
  const sh = await musicAt();
  const fold = need('[data-music="dirfold"]', sh);
  if (!musicDirOpen) { fold.click(); await wait(400); }
  const box_ = need("#musicDevice");
  await place(box_, 30);
  return { clip: box(box_, dev === "ph" ? 6 : 14), spots: { dirfold: $('[data-music="dirfold"]', box_), dirpick: vis($('[data-music="dirpick"]', box_)) } };
} };
/* the ♪ player open in the corner, a song paused part-way, its words open */
SHOTS["mu-player"] = { async at(dev) {
  await musicAt();
  MP.q = MU_SONGS.map((p, i) => "gs" + i); MP.i = 2; MP.state = "pause"; MP.open = true;
  try { LYR.mem.set("gs2", { t: "Paper Moons", a: "Nell Ashgrove", at: Date.now(), sy: "[00:01.00]Paper moons over the harbour wall\n[00:05.00]And every window lit for no one at all\n[00:09.00]The ferry gone, the tide gone too" }); } catch (e) {}
  mpPaint(); await wait(400);
  try { const a = mpEl(); a.duration = 215; a.currentTime = 72; mpTick(); } catch (e) {}
  try { lyrPaint(); } catch (e) {}
  await wait(300);
  const card = need("#musicCard"), fab = need("#fabMusic");
  const lyr = $('[data-mp="lyr"]', card); if (lyr && !$(".mplyrw", card)) { lyr.click(); await wait(300); }
  return { clip: box([card, fab], dev === "ph" ? 4 : 10), spots: { fab, toggle: $('[data-mp="toggle"]', card), bar: $('[data-mp="seek"]', card), lyr: $('[data-mp="lyr"]', card), open: $(".mpopen a", card), out: $('[data-mp="out"]', card), shuffle: $('[data-music="shuffle"]', card) } };
} };
/* a book's page: 🎵 Its songs at the top, ▸ 🎵 3 songs with ▶ Play under the title */
SHOTS["mu-book"] = { async at(dev) {
  musicSeed();
  const b = books.find(x => x.id === "guide-b0"); b.songs = ["gs0", "gs2", "gs5"]; settings.rdSound = Object.assign({}, settings.rdSound, { "guide-b0": "songs" });
  await bookAt("guide-b0");
  { const f0 = need("[data-songfold]"); if (f0.getAttribute("aria-expanded") !== "true") { f0.click(); await wait(500); } }
  /* the press above redraws the page: everything is found again */
  const pg = need("#edPage"), fold = need("[data-songfold]");
  const line = fold.closest(".vsongs") || fold.parentElement, pick = $("[data-songpick]"), vs = vis($("#vSongs"));
  await place(line, dev === "ph" ? 100 : 70);
  const m = pg.getBoundingClientRect(), r = box([line, $(".vsongbox")].filter(Boolean), 0), top = vs ? Math.min(r.y, vs.getBoundingClientRect().top) : r.y;
  return { clip: box({ x: m.left, y: top, w: m.width, h: r.y + r.h - top }, dev === "ph" ? 6 : 14), spots: { vsongs: vs, songfold: $("[data-songfold]"), songplay: $("[data-songplay]"), songpick: pick } };
} };
/* 🎧 To Spotify, before a Client ID: the four steps */
SHOTS["mu-spotify"] = { async at(dev) {
  await musicAt();
  try { SPF.mem = {}; } catch (e) {}
  spfOpen(); await wait(500);
  const pn = need("#spfPanel");
  /* on a phone the card scrolls: the Client ID box at the foot is brought up */
  if (dev === "ph") { need("#spfCid", pn).scrollIntoView({ block: "center" }); await wait(300); }
  return { clip: box(pn, dev === "ph" ? 4 : 10), spots: { steps: $(".spsteps", pn), cid: $("#spfCid", pn), spotify: $('[data-music="spotify"]') } };
} };

/* ---- 🎬 a made-up film of a made-up book, as a card would keep it ----
   Put on the book only for the pictures below, so no other picture changes.
   The poster is drawn here; the services in Where to watch are invented;
   nothing is asked of TMDB (filmFetch refuses). */
const filmPoster = () => "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513" viewBox="0 0 342 513">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16324f"/><stop offset=".62" stop-color="#2f6f8f"/><stop offset="1" stop-color="#e8b56a"/></linearGradient></defs>' +
  '<rect width="342" height="513" fill="url(#g)"/><circle cx="250" cy="120" r="46" fill="#f6e7c1" opacity=".9"/>' +
  '<path d="M0 400 Q85 360 171 392 T342 380 V513 H0Z" fill="#0f2235" opacity=".85"/>' +
  '<text x="171" y="455" font-family="Georgia,serif" font-size="34" fill="#fff" text-anchor="middle" letter-spacing="3">THE HOLLOW</text>' +
  '<text x="171" y="492" font-family="Georgia,serif" font-size="34" fill="#fff" text-anchor="middle" letter-spacing="3">TIDE</text></svg>');
const filmSeedOn = () => {
  const b = books.find(x => x.id === "guide-b9");
  b.screen = [{ id: "gf1", kind: "film", title: "The Hollow Tide", year: "2021", seen: false,
      info: { src: "tmdb", kind: "movie", id: "900001", url: "https://www.themoviedb.org/", t: "The Hollow Tide", yr: "2021", poster: filmPoster(),
        sum: "An invented summary of a film that was never made: a lighthouse keeper's daughter, a tide that stops coming in, and a town that has to decide what it owes the sea. Long enough to run over several lines.",
        yt: "invented", len: "1 h 58 min", net: "", gen: "Drama, Mystery", at: Date.now() } },
    { id: "gf2", kind: "series", title: "Tidewater", year: "2023", seen: true }];
  b.status = "want";
  settings.tmdbKey = "0123456789abcdef0123456789abcdef"; settings.tmdbRegion = "GB";
  try { filmFetch = async () => { throw new Error("no network in the pictures"); }; } catch (e) {}
  FILM.prov.set("tmdb:movie:900001", { at: Date.now(), r: { GB: { link: "", flatrate: [{ provider_name: "Streamline", logo_path: "" }],
    rent: [{ provider_name: "Picturebox", logo_path: "" }, { provider_name: "Reel Shop", logo_path: "" }] } } });
  return b;
};

/* a book's 🎬 On screen line: the films by name */
SHOTS["book-film"] = { async at(dev) {
  filmSeedOn();
  const pg = await bookAt("guide-b9");
  const screen = need("#screenOpen"), line = screen.closest(".vloan") || screen.parentElement, name = need(".filmname", line);
  await place(line, dev === "ph" ? 120 : 90);
  const m = pg.getBoundingClientRect(), r = box(line, 0), top = r.y - (dev === "ph" ? 70 : 56);
  return { clip: box({ x: m.left, y: top, w: m.width, h: r.y + r.h - top }, dev === "ph" ? 6 : 14), spots: { screen, name } };
} };

/* the card a film's name opens */
SHOTS["film-card"] = { async at(dev) {
  filmSeedOn();
  await bookAt("guide-b9");
  need(".vloan .filmname").click();
  const card = await until(() => { const c = $("#filmCard"); return c && c.querySelector(".filmwhere .filmprov") ? c : null; });
  if (!card) throw new Error("the film's card didn't open");
  card.scrollTop = 0; await wait(300);
  return { clip: box(card, dev === "ph" ? 4 : 8), spots: { post: need(".filmpost", card), play: need('[data-fc="play"]', card), where: need(".filmwhere", card), seen: need('[data-fc="seen"]', card) } };
} };

/* 🎬 Read before you watch, with its switch: Still to watch · Everything on screen */
SHOTS["lib-screen"] = { async at(dev) {
  filmSeedOn();
  const b2 = books.find(x => x.id === "guide-b3");
  b2.screen = [{ id: "gf3", kind: "series", title: "The Orchard Cipher", year: "2019", seen: true }];
  settings.screenAll = true;
  libSetFilter("screen");
  await goTab("library"); window.scrollTo(0, 0); await wait(800);
  const which = need(".scwhich"), still = need('[data-scall="0"]', which), every = need('[data-scall="1"]', which);
  const row = need(".scfilms").closest(".row") || need(".scfilms");
  const name = need(".scfilms .filmname");
  await place(which, 20);
  return { clip: box([which, row], dev === "ph" ? 6 : 12), spots: { still, every, name } };
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
