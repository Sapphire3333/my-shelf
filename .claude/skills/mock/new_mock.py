"""Starts a mock page: template.html beside this script, with My Shelf's own
stylesheet inlined, so every class and colour on the mock's stage is the app's
as it stands today rather than a hand-made imitation of it.

    python .claude/skills/mock/new_mock.py <out.html> "Two To Four Words"

The stylesheet is the first <style> block of index.html with its comments
taken out (they are about half its size and say nothing to a mock).
"""
import pathlib
import re
import sys


def main():
    if len(sys.argv) < 3:
        print(__doc__.strip())
        return 2
    out, title = pathlib.Path(sys.argv[1]), sys.argv[2]
    here = pathlib.Path(__file__).resolve().parent
    repo = here.parents[2]

    app = (repo / "index.html").read_text(encoding="utf-8")
    m = re.search(r"<style>(.*?)</style>", app, re.S)
    if not m:
        print("index.html has no <style> block -- has the file moved?")
        return 1
    css = re.sub(r"/\*.*?\*/", "", m.group(1), flags=re.S)
    css = re.sub(r"\n[ \t]*(?=\n)", "", css)

    page = (here / "template.html").read_text(encoding="utf-8")
    page = page.replace("/*APP_CSS*/", css).replace("__TITLE__", title)

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8", newline="\n")
    print(f"wrote {out} -- {len(page.encode('utf-8')) // 1024} KB "
          f"(app stylesheet {len(css.encode('utf-8')) // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
