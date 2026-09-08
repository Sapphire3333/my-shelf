/* Runs dev-check.html the way a person does — press Run the smoke, press Run
   the sweep — but in a browser GitHub owns, so nothing has to be installed on
   the machine the app is actually written on.

   It reads the two results the page hands back (window.__smoke and
   window.__sweep, both {bad, ...}) rather than looking at the table it draws,
   and exits non-zero if either found anything.

   Nothing here is part of the app. The app remains one file with no build. */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8766";

/* A page Chromium considers backgrounded has its timers throttled to about one
   a second, and the sweep gives each screen a fixed budget before it gives up —
   run it throttled and screens fail for having been slow rather than wrong.
   Measured in a throttled pane: 24 false failures out of the first 60 checks,
   and 0 across the same passes unthrottled. These three flags are why a green
   run here means anything. */
const browser = await chromium.launch({
  args: [
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
});
/* playwright is installed unpinned, so which one ran is not knowable from
   the repo -- only from the run. Both versions go in the report, because a
   check that starts failing without the app changing is a browser that
   moved, and that is the first question to ask. */
let browserVersion = "";
try { browserVersion = String(await browser.version()); } catch (e) { browserVersion = "unknown"; }
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

/* An exception thrown by the check page itself would otherwise leave the run
   looking green while nothing was actually checked. */
const crashes = [];
page.on("pageerror", (e) => crashes.push(String(e && e.message ? e.message : e)));

let smoke = null;
let sweep = null;
let fatal = null;

/* The report is written in a finally, and that is the whole point of it. Doing
   it after both checks returned meant the run that most needed explaining — the
   app failing to open, so the smoke rejects on its own timeout — died before
   the file existed, and the upload step that says if: always() had nothing to
   upload. A diagnostic that is absent exactly when things break is not one. */
try {
  await page.goto(BASE + "/dev-check.html", { waitUntil: "load", timeout: 60000 });

  /* Neither call is given a timeout. The smoke waits on a real database and the
     sweep reloads the app once per width, so the only sensible limit is the
     job's own, set in the workflow. */
  smoke = await page.evaluate(async () => {
    const r = await window.__runSmoke();
    return { bad: r.bad, rows: r.rows.map((x) => ({ name: x.name, ok: x.ok, note: x.note })) };
  });

  sweep = await page.evaluate(async () => {
    const r = await window.__runSweep();
    return { bad: r.bad, failed: r.failed };
  });
} catch (e) {
  fatal = String((e && e.stack) || e);
} finally {
  try {
    await browser.close();
  } catch (e) {
    /* a browser that already died cannot be closed twice, and saying so here
       would bury the reason the run failed in the first place */
  }
  writeFileSync(
    "check-report.json",
    JSON.stringify({ when: new Date().toISOString(), chromium: browserVersion, node: process.version, fatal, crashes, smoke, sweep }, null, 1)
  );
}

const line = (s) => process.stdout.write(s + "\n");
line("");
if (smoke) {
  line("SMOKE  " + (smoke.bad ? smoke.bad + " of " + smoke.rows.length + " FAILED" : "all " + smoke.rows.length + " passed"));
  for (const r of smoke.rows) if (!r.ok) line("   x  " + r.name + " -- " + r.note);
} else {
  line("SMOKE  never finished");
}
if (sweep) {
  line("SWEEP  " + (sweep.bad ? sweep.bad + " screens scroll sideways" : "nothing scrolls sideways"));
  for (const f of (sweep.failed || []).slice(0, 20)) line("   x  " + f);
} else {
  line("SWEEP  never finished");
}
if (crashes.length) {
  line("CRASH  the check page itself threw:");
  for (const c of crashes.slice(0, 5)) line("   x  " + c);
}
if (fatal) {
  line("FATAL  the run stopped early:");
  line("   x  " + fatal.split("\n").slice(0, 4).join("\n        "));
}
line("");

/* A check that never ran counts against the run. Silence is not a pass. */
const bad =
  (smoke ? smoke.bad : 1) + (sweep ? sweep.bad : 1) + crashes.length + (fatal ? 1 : 0);
if (bad) {
  line("Something is wrong with what was just pushed. check-report.json has all of it.");
  process.exit(1);
}
line("Both checks clean.");
