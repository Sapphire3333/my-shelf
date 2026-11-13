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
| `whole` | one series as it should stand: wrong stories out (back to books of their own, or, when `to` names the series they belong to, into that series' collection at its number, made if there is none), one book twice made one, loose books moved in, missing ones added as Want to read with pages and blurb, all in series order; a new collection when `book` is absent; `rename` gives an existing collection the series' name and author; `{self}` turns a collection that holds no stories, because it is the one book read, into that book's story at its number, its rating, dates, stage and notes going with it | `name`, `author`, `book` + `was` (its story ids in the copy), `items` ({story}/{book}/{add}/{self}) in order, `out` ({story, why, to?: {name, pos}}), `drop` ({story, into, merge?}), `rename` — write it with `corr.File.whole` |
| `blurb` | replaces a book's, story's or collection's blurb | `to` (plain text, blank lines between paragraphs); `doubt` starts it unticked, saying why (build 2026-11-13.10 on) |
| `pages` | sets the page count | `to` (digits); `doubt` starts it unticked, saying why (build 2026-11-13.10 on): a count more than 30% from the one there now, since which edition is theirs is theirs to say |
| `dates` | puts a book's or story's own stage and readings back as a copy had them (build 2026-11-10.1 on); one changed since the copy starts unticked | `to` / `was`: {status ("" = a tale answering with its volume), dnf, readings [{start, end, open}]} — `corr.File.dates` |
| `fic` | a row of the import list that is fan fiction becomes a fic there, with its fandoms, under ✍️ Fics for ＋ Add (build 2026-11-10.14 on); the list changes, not the shelf, so no ↶ | `row`, `fandoms` (the owner's own names where they have them), `link` — `corr.File.fic` |
| `words` | a book's, collection's or story's genres, tags and Set in (build 2026-11-10.13 on): one row a book, a pill per word the owner can switch off; a row that only adds is folded, ticked; a new genre joins their genres only when used, and one ↶ takes it away | `genres` / `tags`: {add, remove, was}; `setin` (not on a story): {add, replace, was}; `was` is the item's own list in the copy — `corr.File.words` |

Kinds named for later jobs, which this build counts and keeps but can't use
yet: `rename`, `author`, `screen`, `upcoming`. Each one
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
    kept; when both have them, neither is dropped, unless the drop says
    `merge: true` (build 2026-11-10.11 on; `corr.File.whole` takes a third
    `True` in the pair). Then the kept copy takes the other's rating, ♥,
    stage and notes where it has none, and its readings as one book read:
    every dated reading once, undated ones only up to the most either copy
    had, so a dated finish and an undated "finished" count once. Keep the
    copy that carries the file, blurb and cover; the row says what goes with
    it. A copy with highlights on another file than the kept one's stays two.
    When the two are in a collection whose numbers aren't all known, list
    every story in its present order as the items, so nothing moves.
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
  - A series the shelf already keeps as a collection by the same hand is
    filled, never made a second time: `corr.File.whole` refuses `coll=None`
    for it and names the one there (`File.existing(name, author)` asks
    first). A file planned from a copy older than an earlier file's load
    passes that file as `File(job, shelf, pending=[path])`, so its new
    collections count too. Two parts of one job once made a second
    collection for 5 series (the app's 🧹 Make them one, in Tidying up,
    joins such a pair). A loose book that is already one of the
    collection's stories is left out of the items: 📚 A book that's
    already a story folds it in with its file.
  - A change that makes a NEW collection goes first in the file: a story
    another change moves there by `to` then finds it (`serInColl`) instead of
    making a second one.
  - A collection with no stories at all (the collection itself carries the
    reading and the notes) is filled like any other: the book it is goes in
    as `{self}` at its number, the collection takes the series' name with
    `rename`, the rest are added. A standalone is left alone. Its collection
    blurb waits for a later file: `{self}` takes the collection's blurb down
    into the story, and a press applies blurbs before series.
  - A collection whose stories are all a spin-off (Herman Parish's Amelia
    Bedelia Chapter Books in a collection named for Peggy Parish's series)
    becomes the spin-off with `rename`; the collection's own rating, blurb
    and notes stay where they are, and `why` says so.
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
- For `words` (genres, tags and Set in):
  - Read what the app's ✨ Claude reads the shelf never reached: a book,
    collection or story whose key (`book id`, or `book id|story id`) is not
    in `copy.settings.claudeReadSeen` with the same fingerprint (`readSig`:
    the strHash of `readWords`), or has under 80 letters written. Fics are
    left alone: their tags are AO3's own.
  - Genres from the owner's own list; a new one only where none of theirs
    fits, in the list's style. A genre is taken off only when the text
    clearly contradicts it.
  - Tags theirs first, spelt as they spell them; a new one only where none of
    theirs says it, and at most four new on one book. Never a word they keep
    for their own lists or notes (the `kwCats` families of that kind), an
    opinion of the book, an age or audience, or a genre again as a tag. A tag
    that only names a bookshop's shelf or a reading age, the categories an
    import brings in, is taken off.
  - A story gets genres of its own only where it clearly isn't like the rest
    of its collection: its own REPLACE the collection's. Tags true of the
    whole series go on the collection, a story's own on the story.
  - Set in as the book says, at most three places: a country, a US state, a
    city as "City, Country", a made-up place by its own name. From the blurb,
    else checked on the web; never guessed. A Set in that's clearly wrong is
    replaced (`setin_replace`). A story's places go on its collection.
  - A book or collection with under a line written is looked up on the web;
    its stories follow the collection.
  - `why` says where anything not in the blurb came from.
- For books coming in from the import list (series answers for its rows):
  - The app's own matcher (`markDupes`, title AND author) decides what is
    already on the shelf; a title alone matched other authors' books.
  - 📚 Make them puts a row into a collection the shelf already has at the
    END, not at its number, and makes a collection of one for a series with
    one book on the list. So a series-made-whole file follows the import, from
    a copy saved after it, and covers every collection the import made or
    filled.
  - A series group takes in the list's Want to read rows with the same
    answer too.
  - A short story is answered with the book of stories it was first printed
    in, at its place in that book's contents.
  - Fan fiction on the list goes in as kind `fic`, never as a series answer.
- The web search tool allows 200 searches a turn, SHARED by every subagent
  running in it. Four checkers of about 60 books each used it all; give each
  a cap ("at most 45 searches") and let one search cover an author's books.
- One job a file. A few hundred books a chat is a sensible size; say how far
  you got and where the next chat carries on.
