# 📚 My Shelf

A personal book tracker that lives in **one HTML file**. No account required, no
server required, no build step, no framework — open `index.html` in a browser and
you have a full reading journal that works completely offline. If you want the same
library on your PC and your phone, add a free Supabase project and it syncs too.

Track what you've read, rate it, keep quotes and notes, decorate each book's page
like a scrapbook, and pull your history in from Goodreads or StoryGraph.

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
- Statuses: *Finished · Reading now · Want to read*, plus **DNF** with your own
  reasons ("slow pacing", "didn't connect with the characters"…)
- Ratings out of 10, favorites, rereads, page counts, finish dates
- Reading progress with a live progress bar while a book is "Reading now"
- Series (book 3 of 7 — sibling books link up automatically) and **collections**
  (one entry holding many stories, each with its own cover, rating and notes)
- Not just books: track **fanfics** and **AI stories**, with fandoms, characters
  and a link to the source
- Genres with per-genre colors, keywords, audience ("Middle Grade", "Adult"…)

**The book page**
- Rich-text summary, free notes, *what I liked / what I didn't* lists, quotes
- Cover images, plus any number of pictures you can **drag, tilt, flip, layer,
  resize** and fade anywhere on the page
- Sticky notes in different papers and shapes (hearts, clouds, speech bubbles…)
- **Draw mode** — pen, highlighter, arrows and shapes that stick to whatever you
  drew them on: the page, a picture, or a note
- **Tag mode** — click any word in your notes to turn it into a keyword
- A **background-remover** for pictures (magic-wand style, all in the browser)
- Custom page backgrounds — presets or your own images, per book or app-wide

**Finding things again**
- Search across titles, authors, series, genres, keywords, quotes, summaries,
  notes and fandoms — you choose the scopes
- Browse by author, series, genre combinations, rating buckets, book length
- Stats corner: averages, most-read author, highest-rated genre, books per year
- 🎲 *Pick for me* — a random suggestion from your want-to-read pile
- Library views: list or cover grid, sorted and grouped how you like

**Safety nets**
- Automatic daily backups kept inside the browser, plus one-click manual backups
- Full **export/import** to a single JSON file (the format is stable across versions)
- Deleted books wait in a 30-day trash — with their covers and pictures — before
  they're really gone
- Undo/redo for everything, including deletes (Ctrl+Z works app-wide)
- Light/dark theme, and a phone-friendly "Fit" layout

**Import**
- Bring your history in from a **Goodreads** or **StoryGraph** CSV export — you
  preview the list and pick what to add; duplicates (by ISBN, or title + author)
  are detected and skipped

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

### Put it on your phone's home screen

Open your URL in the phone's browser and choose **Add to Home Screen** (Share menu
on iOS, ⋮ menu on Android). It installs like an app, opens full-screen with its own
icon, and works offline.

---

## Importing from Goodreads or StoryGraph

1. Export your library:
   - **Goodreads:** My Books → Import and Export → Export Library → download the .csv
   - **StoryGraph:** Manage Account → Manage Your Data → Export StoryGraph Library
2. In My Shelf: **Overview tab → Import from Goodreads / StoryGraph → Choose an
   export file**.
3. You get a preview grouped by status (Read / Currently reading / Want to read /
   DNF). Nothing is added until you pick it — add books one by one or a whole
   section at once. Ratings, page counts, dates read, rereads, reviews and shelves
   all come across; titles already on your shelf are marked and skipped.

## Backups — please make them

Your library lives in your browser. Browsers are generally careful with it (the app
asks for persistent storage), but the only backup *you* control is the one you
export:

- **Overview → Export backup file** downloads a single `.json` with every book,
  cover, picture, note and setting.
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
| `manifest.json`, `icon.svg`, `icon.png` | Home-screen install bits. |

*Vanilla JS, no build step, no framework, no npm. The only runtime dependency is
`@supabase/supabase-js`, loaded from a CDN — and the app runs fine without it.*
