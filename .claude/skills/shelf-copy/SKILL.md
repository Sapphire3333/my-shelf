---
name: shelf-copy
description: Try a change on a copy of the owner's own shelf (their books, import list and Drive file list) in a database of its own on this computer, before they press anything. Use when a change depends on real titles, file names or rows: matching, duplicates, series, import, Drive. Never for anything public.
---

# Test on a copy of the shelf

The smoke and the sweep run on invented books. Most of what goes wrong is in
real names: a Drive file cut off mid-bracket, a story kept under a shorter
title, two editions of one book. This is how to see those before the owner
does.

## 1. The copy

They press **⚙ Settings → Export & import → 🧪 Save a copy for testing** on
the computer (`exportTestCopy`). It writes `my-shelf-test-copy-<date>.json`
to Downloads: every book's words, the import list, this device's Drive file
list and the settings. No covers or pictures, so it is a few MB.

Copy the newest one into `~/.claude/shelf-copy/` and nowhere else.

**It is private.** Never into the repo, a commit, a code comment, What's new,
a test page row or anything else that leaves this computer. Titles from it may
be named to the owner in the chat, as their screenshots are.

## 2. Load it

Serve the folder (bound to 127.0.0.1, with CORS so the app's port can fetch
it), with a `.claude/launch.json` entry (that file is not in the repo):

```
{"name":"shelfcopy","runtimeExecutable":"python",
 "runtimeArgs":[".claude/skills/shelf-copy/serve.py","8793","C:/Users/<you>/.claude/shelf-copy"],"port":8793}
```

Start the app's own preview server first. With it stopped, a service worker
left by an earlier visit answers with an older build and none of this is
there: check `typeof copyLoad==="function"` before going on.

Open the app at `index.html?db=copy`. That is `myShelf-copy`, a database of
its own (`COPY_DB`): it never syncs (`initSync` stops at once), never makes a
sound, has no service worker, and keeps its Drive list under its own key.
Then, from `javascript_tool`:

```js
await copyLoad(await (await fetch("http://localhost:8793/<file>.json")).json())
```

`copyLoad` empties `myShelf-copy` and writes the copy in. It refuses to run
anywhere but `?db=copy`.

## 3. Ask it things

Read-only questions first, and give the owner the answer with numbers:

- Drive: `drvConnectFind(drvFilesMemo.files)` → how many sure, how many to check, a few of each.
- Copies and twins: `storyCopies()`, `shelfTwins()`, `impTwins()`.
- The import list: `markDupes()` then count `dupe` / `near`.
- A ReadEra backup they put beside the copy: `loadReadEraBlob(file)`.

Claude, Hardcover and Google Drive are not reachable here (no sign-in): stand
them in, as the smoke does. Pressing a button writes only into `myShelf-copy`;
load the copy again to start clean.

## 4. After

Anything learned from the copy that should stay checked goes into the smoke
(`dev-check.html`), rewritten with invented names of the same shape.
