---
name: corrections
description: Do a whole-shelf job for My Shelf here, in Claude Code, from a copy of the shelf, and hand the app one corrections file to load in Shelf care → 📥 Corrections from a file, instead of the app paying for Claude per press. Use for series, blurbs, page counts, and the later kinds (genres, tags, Set in, names written two ways, who an author is, on screen, coming next).
---

# A corrections file

Big one-off jobs over the whole shelf cost money when the app asks Claude for
each book. Done here they come out of the owner's Claude plan instead, and come
back as **one file** the app reads: 📥 Corrections from a file, in 🧰 Shelf care,
shows each change beside what the shelf has now, ticked, and nothing changes
until ✓ Use these (one ↶ takes a press back). The app's own buttons stay for
day-to-day use.

## 1. The copy

The job works from a copy the owner saves with ⚙ Settings → Export & import →
🧪 Save a copy for testing (see the `shelf-copy` skill). Use the newest one in
`~/.claude/shelf-copy/`. The file you write is only as fresh as that copy: the app
checks each change's title and present value against the shelf as it is now,
and anything changed since starts unticked and says so.

**It is private.** The copy and every corrections file stay on this computer:
never into the repo, a commit, a code comment, What's new or a test row.

## 2. Write it with corr.py

`corr.py` beside this file reads the copy and writes the file, so every job
writes the same shape. Run Python with `-I`:

```python
import sys; sys.path.insert(0, r"<repo>/.claude/skills/corrections"); import corr
shelf = corr.load(r"C:/Users/<you>/.claude/shelf-copy/my-shelf-test-copy-<date>.json")
out = corr.File("Series for the import list", shelf)
out.series(row, "Series Name", "2", why="what says so", sure=True)   # a row of shelf.rows, or a book
out.series(row, "", why="a standalone")                             # in no series
out.blurb(book, "the blurb", story=entry, why="…", src="https://…")
out.pages(book, 240, story=entry, src="…")
print(out.write())   # → Downloads/my-shelf-corrections-<date>-<job>.json
```

Tell the owner the file's name and where it is, and that it loads on the
computer from Shelf care.

## 3. The format

```json
{"myShelfCorrections": 1, "made": "2026-11-09T15:00:00", "copy": "2026-11-09",
 "job": "Series for the import list",
 "changes": [ {"kind": "series", "row": "<import row id>", "title": "…", "author": "…",
               "was": "Old Name #1", "series": "Name", "num": "2", "why": "…", "sure": true} ]}
```

Every change has a `kind`, its target, and `title` / `author` as they were in the
copy. The target is `"book": "<id>"` (with `"story": "<entry id>"` for a story in
a collection) or, for the import list, `"row": "<id>"` (found again by title and
author if the list was loaded afresh). `was` is the value the change replaces,
as it stood in the copy; `why` and `src` are shown beside it.

| kind | what it does | its fields |
|---|---|---|
| `series` | becomes the answer of the import list's ✨ Suggested series and the Library's ✨ Find their series; nothing is made until 📚 Make them there | `series` ("" = in no series), `num`, `sure` = checked on the web here, so the app's check counts it as done |
| `whole` | one series as it should stand: wrong stories out (back to books of their own, or, when `to` names the series they belong to, into that series' collection at its number, made if there is none), one book twice made one, loose books moved in, missing ones added as Want to read with pages and blurb, all in series order; a new collection when `book` is absent | `name`, `author`, `book` + `was` (its story ids in the copy), `items` ({story}/{book}/{add}) in order, `out` ({story, why, to?: {name, pos}}), `drop` — write it with `corr.File.whole` |
| `blurb` | replaces a book's, story's or collection's blurb | `to` (plain text, blank lines between paragraphs) |
| `pages` | sets the page count | `to` (digits) |

Kinds named for later jobs, which this build counts and keeps but can't use
yet: `genres`, `tags`, `setin`, `rename`, `author`, `screen`, `upcoming`. Each one
is added to `CORR_DO` in index.html (door 📥 CORRECTIONS FROM A FILE) with
its job, and here with its fields. A new kind never needs a new loader.

## 4. How sure to be

- Only what you are sure of. A book you aren't sure of is left out, not guessed.
- Check on the web (WebSearch) anything you'd only be guessing from memory,
  and mark a series answer you checked `sure`. The in-app series finder's own
  guesses went wrong exactly where memory was trusted: two standalones by one
  author taken for a series, a standalone placed beside a real #1.
- A title that already names its series, "(Series, #2)", needs no answer.
- The copy must carry the series finder's own answers (`copy.serFind`; copies
  saved from build 2026-11-09.10 on do). Without them the file can't see what
  ✨ Find the series already said, and every disagreement arrives unchecked.
  Where your answer differs from the finder's, check it on the web and mark it
  `sure`, or leave it out: the app starts an unchecked disagreement unticked.
  The same series under a longer or shorter name, at the same number, counts
  as the same answer and keeps the finder's name.
- `sure` goes on a standalone too ("" series) when the web said so.
- For `whole`: take a story out only when it is surely another series or
  another author's; make one only what is truly one book (a translation of the
  same book is one; a sequel isn't). A missing book's blurb follows the Better
  blurbs rules (only what is about its story: no praise, series talk, ages or
  links) and its pages are a print edition's. Stories keep no year in the app.
- What `whole` needed, measured on a batch of 100 series:
  - Hardcover's series lists skip numbers (one held 41 of 62 books; on
    another, the four numbers it skipped were exactly the four stories it
    couldn't place), carry
    translations and box sets at a book's number, and sometimes answer with an
    umbrella series of the same name. So a story Hardcover can't place is not a
    wrong story: every series is checked on a page that lists it whole, and
    Hardcover is the hint. Missing books by another author than the
    collection's are an umbrella's, never this series'.
  - Two passes keep it cheap: first the lists (which story is which number,
    which is out, which is the same book twice, what is missing), then blurbs
    and pages only for the books that pass adds, from Hardcover's own text
    where it is about the right book, the publisher's page otherwise.
  - A blurb nobody could read word for word stays empty; never one written
    from a summary.
  - More than 40 missing (as ✨ Find their series starts them unticked): add
    none and say how many in `why`.
  - A book inside an omnibus or box set already in the collection isn't
    missing.
  - A collection none of whose stories is the series it is named after is
    left out of the file and asked about.
  - Of two copies of one book, the one with readings, a rating or notes is
    kept; when both have them, neither is dropped.
  - A story taken out because it is another series' book carries that series
    in `to` (its name and number, from the checker's reason), so it goes into
    that series' collection: taken out without it, a run of one series' books
    lands on the shelf loose, one by one. Only a book of no series goes back
    on its own.
  - `why` is shown to the owner (240 letters): which pages it was checked on,
    and anything they should know, in their words, never the checker's notes.
  - A checker's `out` may carry `pos`, the book's number in the OTHER series:
    read `out` before `pos`, or every move lands placed in the series it is
    leaving.
  - A change that makes a NEW collection goes first in the file: a story
    another change moves there by `to` then finds it (`serInColl`) instead of
    making a second one.
  - A collection with no stories at all (the collection itself carries the
    reading and the notes) is left out and asked about.
- A collection's own blurb rides in the same file as kind `blurb` on the
  collection's book id, written the way ✨ A blurb for the whole collection
  writes it (`cwSeriesAsk` + `CW_BLURB` in index.html: the series as a whole,
  about 120 to 170 words, no plot, no titles) from its books' blurbs as they
  will stand after the file, the added books' included. Only a collection
  with no blurb of its own, and only once at least two in three of its books
  have one; the rest wait for the blurbs job. A collection the file makes
  has no id yet, so its blurb comes in a later file. One press changing a
  collection twice (its blurb and its series) needs build 2026-11-09.30's ↶,
  which walks a press's changes back last first.
- A publisher's description can be read word for word from the iTunes search
  API (`itunes.apple.com/search?media=ebook&term=…`), where a fetched page
  only comes back summarised.
- What worked for checking hundreds at once: Hardcover first, free, from a
  `?db=copy` page (`fetchHardcover` / `fetchHardcoverSeries`, about a second
  each, results handed out through the :8768 drop box), then the web only for
  what Hardcover doubts or doesn't know.
- One job a file. A few hundred books a chat is a sensible size; say how far
  you got and where the next chat carries on.
