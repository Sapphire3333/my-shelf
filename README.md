# 📚 My Shelf

A personal book tracker that lives in **one HTML file**. No account required, no
server required, no build step, no framework — open `index.html` in a browser and
you have a full reading journal that works completely offline. If you want the same
library on your PC and your phone, add a free Supabase project and it syncs too.

Track what you've read — and every time you've read it — rate it, keep quotes and
notes, decorate each book's page like a scrapbook, read an ebook inside it, and
pull your history in from Goodreads or StoryGraph. Around the shelf there is a
game, if you want one: daily tasks, challenges, medals, an arcade of small games
made from your own books, cards, a room that grows and a pet.

---

## Why you might like it

- **Your data is yours.** Everything is stored in your browser (IndexedDB) — not on
  someone else's servers. Sync, if you turn it on, goes to *your own* free Supabase
  project, protected by row-level security so only your login can read it.
- **Works offline, always.** It's offline-first by design: reading and editing never
  touch the network. Sync is a layer on top that catches up whenever you're online.
- **No lock-in.** One button exports your whole library — books, covers, pictures,
  notes — as a single JSON file that imports back in anywhere.
- **Free.** GitHub Pages hosts it for free; Supabase's free tier is far more room
  than a personal library needs.
- **It's more journal than database.** Books get a real page of their own, not just
  a row: rich notes, quotes, pros/cons, draggable pictures, sticky notes, drawings.

## What it does

**Tracking**
- Stages: *Want to read · Reading now · Finished*, plus **⏸ On hold** and
  **✕ Did not finish**, each with your own reasons ("slow pacing", "waiting for
  the next one"…), and **⌛ Don't have it yet** for the ones you want and haven't
  got
- Marks out of 10, favourites, page counts, and a guess at the mark while you read
- The book itself: print, ebook or audiobook (with its length), the year it came
  out, the language you read it in, who it came from and where it is set
- When you finish, the day is today unless you say otherwise: *Yesterday* or
  *Another day* is one press away
- Loans — lent to or borrowed from someone, and since when — and a reading
  clock that times a sitting and moves your bookmark
- A **readings list** on every book: each time you've read it, with a start date
  and a finish date. Choosing *Reading now* opens a reading, *Finished* closes
  it, and choosing *Reading now* again months later is the reread — no extra
  button and nothing to confirm. Every date is yours to correct, and any reading
  can be struck off, right on the book's own page
- Reading progress with a live progress bar while a book is "Reading now"
- Series — book 3 of 7, with sibling books linking up automatically
- **Collections**: one entry holding many stories, where each story is a thing in
  its own right. It can have its own cover, rating, notes, favourite, genres,
  author, stage and readings — each of them defaulting to *same as the
  collection*, so you only fill in what actually differs. A story that does
  differ steps out onto the shelf in the view its difference is about: its own
  genre under Genre, its own stage under Reading now. A collection's rating is
  the average of its stories until you set one yourself
- Not just books: track **fanfics** and **AI stories**, with fandoms, characters
  and a link to the source
- Genres with per-genre colours, tags in families with a colour each, audience
  ("Middle Grade", "Adult"…)

**The book page**
- Books open ready to read or ready to write in — your choice (👁 / 📖✎) — and the
  page swaps either way with ✎ Edit / 👁 Done. Reading it, you can still change
  its stage, its rating, its readings and its favourite without opening the form
- Rich-text blurb, free notes, *what I liked / what I didn't* lists, quotes
- **📖 Read it here** — give it an EPUB, an HTML page or a text file and read it
  inside the app: it keeps your place, and a selected line becomes a quote with
  its page
- A map of your own to pin places and chapters on, and the book's places on an
  atlas of the world
- Cover images, plus any number of pictures you can **drag, tilt, flip, layer,
  resize** and fade anywhere on the page
- Sticky notes in different papers and shapes (hearts, clouds, speech bubbles…)
- **Draw mode** — pen, highlighter, arrows and shapes that stick to whatever you
  drew them on: the page, a picture, or a note
- **Tag mode** — click any word in your notes to turn it into a tag
- A **background-remover** for pictures (magic-wand style, all in the browser)
- Custom page backgrounds — presets or your own images, per book or app-wide

**Getting books in**
- ⚡ *From text / photo* — paste a blurb, or drop a photo of a cover or a page,
  and the title, author and details are read off it. The text recognition runs
  in your browser; nothing is uploaded
- 📕 *By ISBN or barcode* — type the number or photograph the barcode
- 🔎 *Auto-fill* — one press looks a book up (Google Books, Apple Books, Open
  Library, Hardcover once its function is set up, and AniList and Kitsu for comics and light novels) and
  offers its blurb, genres, tags, pages, year, language and cover for you to apply
- Import a **Goodreads** or **StoryGraph** export, a ReadEra backup, Kindle
  highlights, or a fanfic list as CSV — see below
- Fold books you already have into a collection, or link them as a series,
  without retyping anything

**Finding things again**
- Ten tabs: 🏠 Today, 📚 Library, 🎲 Challenges, 🏅 Medals, 🔍 Search,
  ✨ Insights, ❝ Quotes, 🕘 History, 🧰 Shelf care and ⚙ Settings. On a phone the
  first four sit in a bar at the foot of the screen and the rest behind ⋯ More
- 🏠 *Today* — what you're reading, what's next, the year against your aim (in
  books, pages or both), and the day's small things
- 📚 *Library* — as a list, a wall of covers or a row of spines, grouped by genre,
  author, series, kind, stage or cover colour, filtered by stage, kind, format or
  favourites, and placed on drawings of your own bookcases
- 🔍 *Search* across titles, authors, series, genres, tags, quotes, blurbs,
  ISBNs, notes and fandoms — you choose the scopes — and browse by author,
  series, genre combinations, marks, length and format
- ✨ **Insights** — what your shelf says about you, in plain sentences: what you
  read most against what you rate highest, your finish rate and why you stop,
  books and pages per year, the decades your books come from, a timeline of
  every dated reading, a year wrapped, and an atlas of where they are set
- ❝ *Quotes* — every line you've kept, on one wall
- 🕘 *History* — your books by when you last changed them, a list of every
  change on either device, the reading timeline, and the bin
- 🧰 *Shelf care* — imports, what's missing from your books, and tidying up
  duplicates and spellings

**The game, if you want it**
- XP and levels, earned by reading and by looking after the shelf
- 🎲 *Challenges* — three small tasks a day, a dare drawn blind from your
  want-to-read pile, errands, the week's goal, a year of twelve genres, bingo,
  a rainbow of covers, a readathon, a long road walked a page at a time, and
  challenges of your own
- 🏅 *Medals* on fifteen-rung ladders, each able to list the books behind it
- An arcade of small games made from your own shelf — guess the book from a
  line, name a cover from a sliver, a crossword, a jigsaw of a cover and more
- Cards and booster packs, a room you furnish one finished book at a time, and
  a pet that grows with your pages
- The corner notes, the sounds and the creatures can be turned down or off in
  ⚙ Settings

**Safety nets**
- Automatic daily backups kept inside the browser, plus one-click manual backups
- Full **export/import** to a single JSON file (the format is stable across versions)
- Deleted books wait in a 30-day trash — with their covers and pictures — before
  they're really gone
- Undo/redo for everything, including deletes (Ctrl+Z works app-wide), so
  nothing undo can put back stops to ask first
- Light and dark themes and accent colours; the layout rearranges itself for
  the width it has, from a computer down to a small phone with big text

---

## Getting started

### Option 1 — just use it (2 minutes, no account)

1. Download this repository (green **Code** button → *Download ZIP*) and unzip it.
2. Open `index.html` in Chrome or Edge.

That's it. The app runs in local-only mode: no login screen, everything saved in
that browser. Export a backup now and then and you're safe.

### Option 2 — host it on GitHub Pages (free, gives you a URL)

1. **Fork** this repository (or push a copy to your own GitHub account).
2. On your repo: **Settings → Pages → Build and deployment → Source**, choose
   **Deploy from a branch**, branch `main`, folder `/ (root)`, **Save**.
3. After a minute your app is live at `https://<your-username>.github.io/my-shelf/`.

Without sync configured it still runs in local-only mode — each browser keeps its
own library. To share one library across devices, do Option 3 too.

### Option 3 — turn on sync (≈10 minutes, once)

This gives you a private login and the same library on every device.

1. Go to [supabase.com](https://supabase.com), sign in, **New project**. Any name,
   any strong database password (the app never needs it). Wait for setup to finish.
2. In the sidebar open **SQL Editor → New query**. Copy **all** of `schema.sql`
   from this repo, paste, **Run**. You should see "Success". This creates the
   `books` and `meta` tables, the `shelf` storage bucket, and the security rules
   that lock every row and image to your login.
3. Open **Project Settings → API** and copy two values:
   - **Project URL** — like `https://abcd1234.supabase.co`
   - the **anon / public** key (on newer projects it's labelled *Publishable key* —
     either works)
4. Edit `config.js` in your repo and paste them in place of the `YOUR_…`
   placeholders. Commit and push; Pages redeploys itself.
5. Open your live URL, **Create an account** (email + password, 6+ characters),
   and you're in. On your phone, open the same URL and sign in with the same
   account — same library.

> **Tip:** Supabase asks new accounts to confirm their email by default. For a
> personal app you can turn that off under **Authentication → Sign In / Providers
> → Email → Confirm email**, and account creation logs you straight in.

> **Note:** the URL and anon key in `config.js` are public *by design* — it's safe
> to commit them. Your data is protected by row-level security, not by hiding keys.

### Optional — a Google Books key for Auto-fill

The 🔎 Auto-fill button works with no setup, but Google's keyless quota is shared
per network and sometimes runs dry (the app then falls back to Open Library, which
still gives a blurb, tags and a cover). For consistently richer results, get a free
key: [console.cloud.google.com](https://console.cloud.google.com) → create a project
→ enable the **Books API** → **Credentials → Create credentials → API key**, and
paste it into `googleBooksKey` in `config.js`. Restrict the key to your site
(Websites → `https://<your-username>.github.io/*`) and it's safe to commit.

### Put it on your phone's home screen

Open your URL in the phone's browser and choose **Add to Home Screen** (Share menu
on iOS, ⋮ menu on Android). It installs like an app, opens full-screen with its own
icon, and works offline.

---

## Importing from Goodreads or StoryGraph

1. Export your library:
   - **Goodreads:** My Books → Import and Export → Export Library → download the .csv
   - **StoryGraph:** Manage Account → Manage Your Data → Export StoryGraph Library
2. In My Shelf: **🧰 Shelf care → the import card → choose the export file**.
   With the Goodreads function set up in Supabase (`goodreads-function.ts` says
   how), a Goodreads shelf can also be brought in straight from its feed.
3. You get a preview grouped by status (Read / Currently reading / Want to read /
   Did not finish). Nothing is added until you pick it — add books one by one or a whole
   section at once. Ratings, page counts, dates read, rereads, reviews and shelves
   all come across; titles already on your shelf are marked and skipped.
4. You can also land a set of them as **one collection** — pick a series, name it,
   and each book becomes a story inside a single entry, keeping its own rating,
   stage and finish date.

Imported books are marked as untouched until you open and edit one, so you can
always find the ones you haven't been through yet.

## Backups — please make them

Your library lives in your browser. Browsers are generally careful with it (the app
asks for persistent storage), but the only backup *you* control is the one you
export:

- **⚙ Settings → You and your things → ⭳ Export backup file** downloads a single
  `.json` with every book,
  cover, picture and note, and the lists you've built up — genres, fandoms,
  tag colours, backgrounds. Not this device's own preferences (text size,
  theme, which background you picked): those stay where they are, so restoring
  onto another device doesn't drag its appearance across with the books.
- **Import backup file** merges it back in — books you've added since are kept,
  matching books return to their backed-up version.
- Automatic daily snapshots are also kept inside the browser (restorable in one
  click), but they live in the same browser as the data — the exported file is the
  one that survives anything.

## How sync works (so you can trust it)

- **Local first.** The copy in your browser is the source of truth. Nothing waits
  on the network.
- **Push on save.** Every autosave queues an upload. Offline? The queue is saved
  and flushes itself when you're back on — it survives closing the tab.
- **Pull on open.** Signing in, coming back online, or returning to the tab fetches
  what other devices did meanwhile.
- **Conflicts** are resolved per book by edit time — the newest edit wins. No merge
  prompts.
- **Covers and pictures** are compressed JPEGs in your private storage bucket,
  cached locally so pages open instantly.
- **Signed out ≠ locked out.** Your local library is always reachable — there's a
  "use offline" button on the sign-in screen — and signing into a different account
  than the device last synced with asks before mixing libraries.

## FAQ

**Is it really free?** Yes. GitHub Pages hosting is free, Supabase's free tier
(~500 MB database + 1 GB file storage) is far beyond what compressed covers and
pictures of a personal library use. No other services involved.

**Anyone can open my URL — can they see my books?** No. They see a sign-in screen.
Every row and file in Supabase is scoped to your user id; without your login the
data is unreachable.

**What if I never set up Supabase?** The app just runs in local-only mode forever —
that's a fully supported way to use it, not a degraded one.

**What if Supabase is down?** You won't notice much: the app reads and writes
locally and shows "Sync paused — will retry". It catches up on its own.

**Can I use it without GitHub too?** Yes — it's one HTML file. Keep it in a folder,
open it in a browser, done.

## The files

| File | What it is |
|------|------------|
| `index.html` | The entire app — HTML, CSS and JS in one file. |
| `config.js` | Your Supabase URL + anon key. Placeholders = local-only mode. |
| `schema.sql` | Paste-once Supabase setup (tables, bucket, security rules). |
| `sw.js` | Service worker so the app itself opens offline. |
| `version.js` | Build stamp, rewritten by the pre-commit hook. The app shows it, and the offline cache is named after it. |
| `dev-check.html` | Developer tool, not part of the app — opens every screen at a row of widths and fails loudly if anything scrolls sideways. |
| `CLAUDE.md` | Standing instructions for Claude sessions working on the repo — how to ask, and how a change made in a cloud session is pushed, merged and checked. Not part of the app. |
| `goodreads-function.ts`, `hardcover-function.ts` | Two small Supabase edge functions, pasted in once: one reads a Goodreads shelf's feed, the other asks Hardcover for a book. Each file says how to set it up. Optional. |
| `.github/` | The `checks` workflow: after every push to `main` it runs the smoke test and the layout sweep from `dev-check.html` in a browser and keeps the report. |
| `.claude/` | Hooks and skills for Claude sessions working on the repo. Not part of the app. |
| `.githooks/pre-commit` | Stamps `version.js`. Run `git config core.hooksPath .githooks` once per clone or it never fires. |
| `art/` | The app's own pictures: medals, games, five cards and the owl's five moods, as WebP. A spot with no picture of the reader's own wears the one here. Listed with a fingerprint each as `ART` in `index.html`; the two are written together from a pictures file the app saves, so change both or neither. |
| `manifest.json`, `icon.svg`, `icon.png`, `icon-512.png`, `icon-maskable-512.png` | Home-screen install bits. `icon-maskable-512.png` is the full square an Android phone cuts its own shape from; `icon-512.png` and `icon.svg` are rounded already; `icon.png` is the iPhone's. |

*Vanilla JS, no build step, no framework, no npm. The only runtime dependencies are
`@supabase/supabase-js` (CDN, optional — the app runs fine without it) and
`tesseract.js` (CDN, fetched only if you use the read-a-photo quick add).*
