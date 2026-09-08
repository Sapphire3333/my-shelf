/* Runs dev-check.html the way a person does — press Run the smoke, press Run
   the sweep — but in a browser GitHub owns, so nothing has to be installed on
   the machine the app is actually written on.
 
   It reads the two results the page hands back (window.__smoke and
   window.__sweep, both {bad, ...}) rather than looking at the table it draws,
   and exits non-zero if either found anything. A failing run mails the person
   who pushed; the full JSON is kept as a build artifact for reading afterwards.
 
   Nothing here is part of the app. The app remains one file with no build. */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8766";

/* A page Chromium considers backgrounded has its timers throttled to about one
   a second, and the sweep gives each screen 60s before it gives up -- run it
   throttled and every screen fails with "gave up after 60s" while the layout is
   perfectly fine. Measured locally in a hidden browser pane: 24 false failures
   out of the first 60 checks. These three flags are what stop a runner doing
   the same, and they are why a green run here means something. */
const browser = await chromium.launch({
  args: [
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

/* An exception thrown by the check page itself would otherwise leave the run
   looking green while nothing was actually checked. */
const crashes = [];
page.on("pageerror", (e) => crashes.push(String(e && e.message ? e.message : e)));

await page.goto(BASE + "/dev-check.html", { waitUntil: "load", timeout: 60000 });

/* Neither of these is given a timeout. The smoke waits on a real database and
   the sweep reloads the app once per width, so the only sensible limit is the
   job's own, set in the workflow. */
const smoke = await page.evaluate(async () => {
  const r = await window.__runSmoke();
  return { bad: r.bad, rows: r.rows.map((x) => ({ name: x.name, ok: x.ok, note: x.note })) };
});

const sweep = await page.evaluate(async () => {
  const r = await window.__runSweep();
  return { bad: r.bad, failed: r.failed };
});

await browser.close();

const report = { when: new Date().toISOString(), crashes, smoke, sweep };
writeFileSync("check-report.json", JSON.stringify(report, null, 1));

const line = (s) => process.stdout.write(s + "\n");
line("");
line("SMOKE  " + (smoke.bad ? smoke.bad + " of " + smoke.rows.length + " FAILED" : "all " + smoke.rows.length + " passed"));
for (const r of smoke.rows) if (!r.ok) line("   x  " + r.name + " -- " + r.note);
line("SWEEP  " + (sweep.bad ? sweep.bad + " screens scroll sideways" : "nothing scrolls sideways"));
for (const f of (sweep.failed || []).slice(0, 20)) line("   x  " + f);
if (crashes.length) {
  line("CRASH  the check page itself threw:");
  for (const c of crashes.slice(0, 5)) line("   x  " + c);
}
line("");

const bad = smoke.bad + sweep.bad + crashes.length;
if (bad) {
  line("Something is wrong with what was just pushed. check-report.json has all of it.");
  process.exit(1);
}
line("Both checks clean.");
