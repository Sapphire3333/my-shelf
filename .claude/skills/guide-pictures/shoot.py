"""Take the guide's pictures of My Shelf, on a shelf of made-up books.

    python .claude/skills/guide-pictures/shoot.py                 every picture, both devices
    python .claude/skills/guide-pictures/shoot.py add-menu        just these (comma or space separated)
    python .claude/skills/guide-pictures/shoot.py --dev ph        just the phone's
    python .claude/skills/guide-pictures/shoot.py --dry           take them, write nothing
    python .claude/skills/guide-pictures/shoot.py --dry --out D   save them in D to look at; index.html untouched

Needs the app served on this computer (python -m http.server 8771 --bind
127.0.0.1 from the repo; --base for another address). Starts its own headless
Chrome with a throwaway profile, muted, so nothing of the desktop's browser is
touched and nothing plays. For every picture in shots.js and every device it
opens index.html?db=smoke fresh, seeds the invented shelf in memory, draws the
screen, measures the crop and the things the numbered lines point at, and
saves art/guide-<name>-<pc|ph>.webp. Then it rewrites the one line
`const GUIDE_PICS=…;` in index.html: per picture and device, the picture's
size in the window's pixels, a fingerprint of its bytes (the ?v= that makes a
retaken picture a new address for the offline cache, as ART does), and each
spot as [x, y, w, h] in the same pixels.

The devices are the two the app is measured at: the computer at 2144 px with
text at 135% (it lays out for 1588), and the phone at 412 px with text at
132%, taken at twice the pixels so the phone's picture stays sharp.
"""
import argparse, base64, hashlib, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
from cdp import Chrome  # noqa: E402

DEVICES = {
    "pc": dict(width=2144, height=1206, deviceScaleFactor=1, mobile=False),
    "ph": dict(width=412, height=860, deviceScaleFactor=2, mobile=True),
}
QUALITY = 84
MARK = "const GUIDE_PICS="


def shoot(c, base, shots_js, name, dev):
    c.call("Emulation.setDeviceMetricsOverride", **DEVICES[dev])
    c.call("Emulation.setTouchEmulationEnabled", enabled=(dev == "ph"), maxTouchPoints=5 if dev == "ph" else 1)
    # an address of its own each time: a page that pushed a Back step onto
    # the same address may not load again when asked for it once more
    c.navigate(base + "index.html?db=smoke&shot=" + name + "-" + dev + "-" + str(int(time.time() * 1000)))
    c.js("new Promise(r=>setTimeout(r,700))")
    c.js(shots_js + ";1")
    c.js(f"__guideSeed({json.dumps(dev)}).then(()=>{{if(typeof render==='function')render();return new Promise(r=>setTimeout(r,500));}})")
    got = c.js(f"__guideShot({json.dumps(name)},{json.dumps(dev)})")
    clip = got["clip"]
    if clip["w"] < 40 or clip["h"] < 40:
        raise RuntimeError(f"{name}/{dev}: a clip of {clip['w']}x{clip['h']} is nothing to show")
    r = c.call("Page.captureScreenshot", format="webp", quality=QUALITY, captureBeyondViewport=False,
               clip=dict(x=clip["x"], y=clip["y"], width=clip["w"], height=clip["h"], scale=1))
    data = base64.b64decode(r["data"])
    return clip, got["spots"], data


def write_pics(index, pics):
    with open(index, "rb") as f:
        raw = f.read()
    text = raw.decode("utf-8")
    lines = text.split("\n")
    at = [i for i, l in enumerate(lines) if l.startswith(MARK)]
    if len(at) != 1:
        raise SystemExit(f"expected one line starting {MARK!r} in index.html, found {len(at)}")
    i = at[0]
    old = lines[i][len(MARK):].rstrip().rstrip(";")
    try:
        have = json.loads(old) if old.strip() else {}
    except ValueError:
        have = {}
    for k, v in pics.items():
        have.setdefault(k, {}).update(v)
    cr = chr(13) if lines[i].endswith(chr(13)) else ""
    lines[i] = MARK + json.dumps(have, separators=(",", ":"), ensure_ascii=False, sort_keys=True) + ";" + cr
    out = "\n".join(lines).encode("utf-8")
    tmp = index + ".guide-tmp"
    with open(tmp, "wb") as f:
        f.write(out)
    os.replace(tmp, index)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--base", default="http://127.0.0.1:8771/")
    ap.add_argument("--dev", default="pc,ph")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--out", default=os.path.join(REPO, "art"))
    ap.add_argument("--chrome")
    ap.add_argument("--json", help="also write what was measured to this file")
    a = ap.parse_args()
    base = a.base if a.base.endswith("/") else a.base + "/"
    with open(os.path.join(HERE, "shots.js"), encoding="utf-8") as f:
        shots_js = f.read()
    devs = [d for d in a.dev.split(",") if d]
    c = Chrome(a.chrome)
    pics = {}
    try:
        c.call("Page.enable"); c.call("Runtime.enable"); c.call("Network.enable")
        # nothing leaves for the sync server or Google: a picture may pretend
        # to be signed in so that signed-in buttons show, and must send nothing
        c.call("Network.setBlockedURLs", urls=["*supabase.co*", "*googleapis.com*", "*accounts.google.com*",
                                               "*api.spotify.com*", "*mangadex*", "*anthropic.com*"])
        c.call("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": "light"},
                                                       {"name": "prefers-reduced-motion", "value": "reduce"}])
        names = [n for x in a.names for n in x.split(",") if n]
        if not names:
            c.navigate(base + "index.html?db=smoke")
            c.js(shots_js + ";1")
            names = c.js("Object.keys(__guideShots)")
        for name in names:
            for dev in devs:
                t = time.time()
                clip, spots, data = shoot(c, base, shots_js, name, dev)
                fp = hashlib.sha256(data).hexdigest()[:7]
                fn = f"guide-{name}-{dev}.webp"
                if not a.dry or a.out != os.path.join(REPO, "art"):
                    with open(os.path.join(a.out, fn), "wb") as f:
                        f.write(data)
                pics.setdefault(name, {})[dev] = [clip["w"], clip["h"], fp, spots]
                print(f"{fn}: {clip['w']}x{clip['h']} px, {len(data) // 1024} KB, "
                      f"{len(spots)} spots, {time.time() - t:.1f}s", flush=True)
    finally:
        c.close()
    if a.json:
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump(pics, f, ensure_ascii=False)
    if not a.dry:
        write_pics(os.path.join(REPO, "index.html"), pics)
        print("index.html: GUIDE_PICS rewritten for", ", ".join(sorted(pics)))


if __name__ == "__main__":
    main()
