# My Shelf — hosted, with login & cross-device sync

Your book tracker, now publishable to the web with a private login so the same
library shows up on your PC and your phone. It stays **offline-first**: everything
still lives in the browser and keeps working with no connection — changes just sync
up to your own private cloud when you're back online.

Nothing about the app's look or features changed. Same tabs, same editor, same
backup format. The only additions are a **sign-in screen**, a small **account row**
(your email + Sign out), and a subtle **sync status** next to the backup buttons.

---

## Files in this folder

| File | What it is |
|------|------------|
| `index.html` | The whole app (this is what GitHub Pages serves). |
| `config.js` | Your Supabase URL + anon key. Edit this. Safe to make public. |
| `schema.sql` | Paste-once setup for your Supabase database + storage. |
| `README.md` | This guide. |

> Until `config.js` has real values, the app just runs in **local-only mode**,
> exactly like the old offline file — no login, no sync. Fill it in to turn sync on.

---

## Setup — do these once

### 1. Create your Supabase project (stores your data — nobody else's)

1. Go to **supabase.com**, sign in, **New project**. Pick any name and a strong
   database password (you won't need it for the app). Wait for it to finish setting up.
2. In the left sidebar open **SQL Editor → New query**. Open `schema.sql` from this
   folder, copy **all** of it, paste, and press **Run**. You should see "Success".
   This creates your `books` and `meta` tables, the `shelf` storage bucket, and the
   security rules that lock every row and image to *you*.
3. Open **Project Settings → API**. Copy two values:
   - **Project URL** — looks like `https://abcd1234.supabase.co`
   - the **anon** / **public** key (a long `eyJ…` token; on newer projects it may be
     labelled *Publishable key* — either works).
4. Open `config.js` and paste them in, replacing the `YOUR_…` placeholders:
   ```js
   window.SHELF_CONFIG = {
     url: "https://abcd1234.supabase.co",
     anonKey: "eyJhbGciOi…"
   };
   ```

> **Smoother first sign-in (optional):** Supabase asks new accounts to confirm their
> email by default. For a personal, one-person app you can skip that — go to
> **Authentication → Sign In / Providers → Email** and turn **Confirm email** off.
> Then "Create an account" logs you straight in. (Or leave it on and just click the
> confirmation link Supabase emails you.)

### 2. Put it on GitHub Pages (free hosting)

`gh` (the GitHub CLI) isn't installed here, so create the repo in the browser and
push with plain `git`:

1. On **github.com**, click **New repository**, name it `my-shelf`, keep it **Public**
   (Pages is free for public repos), and **don't** add a README/licence. Create it.
2. In a terminal in **this folder** (`C:\Users\sinam\my-shelf`), run — using the URL
   GitHub shows you:
   ```bash
   git remote add origin https://github.com/<your-username>/my-shelf.git
   git branch -M main
   git push -u origin main
   ```
   (Git will ask you to sign in to GitHub the first time.)
3. On the repo page: **Settings → Pages**. Under **Build and deployment → Source**
   choose **Deploy from a branch**, branch **main**, folder **/(root)**, **Save**.
4. Wait ~1 minute, then reload. Pages shows your live URL:
   **`https://<your-username>.github.io/my-shelf/`** — that's the app.

### 3. First login + bring your existing books over

1. Open the live URL. You'll see the sign-in screen. **Create an account** with your
   email + a password (6+ characters), or use **Email me a link instead**.
2. Once you're in (empty shelf), click **⭱ Import backup** and pick the backup you
   exported from your old offline file. Your books, covers, pictures, genres and
   everything else load in — and then upload to your cloud automatically
   (watch the status say *Syncing… → Synced ✓*).
3. On your **phone**, open the same URL, sign in with the same email/password, and
   your library appears. Add or edit on either device; reload the other to see it.

---

## How the sync works (so you can trust it)

- **Local first.** The browser's local copy is still the source of truth. Reading and
  editing never wait on the network.
- **Push on save.** Every autosave also queues an upload. If you're offline, the queue
  waits and flushes automatically when you're back on (`Offline — will sync`).
- **Pull on login/open.** On sign-in it fetches your cloud copy and merges it in.
- **Conflicts:** resolved per book by an edit timestamp — the newest edit wins. No
  merge prompts, no surprises.
- **Covers & pictures** are stored as compressed JPEGs in your private `shelf` bucket
  and fetched on demand (with a local cache), so opening a book is fast.
- **Security:** the URL and anon key in `config.js` are public *by design*. Your data
  is protected by Row Level Security — every row and file is scoped to
  `auth.uid()`, so one signed-in account can never see another's data.

## Good to know

- **The app is public on the internet; your data is not.** Anyone can load the page,
  but they see only a login screen — the books are unreachable without your sign-in.
- **Free-tier headroom:** Supabase gives ~1 GB of file storage and GitHub ~1 GB of
  repo. Because covers/pictures are compressed to JPEG, you'd need *thousands* of
  images to get close. If you ever did hit the limit, new image uploads would start
  failing while everything else keeps working — plenty of warning.
- **Export backup still works** and is still your ultimate safety net. Use it now and
  then; the JSON it makes also still imports back into the old offline file.

---

*Built on the original single-file app — vanilla JS, no build step. The only runtime
dependency is `@supabase/supabase-js`, loaded from a CDN.*
