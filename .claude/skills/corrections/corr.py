"""Make a My Shelf corrections file from a copy saved with 🧪 Save a copy for testing.

The app's 📥 Corrections from a file (Shelf care) reads what this writes. Each change
names its book, story or import row by id AND carries the title, author and present
value as they were in the copy, so the app can tell a book renamed or edited since.

    import sys; sys.path.insert(0, r"<repo>/.claude/skills/corrections"); import corr
    shelf = corr.load(r"C:/Users/<you>/.claude/shelf-copy/my-shelf-test-copy-<date>.json")
    out = corr.File("Series for the import list", shelf)
    for row in shelf.rows: ...
        out.series(row, "Series Name", "2", why="…", sure=True)
    out.blurb(book, "new blurb", story=entry, why="…", src="https://…")
    out.pages(book, 240, story=entry)
    out.write()            # Downloads/my-shelf-corrections-<date>-<job>.json

Run Python with -I. The copy and the file it writes are private: never into the repo.
"""
import json, os, re, datetime, unicodedata

VERSION = 1


def fold(s):
    """the app's softFold: lower case, accents off, letters and digits only"""
    s = unicodedata.normalize("NFKD", str(s or "").lower())
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return re.sub(r"[^\w]|_", "", s)


# JavaScript's \s, which the app squeezes and trims: Python's \s also takes \x1c-\x1f and \x85,
# and leaves out
_JS_WS = "\t\n\v\f\r   " + "".join(map(chr, range(0x2000, 0x200b))) + "    　﻿"
_JS_WS_RUN = re.compile("[" + _JS_WS + "]+")
_ENTITIES = (("&nbsp;", " "), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'"), ("&amp;", "&"))


def plain(html):
    """a blurb as the app compares it: stripHtml in index.html, step for step. Every tag becomes a
    space, then &nbsp; &lt; &gt; &quot; &#39; and &amp; are decoded in that order and in any case,
    &amp; LAST, so an escaped entity ("&amp;nbsp;") comes out as "&nbsp;" and is not read twice;
    then whitespace is squeezed to one space and trimmed."""
    s = re.sub(r"<[^>]*>", " ", str(html or ""))
    for ent, ch in _ENTITIES:
        s = re.sub(re.escape(ent), lambda m, ch=ch: ch, s, flags=re.I)
    return _JS_WS_RUN.sub(" ", s).strip(_JS_WS)


class Shelf:
    def __init__(self, data, path):
        self.path = path
        self.books = [b for b in data.get("books", []) if isinstance(b, dict)]
        copy = data.get("copy") or {}
        self.rows = [r for r in copy.get("importQueue", []) if isinstance(r, dict)]
        self.serfind = copy.get("serFind") or {}
        m = re.search(r"(\d{4}-\d{2}-\d{2})", os.path.basename(path))
        self.date = m.group(1) if m else datetime.date.fromtimestamp(os.path.getmtime(path)).isoformat()

    def collections(self):
        return [b for b in self.books if b.get("type") == "collection"]

    def stories(self):
        """(book, entry) for every story inside a collection"""
        for b in self.collections():
            for en in b.get("entries") or []:
                if isinstance(en, dict) and en.get("title"):
                    yield b, en


GREY_SHARE, GREY_STEP = 0.04, 40


def cover_look(data):
    """(w, h, grey) of a picture's bytes, judged as the app's covGreyAt judges a cover: shrunk to
    24 × 24, grey when fewer than 4% of the squares have 40 or more between their highest and
    lowest of red, green and blue. Needs Pillow."""
    import io
    from PIL import Image
    im = Image.open(io.BytesIO(data))
    w, h = im.size
    px = im.convert("RGB").resize((24, 24), Image.BOX).tobytes()
    n = sum(1 for i in range(0, len(px), 3) if max(px[i:i + 3]) - min(px[i:i + 3]) >= GREY_STEP)
    return w, h, n / 576 < GREY_SHARE


def load(path):
    with open(os.path.expanduser(path), encoding="utf-8") as f:
        return Shelf(json.load(f), path)


SER_SKIP = {"the", "a", "an", "of", "series", "books", "book", "collection", "set"}


def series_key(name):
    """the app's serFindName: a series' words, little ones off, in any order"""
    s = unicodedata.normalize("NFKD", str(name or "").lower())
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    w = [x for x in re.sub(r"[^\w]+|_", " ", s).split() if x not in SER_SKIP]
    return " ".join(sorted(w)) if w else fold(name)


def surnames(author):
    """the app's authorsSameHand: each person's last word, a one-word name whole"""
    out = set()
    for p in re.split(r"[,;&·・]|\band\b", str(author or "").lower()):
        w = [x for x in re.sub(r"[^\w]+|_", " ", unicodedata.normalize("NFKD", p)).split() if x]
        if w:
            out.add(w[-1])
    return out


class File:
    def __init__(self, job, shelf, pending=()):
        """pending: earlier corrections files written from an older copy and loaded since, or not
        loaded yet. Their new collections are not in this copy, so whole() checks them too."""
        self.job, self.shelf, self.changes = job, shelf, []
        self.pending = []
        for p in pending:
            with open(os.path.expanduser(p), encoding="utf-8") as f:
                for c in json.load(f).get("changes", []):
                    if c.get("kind") == "whole" and not c.get("book"):
                        self.pending.append({"name": c.get("name", ""), "author": c.get("author", ""), "file": os.path.basename(p)})

    def existing(self, name, author):
        """The collection already kept for this series by the same hand: a dict from the copy,
        or {"pending": file} when an earlier file makes it, or None. Two parts of one job once
        made a second collection for 5 series the shelf already had, and a third part would
        have made more; a series found again goes INTO the one there."""
        k, a = series_key(name), surnames(author)
        def same(n, au):
            return series_key(n) == k and (not a or not surnames(au) or bool(a & surnames(au)))
        for b in self.shelf.collections():
            if same(b.get("title"), b.get("author") or next((e.get("author") for e in b.get("entries") or [] if e.get("author")), "")):
                return b
        for c in self.changes:
            if c.get("kind") == "whole" and not c.get("book") and same(c.get("name"), c.get("author")):
                return {"pending": "this file"}
        for p in self.pending:
            if same(p["name"], p["author"]):
                return {"pending": p["file"]}
        return None

    def _book(self, kind, book, story, extra, keep=()):
        """keep: fields written even when empty ("was" of a blurb or page count the copy didn't
        have: the app only checks a row against the shelf when `was` is there, and a blurb typed
        in after the copy must make the row stale rather than be written over)."""
        c = {"kind": kind, "book": book["id"]}
        x = book
        if story is not None:
            c["story"], x = story["id"], story
        c["title"] = x.get("title", "")
        c["author"] = (story or {}).get("author") or book.get("author", "")
        c.update({k: v for k, v in extra.items() if v is not None and (v != "" or k in keep)})
        self.changes.append(c)
        return c

    def series(self, target, series, num="", why="", sure=False, story=None):
        """target: an import row (a dict from shelf.rows) or a book. series "" = in no series."""
        is_row = target in self.shelf.rows
        now = self._series_now(target, is_row)
        c = {"kind": "series", "series": series or "", "num": str(num or "").lstrip("#"),
             "title": target.get("title", ""), "author": target.get("author", ""),
             "was": (now[0] + (" #" + now[1] if now[1] else "")) if now else ""}
        c["row" if is_row else "book"] = target["id"]
        if why: c["why"] = why
        if sure: c["sure"] = True
        self.changes.append(c)
        return c

    def _series_now(self, t, is_row):
        sf = self.shelf.serfind
        if is_row:
            key = fold(t.get("title")) + "|" + fold(t.get("author"))
            a = (sf.get("series") or {}).get(key)
            if a: return a.get("s", ""), a.get("p", "")
            if t.get("series"): return t["series"], str(t.get("seriesNum") or "")
            m = re.search(r"\(([^()#]*[^()#\s,]),?\s*#\s*(\d+(?:\.\d+)?)(?:\s*-\s*\d+(?:\.\d+)?)?\)\s*$", t.get("title", ""))
            return (m.group(1).strip(), m.group(2)) if m else None
        if t.get("series"): return t["series"], str(t.get("seriesNum") or "")
        a = (sf.get("shelf") or {}).get(t["id"])
        return (a.get("s", ""), a.get("p", "")) if a else None

    def whole(self, name, author, items, coll=None, out=(), drop=(), why="", rename=False):
        """One series as it should stand, in series order. coll: the collection (a dict from
        shelf.books), or None for a new one. items: ("story", entry, pos) for one of its own,
        ("book", book, pos) for a loose book that moves in, ("add", {"title", "pos", "pages",
        "blurb"}) for a missing book, added as Want to read, ("self", {"title", "pos"}) for a
        collection that holds no stories because it IS the one book read: that book becomes the
        story at its number, taking the collection's own rating, dates, stage and notes.
        out: (entry, why) pairs, stories that aren't this series and go back on the shelf as
        books; (entry, why, {"name", "pos"}) for a story of ANOTHER series, which goes into that
        series' collection at its number (made if the shelf has none). drop: (entry, kept_entry)
        pairs, one book twice, carried into the one kept; (entry, kept_entry, True) merges a copy
        that has a life of its own too (its readings, rating, stage and notes go with it). rename: an existing collection takes
        `name` and `author` (build 2026-11-09.31 on); without it they name only a new one.
        A new collection (coll=None) for a series the shelf, this file or a pending file already
        keeps is refused: pass that collection as coll, its stories as ("story", …) items in their
        order, and leave out a loose book that is already one of its stories."""
        if not coll:
            hit = self.existing(name, author)
            if hit:
                where = hit.get("pending") or f'"{hit.get("title", "")}" ({hit.get("id", "")})'
                raise ValueError(f"{name}: the shelf already keeps this series as a collection, in {where}. Fill that one instead of making a second.")
        c = {"kind": "whole", "name": name, "author": author}
        if coll:
            c.update(book=coll["id"], title=coll.get("title", ""), was=[e["id"] for e in coll.get("entries") or []])
            if rename:
                c["rename"] = True
        its = []
        for it in items:
            if it[0] == "story":
                its.append({"story": it[1]["id"], "pos": str(it[2] or "")})
            elif it[0] == "book":
                its.append({"book": it[1]["id"], "pos": str(it[2] or ""), "title": it[1].get("title", "")})
            elif it[0] == "add":
                a = it[1]
                its.append({"add": {"title": a["title"], "pos": str(a.get("pos", "") or ""),
                                    "pages": str(a.get("pages", "") or ""), "blurb": (a.get("blurb") or "").strip()}})
            elif it[0] == "self":
                s = it[1]
                its.append({"self": {"title": str(s.get("title") or "").strip(), "pos": str(s.get("pos", "") or "")}})
        c["items"] = its
        if out:
            c["out"] = []
            for o in out:
                d = {"story": o[0]["id"], "title": o[0].get("title", ""), "why": o[1]}
                if len(o) > 2 and o[2] and str(o[2].get("name") or "").strip():
                    d["to"] = {"name": str(o[2]["name"]).strip(), "pos": str(o[2].get("pos") or "").lstrip("#")}
                c["out"].append(d)
        if drop:
            c["drop"] = []
            for dd in drop:
                d, k = dd[0], dd[1]
                x = {"story": d["id"], "into": k["id"], "title": d.get("title", "")}
                if len(dd) > 2 and dd[2]:
                    x["merge"] = True  # both copies have a life of their own: made one all the same (build 2026-11-10.11 on)
                c["drop"].append(x)
        if why:
            c["why"] = why
        self.changes.append(c)
        return c

    def blurb(self, book, text, story=None, why="", src="", doubt=""):
        """`was` is the summary exactly as the copy stores it, HTML and all: the app's CORR_DO.blurb
        runs blbPlain on it itself, and text already made plain, read a second time, is not the same
        text where a blurb holds an escaped entity ("&amp;nbsp;"), so the row looked changed since
        the copy. Written when empty too (see _book). doubt: why the row should start unticked,
        shown beside it (build 2026-11-13.10 on)."""
        x = story if story is not None else book
        return self._book("blurb", book, story, {"was": str(x.get("summary") or ""), "to": text.strip(), "why": why, "src": src, "doubt": doubt}, keep=("was",))

    def pages(self, book, n, story=None, why="", src="", doubt=""):
        """`was` is written when empty too (see _book). doubt: why the row should start unticked
        (build 2026-11-13.10 on), e.g. a count more than 30% from the one there now, where which
        edition the owner has is theirs to say."""
        x = story if story is not None else book
        return self._book("pages", book, story, {"was": str(x.get("pages") or ""), "to": str(int(n)), "why": why, "src": src, "doubt": doubt}, keep=("was",))

    def dates(self, book, to, story=None, why="", src=""):
        """A book's or story's own stage and readings, put back as `to` says:
        {"status": "finished"|"reading"|"want"|"" (a tale that answers with its volume),
         "dnf": bool, "readings": [{"start", "end", "open"}]}. `was` is taken from the copy."""
        x = story if story is not None else book
        was = {"status": str(x.get("status") or ""), "dnf": bool(x.get("dnf")),
               "readings": [{k: r[k] for k in ("start", "end", "open") if r.get(k)} for r in (x.get("readings") or []) if isinstance(r, dict)]}
        return self._book("dates", book, story, {"was": was, "to": to, "why": why, "src": src})

    def fic(self, row, fandoms, link="", why=""):
        """A row of the import list that is fan fiction (build 2026-11-10.14 on): it becomes a
        fic there (kind "fanfic") with these fandoms, filed under ✍️ Fics for + Add. Write a
        fandom as the owner's own name for it where they have one (shelf copy "fandoms")."""
        c = {"kind": "fic", "row": row["id"], "title": row.get("title", ""), "author": row.get("author", ""),
             "fandoms": [f for f in fandoms if str(f).strip()]}
        if link: c["link"] = link
        if why: c["why"] = why
        self.changes.append(c)
        return c

    def words(self, book, story=None, genres=(), genres_off=(), tags=(), tags_off=(), setin=(), setin_replace=False, why="", src=""):
        """Genres, tags and Set in for one book, collection or story (kind "words", build
        2026-11-10.13 on). genres / tags: words to add; genres_off / tags_off: words to take
        off (the item's own only). setin: places to add, on a book or collection only (a story
        has no Set in of its own); setin_replace: the places it has now are wrong and go.
        A story's genres REPLACE its collection's: a story with none of its own that is given
        any keeps the collection's list as the press leaves it, plus these. Write a
        collection's change before its stories'. `was` comes from the copy. Returns None when
        there is nothing to change."""
        x = story if story is not None else book
        extra = {}
        if genres or genres_off:
            extra["genres"] = {"add": list(genres), "remove": list(genres_off), "was": list(x.get("genres") or [])}
        if tags or tags_off:
            extra["tags"] = {"add": list(tags), "remove": list(tags_off), "was": list(x.get("keywords") or [])}
        if setin and story is None:
            extra["setin"] = {"add": list(setin), "was": list(book.get("setIn") or [])}
            if setin_replace:
                extra["setin"]["replace"] = True
        if not extra:
            return None
        extra.update(why=why, src=src)
        return self._book("words", book, story, extra)

    def author(self, name, text, known=(), was="", why="", src=""):
        """Who an author is (kind "author", build 2026-11-15.10 on): the lines the author
        panel's ✨ Who they are writes, for one author named as the shelf writes them. text:
        three short lines (who they are, where they are from, what they write, anything
        notable), to the reader as "you" where it matters; known: up to six titles they are
        best known for (the panel leaves out the ones on the shelf). was: the panel's lines in
        the copy (copy settings.authorBios under the app's softFold of the name), "" for none.
        A row whose panel already has lines starts unticked. No ↶: it is a setting."""
        text = str(text or "").strip()
        if not name or not text:
            return None
        c = {"kind": "author", "name": name, "text": text,
             "known": [str(k).strip() for k in known if str(k).strip()][:6], "was": was or ""}
        if why: c["why"] = why
        if src: c["src"] = src
        self.changes.append(c)
        return c

    def screen(self, book, found, story=None, why="", src="", doubt=""):
        """Films and series made of a book (kind "screen", build 2026-11-15.11 on). found:
        [{"kind": "film"|"series", "title", "year"}]. On a collection, what was made of the
        series as a whole or of several of its books (a television series usually is); on a
        story (an entry of the collection), a film of that one book. [] = nothing made of it:
        the app then only marks the book or collection asked about, so its own ✨ never asks
        again. A story is asked about with its collection, so a story with nothing is left out
        (returns None). `was` is the item's list in the copy: a row whose list changed since
        starts unticked, so a film taken off by hand never comes back."""
        x = story if story is not None else book
        to, seen = [], set()
        for f in found or []:
            t = str((f or {}).get("title") or "").strip()
            if not t:
                continue
            k = "series" if f.get("kind") == "series" else "film"
            y = str(f.get("year") or "").strip()
            y = y if re.fullmatch(r"\d{4}", y) else ""
            # a remake under the same title, with another year, is a film of its own (the app's screenSame)
            if any(t.casefold() == a and k == b and (not y or not c or y == c) for a, b, c in seen):
                continue
            seen.add((t.casefold(), k, y))
            to.append({"kind": k, "title": t[:120], "year": y})
        if story is not None and not to:
            return None
        was = [{"kind": s.get("kind") or "film", "title": s.get("title", ""), "year": str(s.get("year") or "")}
               for s in (x.get("screen") or []) if isinstance(s, dict) and s.get("title")]
        return self._book("screen", book, story, {"to": to, "was": was, "why": why, "src": src, "doubt": doubt}, keep=("to", "was"))

    def cover(self, book, urls, story=None, why=""):
        """Covers found for a book, a collection or a story (kind "cover", build 2026-11-16.2 on).
        urls: [{"url", "src", "w", "h", "label"}], best first; url is https (or a data:image URL),
        w × h the picture's own size as downloaded here (cover_look), and none of them grey. The
        copy holds no pictures, so the app reads the owner's own cover and gives a row only where
        it is missing, under 400 px tall or a grey scan, never where they pasted or chose it
        (covMine), and unticked where it is theirs by its date alone. A book or story takes the
        first one better than theirs; a collection shows
        up to four, each with its `label` ("series art", "box set", "#1"), for them to choose.
        Returns None when no url is usable."""
        keep = []
        for u in urls or []:
            url = str((u or {}).get("url") or "")
            if not (url.startswith("https://") or url.startswith("data:image/")):
                continue
            if u.get("grey"):
                continue
            c = {"url": url, "src": str(u.get("src") or "")[:30], "w": int(u.get("w") or 0), "h": int(u.get("h") or 0)}
            if u.get("label"):
                c["label"] = str(u["label"])[:24]
            if all(k["url"] != url for k in keep):
                keep.append(c)
        if not keep:
            return None
        coll = story is None and book.get("type") == "collection"
        return self._book("cover", book, story, {"urls": keep[:4 if coll else 3], "why": why})

    def upcoming(self, book, title, pos="", date="", out=False, url="", src="", series="", author="", why="", doubt=""):
        """A book of a series after the last one the shelf holds, out already or announced (kind
        "upcoming", build 2026-11-16.8 on). book: the collection it goes into, or a loose book of a
        series of separate books, which gives no `book` and names the series instead (the app puts
        it into a collection kept under that name, else makes it a book of its own). date:
        YYYY-MM-DD, YYYY-MM or YYYY, "" when only announced; out: already out; src: "Hardcover" or
        "the web" (a web find reads as 🔎 on the book, a Hardcover one as Hardcover's). The app
        leaves out a title the shelf holds and starts unticked a number the collection already
        holds under another title, or a row with `doubt`. A find with no real title ("Untitled",
        "TBA", "Book 10") is left out here: returns None."""
        t = re.sub(r"\s+", " ", str(title or "")).strip()
        if not t or re.fullmatch(r"(?i)(untitled|tba|tbd|title tba|book \d+|volume \d+|vol\.? ?\d+)\b.*", t):
            return None
        d = str(date or "").strip()
        d = d if re.fullmatch(r"\d{4}(-\d{2}(-\d{2})?)?", d) else ""
        coll = book.get("type") == "collection"
        c = {"kind": "upcoming",
             "series": series or (book.get("title", "") if coll else book.get("series", "")),
             "author": author or book.get("author", ""), "title": t[:200],
             "pos": str(pos or "").lstrip("#"), "date": d, "out": bool(out)}
        if coll:
            c["book"] = book["id"]
        for k, v in (("url", url), ("src", src), ("why", why), ("doubt", doubt)):
            if v:
                c[k] = str(v)
        self.changes.append(c)
        return c

    RENAME_WHAT = ("author", "series", "tag", "genre", "fandom", "character", "ship")

    def rename(self, what, names, keep, why="", doubt=""):
        """One name written two or more ways, made one (kind "rename", build 2026-11-15.8 on).
        what: author, series, tag, genre, fandom, character or ship (a fic's pairing). names:
        every spelling exactly as the copy writes it; keep: the one that stays (it may be on
        no book yet). The app counts each name on the shelf as it is when the file is loaded,
        drops the ones gone since, and starts the row unticked when `doubt` says why, or when
        the owner once left two of these names as they were in Tidying up."""
        if what not in self.RENAME_WHAT:
            raise ValueError("rename: what must be one of " + ", ".join(self.RENAME_WHAT))
        names = [n for n in dict.fromkeys([keep, *names]) if str(n).strip()]
        if len(names) < 2:
            return None
        c = {"kind": "rename", "what": what, "keep": keep, "names": names}
        if why: c["why"] = why
        if doubt: c["doubt"] = doubt
        self.changes.append(c)
        return c

    def write(self, folder=None):
        folder = folder or os.path.join(os.path.expanduser("~"), "Downloads")
        slug = re.sub(r"[^a-z0-9]+", "-", self.job.lower()).strip("-")[:40] or "changes"
        path = os.path.join(folder, f"my-shelf-corrections-{datetime.date.today().isoformat()}-{slug}.json")
        out = {"myShelfCorrections": VERSION, "made": datetime.datetime.now().isoformat(timespec="seconds"),
               "copy": self.shelf.date, "job": self.job, "changes": self.changes}
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=0)
        return path
