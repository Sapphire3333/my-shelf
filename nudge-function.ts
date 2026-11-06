// The evening nudge's half on Supabase. This file does NOT run in the app: it
// runs inside your Supabase project, because a phone only shows a notification
// that a server sends it. No keys to get and no secrets to set: the first time
// it runs it makes its own pair of keys and keeps them in a table nothing else
// can read.
//
// To set it up (once), from ⚙ Settings → How it works → 🔔 An evening nudge,
// which shows these steps with the text to copy:
//
//   1. Supabase → SQL Editor → New query: paste what the card shows, Run.
//      It makes three tables and a schedule that calls this function every
//      15 minutes.
//
//   2. Supabase → Edge Functions → Deploy a new function → Via Editor. Name it
//      exactly:  nudge
//      Delete the sample code, paste this entire file in, press Deploy.
//
//   3. Open the function → Details, turn off "Enforce JWT verification" and
//      save. The schedule has no sign-in to show at the door, and every ask
//      that touches an account checks the sign-in here instead.
//
// Then in My Shelf press Check it. When this file changes, do step 2 again.
//
// What it does every 15 minutes: for each row in public.nudge, works out the
// time in that row's time zone. Inside the hour after the chosen time, and with
// nothing sent for that evening yet, it sends the row's words to each device
// that said yes. It stays quiet during Quiet days, on a day already read, and
// after NUDGE_REST evenings with no reading. A browser refuses a push that
// shows nothing, so all of that is decided here and not on the phone. The words
// are written by the app (nudgeSaid in index.html) and carried here unread,
// encrypted for the one device (RFC 8291), so the push service can't read them.
//
// No npm packages: everything is WebCrypto and fetch, which is also why the
// crypto could be checked in a browser against the RFC's own worked example.

const FN_VERSION = 1;
const NUDGE_REST = 7; // evenings sent with no reading before it stops asking
const WINDOW_MIN = 60; // how long after the chosen time a missed run may still send
const PUSH_TTL = 3 * 3600; // a push the phone can't take by then is dropped: not tomorrow's news

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const say = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ---- bytes ----
const enc = (s) => new TextEncoder().encode(s);
const join = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

// ---- RFC 8291: the words, sealed for one device ----
async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, bytes * 8));
}
// `fixed` is only ever the RFC's worked example: { pair, salt }
async function sealFor(plain, uaPublicB64, authB64, fixed) {
  const uaPublic = unb64u(uaPublicB64), auth = unb64u(authB64);
  const pair = fixed ? fixed.pair : await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, pair.privateKey, 256));
  const salt = fixed ? fixed.salt : crypto.getRandomValues(new Uint8Array(16));
  const ikm = await hkdf(auth, shared, join(enc("WebPush: info\0"), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, key, join(plain, new Uint8Array([2]))));
  return join(salt, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([65]), asPublic, body);
}

// ---- RFC 8292: who is sending ----
async function vapidHeader(endpoint, keys, subject) {
  const head = b64u(enc(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(enc(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey("jwk", keys.private_jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc(head + "." + claims)));
  return "vapid t=" + head + "." + claims + "." + b64u(sig) + ", k=" + keys.public_key;
}
async function sendOne(device, said, keys) {
  const body = await sealFor(enc(JSON.stringify(said)), device.p256dh, device.auth);
  const r = await fetch(device.endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(PUSH_TTL),
      Urgency: "high",
      Topic: "nudge",
      Authorization: await vapidHeader(device.endpoint, keys, Deno.env.get("SUPABASE_URL") || "https://supabase.com"),
    },
    body,
  });
  let text = "";
  try { text = (await r.text()).slice(0, 200); } catch (_e) { /* the code says enough */ }
  return { code: r.status, text };
}

// ---- the tables, as this function alone may see them ----
function serviceKey() {
  const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (k) return k;
  try { return Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"))[0] || ""; } catch (_e) { return ""; }
}
async function db(path, opts) {
  const key = serviceKey();
  const headers = { apikey: key, "Content-Type": "application/json", ...((opts && opts.headers) || {}) };
  if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key;
  const r = await fetch((Deno.env.get("SUPABASE_URL") || "") + "/rest/v1/" + path, {
    method: (opts && opts.method) || "GET",
    headers,
    body: opts && opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(/does not exist|schema cache|PGRST205|42P01/.test(text) ? "the tables aren't there: run the SQL (step 1)" : "the database said " + r.status + ": " + text.slice(0, 160));
  return text ? JSON.parse(text) : null;
}
async function keysOf() {
  const rows = await db("nudge_state?id=eq.1&select=*");
  if (rows && rows[0] && rows[0].public_key) return rows[0];
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const row = {
    id: 1,
    public_key: b64u(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey))),
    private_jwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
  // two first runs at once: whichever got in first stands, and both read it back
  await db("nudge_state?on_conflict=id", { method: "POST", body: row, headers: { Prefer: "resolution=ignore-duplicates" } });
  return (await db("nudge_state?id=eq.1&select=*"))[0];
}
async function sendAndNote(device, said, keys) {
  let out;
  try { out = await sendOne(device, said, keys); }
  catch (e) { out = { code: 0, text: String((e && e.message) || e).slice(0, 200) }; }
  const where = "nudge_devices?endpoint=eq." + encodeURIComponent(device.endpoint);
  // gone for good: the browser dropped this subscription, so it can't be sent to again
  if (out.code === 404 || out.code === 410) await db(where, { method: "DELETE" });
  else await db(where, { method: "PATCH", body: { last_at: Date.now(), last_code: out.code, last_text: out.text } });
  return out;
}

// ---- when ----
function zoneParts(ms, tz) {
  const p = {};
  let f;
  try { f = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch (_e) { f = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  f.formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
  return { day: p.year + "-" + p.month + "-" + p.day, min: (+p.hour % 24) * 60 + +p.minute };
}
// { send, why, evening, unread }: pure, so every way of staying quiet can be tried
function nudgeDue(row, now) {
  const here = zoneParts(now, row.tz);
  const since = (here.min - (+row.at_min || 0) + 1440) % 1440;
  if (since >= WINDOW_MIN) return { send: false, why: "not the time" };
  // the evening this slot began on, so 23:45 and the 00:10 run are one evening
  const evening = zoneParts(now - since * 60000, row.tz).day;
  if (row.last_day === evening) return { send: false, why: "already sent", evening };
  if ((+row.quiet_until || 0) > now) return { send: false, why: "quiet days", evening };
  if (!row.said) return { send: false, why: "no words yet", evening };
  const shelfDay = zoneParts(now - (+row.day_line || 0) * 3600000, row.tz).day;
  if (row.read_day && row.read_day === shelfDay) return { send: false, why: "read today", evening };
  // reading anything starts the count again
  const unread = row.read_day === (row.unread_from || "") ? +row.unread || 0 : 0;
  if (unread >= NUDGE_REST) return { send: false, why: "resting", evening, unread };
  return { send: true, why: "due", evening, unread };
}
async function tick(now) {
  const keys = await keysOf();
  const rows = (await db("nudge?select=*")) || [];
  let sent = 0;
  for (const row of rows) {
    try {
      const due = nudgeDue(row, now);
      if (!due.send) continue;
      const devices = (await db("nudge_devices?user_id=eq." + row.user_id + "&select=*")) || [];
      let good = 0;
      for (const d of devices) { const r = await sendAndNote(d, row.said, keys); if (r.code >= 200 && r.code < 300) { good++; sent++; } }
      // nothing reached a push service: the next run inside the hour tries again
      if (good) await db("nudge?user_id=eq." + row.user_id, { method: "PATCH", body: { last_day: due.evening, last_at: now, last_title: String(row.said.title || "").slice(0, 200), unread: due.unread + 1, unread_from: row.read_day || "" } });
    } catch (e) { console.error("nudge row", String((e && e.message) || e)); }
  }
  await db("nudge_state?id=eq.1", { method: "PATCH", body: { last_tick: now } });
  return sent;
}

// ---- the door ----
async function whoIs(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return "";
  try {
    const u = await fetch((Deno.env.get("SUPABASE_URL") || "") + "/auth/v1/user", { headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") || "", Authorization: "Bearer " + token } });
    if (u.ok) return String((await u.json()).id || "");
  } catch (_e) { /* falls through to the refusal */ }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body = {};
  try { body = await req.json(); } catch (_e) { /* an unreadable body is refused below */ }
  const action = String(body.action || "");
  try {
    // these three say nothing about anyone: a tick can only send what is due, once
    if (action === "ping") return say(200, { ok: true, version: FN_VERSION });
    if (action === "tick") return say(200, { ok: true, version: FN_VERSION, sent: await tick(Date.now()) });
    if (action === "key") return say(200, { ok: true, publicKey: (await keysOf()).public_key });

    const user = await whoIs(req);
    if (!user) return say(401, { error: "not signed in: sign in to My Shelf and try again" });
    const uid = "user_id=eq." + user;

    if (action === "check") {
      const keys = await keysOf();
      const row = ((await db("nudge?" + uid + "&select=at_min,tz,last_day,last_at,last_title,unread,read_day,unread_from")) || [])[0] || null;
      const devices = (await db("nudge_devices?" + uid + "&select=endpoint,label,last_at,last_code,last_text")) || [];
      const state = ((await db("nudge_state?id=eq.1&select=last_tick")) || [])[0] || {};
      const unread = row && row.read_day === (row.unread_from || "") ? +row.unread || 0 : 0;
      return say(200, { ok: true, version: FN_VERSION, publicKey: keys.public_key, now: Date.now(), lastTick: +state.last_tick || 0, row, devices, resting: unread >= NUDGE_REST, rest: NUDGE_REST });
    }
    if (action === "test") {
      const rows = (await db("nudge_devices?" + uid + "&endpoint=eq." + encodeURIComponent(String(body.endpoint || "")) + "&select=*")) || [];
      if (!rows[0]) return say(404, { error: "this device isn't on the list: press Turn on first" });
      if (!body.said || !body.said.title) return say(400, { error: "nothing to say" });
      const out = await sendAndNote(rows[0], body.said, await keysOf());
      return say(200, { ok: out.code >= 200 && out.code < 300, code: out.code, text: out.text });
    }
    return say(400, { error: "unknown action" });
  } catch (e) {
    return say(500, { error: String((e && e.message) || e).slice(0, 300) });
  }
});
