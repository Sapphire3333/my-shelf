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


def plain(html):
    """a blurb as the app compares it: tags off, spaces squeezed"""
    s = re.sub(r"<[^>]+>", " ", str(html or ""))
    s = s.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&#39;", "'")
    return re.sub(r"\s+", " ", s).strip()


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


def load(path):
    with open(os.path.expanduser(path), encoding="utf-8") as f:
        return Shelf(json.load(f), path)


class File:
    def __init__(self, job, shelf):
        self.job, self.shelf, self.changes = job, shelf, []

    def _book(self, kind, book, story, extra):
        c = {"kind": kind, "book": book["id"]}
        x = book
        if story is not None:
            c["story"], x = story["id"], story
        c["title"] = x.get("title", "")
        c["author"] = (story or {}).get("author") or book.get("author", "")
        c.update({k: v for k, v in extra.items() if v not in (None, "")})
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

    def whole(self, name, author, items, coll=None, out=(), drop=(), why=""):
        """One series as it should stand, in series order. coll: the collection (a dict from
        shelf.books), or None for a new one. items: ("story", entry, pos) for one of its own,
        ("book", book, pos) for a loose book that moves in, ("add", {"title", "pos", "pages",
        "blurb"}) for a missing book, added as Want to read. out: (entry, why) pairs, stories
        that aren't this series and go back on the shelf as books; (entry, why, {"name", "pos"})
        for a story of ANOTHER series, which goes into that series' collection at its number
        (made if the shelf has none). drop: (entry, kept_entry) pairs, one book twice, carried
        into the one kept."""
        c = {"kind": "whole", "name": name, "author": author}
        if coll:
            c.update(book=coll["id"], title=coll.get("title", ""), was=[e["id"] for e in coll.get("entries") or []])
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
        c["items"] = its
        if out:
            c["out"] = []
            for o in out:
                d = {"story": o[0]["id"], "title": o[0].get("title", ""), "why": o[1]}
                if len(o) > 2 and o[2] and str(o[2].get("name") or "").strip():
                    d["to"] = {"name": str(o[2]["name"]).strip(), "pos": str(o[2].get("pos") or "").lstrip("#")}
                c["out"].append(d)
        if drop:
            c["drop"] = [{"story": d["id"], "into": k["id"], "title": d.get("title", "")} for d, k in drop]
        if why:
            c["why"] = why
        self.changes.append(c)
        return c

    def blurb(self, book, text, story=None, why="", src=""):
        x = story if story is not None else book
        return self._book("blurb", book, story, {"was": plain(x.get("summary")), "to": text.strip(), "why": why, "src": src})

    def pages(self, book, n, story=None, why="", src=""):
        x = story if story is not None else book
        return self._book("pages", book, story, {"was": str(x.get("pages") or ""), "to": str(int(n)), "why": why, "src": src})

    def write(self, folder=None):
        folder = folder or os.path.join(os.path.expanduser("~"), "Downloads")
        slug = re.sub(r"[^a-z0-9]+", "-", self.job.lower()).strip("-")[:40] or "changes"
        path = os.path.join(folder, f"my-shelf-corrections-{datetime.date.today().isoformat()}-{slug}.json")
        out = {"myShelfCorrections": VERSION, "made": datetime.datetime.now().isoformat(timespec="seconds"),
               "copy": self.shelf.date, "job": self.job, "changes": self.changes}
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=0)
        return path
