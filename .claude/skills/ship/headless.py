"""Run dev-check's smoke or sweep in a headless Chrome of its own, for when
the browser pane is hidden (its frames stall: no animation frames, view
transitions that never end) or busy.

    python -I .claude/skills/ship/headless.py smoke
    python -I .claude/skills/ship/headless.py sweep
    python -I .claude/skills/ship/headless.py smoke http://127.0.0.1:8771/ "words in a check's name"

Needs the app served (python -m http.server 8771 --bind 127.0.0.1). The
Chrome is a throwaway profile, muted, closed by its own process handle.
Prints bad, the rows or cells, and what failed; with words after the
address, also the notes of the checks whose names hold them."""
import sys, time, json
sys.stdout.reconfigure(encoding="utf-8")
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "guide-pictures"))
from cdp import Chrome
what = sys.argv[1]; base = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8771/"
c = Chrome(port=9341)
try:
    c.call("Page.enable"); c.call("Runtime.enable")
    c.call("Emulation.setDeviceMetricsOverride", width=1600, height=1000, deviceScaleFactor=1, mobile=False)
    c.call("Page.navigate", url=base + "dev-check.html")
    c.wait_event("Page.loadEventFired", 60)
    time.sleep(1)
    key = "__smoke" if what == "smoke" else "__sweep"
    fn = "__runSmoke" if what == "smoke" else "__runSweep"
    c.js(f"window.__pick={json.dumps(sys.argv[3:])};window.{key}=undefined;window.__t0=Date.now();window.{fn}();1")
    t0 = time.time(); last = ""
    while True:
        time.sleep(3)
        r = c.js(f"window.{key}?1:0")
        if r: break
        p = c.js("(document.getElementById('prog')||{}).textContent||''")
        if p != last and time.time() - t0 > 0: last = p
        if time.time() - t0 > 900: print("timed out:", last); sys.exit(1)
    if what == "smoke":
        out = c.js("({bad:__smoke.bad,rows:__smoke.rows.length,failed:__smoke.rows.filter(r=>!r.ok).map(r=>r.name.slice(0,90)+': '+r.note),pick:__smoke.rows.filter(r=>(window.__pick||[]).some(p=>r.name.indexOf(p)>=0)).map(r=>[r.ok,r.name.slice(0,60),r.note])})")
    else:
        out = c.js("({bad:__sweep.bad,cells:Object.keys(__sweep.results).length,skipped:Object.values(__sweep.results).filter(v=>v&&v.skip).length,failed:__sweep.failed.slice(0,12)})")
    print(json.dumps(out, ensure_ascii=False, indent=1))
    print("took", round(time.time() - t0), "s")
finally:
    c.close()
