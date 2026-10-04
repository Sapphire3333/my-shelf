---
name: ship
description: Finish a change to My Shelf and hand it over — measure what it might have broken, run the smoke (and the layout sweep when anything visual moved), write the build's What's new line, commit with a message about the code, take it out of the queue, and end the message on the push block. Use this whenever a piece of work in this repo is done and about to be committed — "ship it", "commit", "wrap up", "that group's done" — even when the change looks too small to need it.
---

# Ship a change

Every change ends the same way. Each step below is here because skipping it
once cost a round trip; the reason sits beside the step so it can be weighed,
not just obeyed.

## 1. Measure what it might have broken

Not what it was meant to do: measuring the thing you just built is a
photograph of your own intention. List the screens and widths the change can
reach and measure those, in the running app, and quote the numbers. Start on
the computer layout (the sweep's `1588 ⛶ at 135%` pass); 900 is only the
breakpoint sample. A defect seen only at a setting nobody uses is a
hypothesis, not a finding.

## 2. The smoke — before every commit, no exceptions

It drives add / stage / rate / progress / finish / import / export / backup /
bin / quests / every screen through the app's own functions, in a throwaway
`myShelf-smoke` database. It is quick, and a commit that skipped it ("only
pictures") once shipped a broken count that CI then caught after the push.

```
preview_start {name: "my-shelf"}                         → a tab on :8766
navigate      http://localhost:8766/dev-check.html
javascript    window.__smoke=undefined; window.__t0=Date.now(); window.__runSmoke(); "started"
javascript    await new Promise(r=>{const t=setInterval(()=>{if(window.__smoke||Date.now()-window.__t0>26000){clearInterval(t);r()}},250)});
              window.__smoke && {bad:window.__smoke.bad, rows:window.__smoke.rows.length,
                failed:window.__smoke.rows.filter(r=>!r.ok).map(r=>r.name+": "+r.note)}
```

Pass is `bad: 0`. If the second call comes back empty, call it again; the run
continues between calls.

If rows fail at the very first step with `reading 'transaction'` or "opened
undefined", that is a stray tab holding the database, not the build:
`tabs_context`, close the strays, run again — or use the `my-shelf-check`
server on 8767, a second origin with its own databases.

## 3. The sweep — whenever anything visual moved

It opens every screen at every width in `PASSES` (dev-check.html) and fails a
cell for anything that scrolls sideways or is squeezed into a one-word column.

```
preview_start {url: "http://localhost:8766/dev-check.html"}   → a FRESH tab
javascript    window.__sweep=undefined; window.__t0=Date.now(); window.__runSweep(); "started"
javascript    (repeat until done — each ~26 s call also keeps the page awake)
              await new Promise(r=>setTimeout(r,26000));
              window.__sweep ? {bad:window.__sweep.bad, cells:Object.keys(window.__sweep.results).length,
                skipped:Object.values(window.__sweep.results).filter(v=>v&&v.skip).length,
                failed:window.__sweep.failed.slice(0,8)}
              : document.getElementById("prog").textContent
```

About two minutes. Then close the tab.

- **One sweep per tab.** A tab that has already swept starts timing whole
  passes out. A whole pass failing at once ("gave up after 60s — still
  measuring …" on every view of one width) is the tab, not the app: re-run in
  a fresh tab before believing it. A single red cell is real.
- **Skipped is not passed.** Read `skipped`. With leftover test books in the
  pane's own database the collection column goes blank; delete them.
- The sweep never opens a collection's editor or anything behind a fold.
  Measure a change there yourself.

## 4. What's new — every build that changes the app

`WHATS_NEW` in index.html (search `const WHATS_NEW=[`) feeds the "Since you
last looked" card on Today. It is the only place a build announces itself; a
build without a line looks, from outside, exactly like nothing changed.

- Newest first. Stamp `v:` with the build this commit is ABOUT to become: read
  `version.js` — if its date is today, its number + 1, otherwise today's date
  `.1`. The pre-commit hook writes version.js after staging, so it cannot be
  read off afterwards.
- Shape: `{v:"2026-10-05.1",go:["tab:library"],lines:["<b>📚 One-line headline.</b> What changed and where to find it…"]}`.
  `go` is optional: `"tab:<view>"` or `"el:<view>:<selector>"` to jump there.
- Voice: speak to the reader ("your shelf", "you"), say what is different and
  where it lives. Never quote the shelf's contents back — no titles, authors or
  numbers off it — because the file is public.
- A commit that touches no app behaviour (dev-check, `.claude/`, `.github/`)
  needs no line, but it still becomes a build: the hook stamps every commit.
  The next app commit's entry, stamped higher, covers the gap. Two tooling
  commits in a row are the exception — the hook refuses the second, since the
  build before it shipped with no line; commit that one as
  `SKIP_NEWS=1 git commit -F <file>`, which is the hook's own way of saying
  "needs none" (it still stamps the build).

## 5. Commit

- Delete scratch copies first (`__t*.html` and other `__*` files in the root)
  and read `git status`.
- One commit per unrelated change; related ones share.
- The message says what changed in the code and where — subject: the change,
  summarised; body: prose paragraphs naming the function, selector or file and
  how to find it again, with the measured facts that explain it. Never who
  decided it, never the conversation, never anything about the owner's own
  device, settings or shelf. A user-level hook refuses a message that does;
  rephrase it, don't route around it.
- Write the message to a file in the scratchpad with the Write tool, then
  commit from Bash: `git add <files> && git commit -F <file>`. Never edit a
  file of this project through PowerShell: it rewrites UTF-8 as ANSI and turns
  every em-dash and emoji in index.html into mojibake.

## 6. Hand it over

- Take what shipped out of the queue memory (`my-shelf-todo-next`). It is a
  queue, not a ledger; `git log` is the ledger.
- The message: what shipped, the numbers (smoke n/n, sweep n/n, before → after),
  anything found in the code on the way, and what is next in one clause. Then
  stop — one group per message; the gap is for their reply.
- Never push. The last thing in the message is a fenced `bash` block holding
  exactly `git push` — one plain command, nothing bash-only, because it is
  pasted into Windows PowerShell 5.1.
