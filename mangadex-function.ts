// The MangaDex half of My Shelf. This file does NOT run in the app — it runs
// inside your Supabase project. MangaDex answers no other website ("We do not
// send CORS responses for other websites than ours") and serves the wrong
// picture to any page that links to its images, so the app asks this function
// and the function asks MangaDex, with an honest User-Agent, as MangaDex's
// rules want (https://api.mangadex.org/docs/2-limitations/).
//
// To set it up (once):
//
//   1. Deploy this file: supabase.com → your project → Edge Functions →
//      Deploy a new function → Via Editor. Name it exactly:  mangadex
//      Delete the sample code, paste this entire file in, press Deploy.
//
//   2. Nothing else: it uses the ALLOWED_EMAILS secret the claude function
//      already set (Edge Functions → Secrets). It needs no key — MangaDex is
//      free to use with credit to MangaDex and to each scanlation group, which
//      the app shows beside every chapter, and without ads or paid features.
//
// Then in My Shelf: ＋ Add book → 🔎 From MangaDex, and search.
//
// When this file changes, do step 1 again: open the function in the editor,
// replace its code with this file, Deploy. The app knows which version it
// needs (FN_VERSION below).
//
// Every page picture comes through here, so it counts against your Supabase
// project's monthly transfer: a page is about 300 KB on data saver and about
// 1.6 MB at full quality (measured 2026-11-15).
//
// Kinds of ask (POST, JSON, from a signed-in My Shelf account):
//   { kind: "check" }                          → { ok, version }
//   { kind: "search", q, offset? }             → { total, results: [series] }
//   { kind: "manga", id }                      → { result: series }
//   { kind: "feed", id }                       → { chapters: [chapter] } English, in order
//   { kind: "pages", id, saver }               → { base, hash, files, saver }
//   { kind: "img", base, hash, file, saver }   → the picture itself
//   { kind: "cover", id, file, size }          → the cover picture (size 256 or 512)

const FN_VERSION = 1;
const API = "https://api.mangadex.org";
const UA = "MyShelf/1.0 (a personal reading app; one reader)";
// every rating: the app's own setting decides what is asked for
const RATINGS = ["safe", "suggestive", "erotica", "pornographic"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const say = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// deno-lint-ignore no-explicit-any
const md = async (path: string, q: Record<string, any> = {}): Promise<any> => {
  const u = new URL(API + path);
  for (const [k, v] of Object.entries(q)) {
    if (Array.isArray(v)) v.forEach((x) => u.searchParams.append(k, String(x)));
    else if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
  }
  const r = await fetch(u, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("MangaDex answered " + r.status);
  return await r.json();
};
// the English words of a localised field, else the first there is
// deno-lint-ignore no-explicit-any
const en = (o: any) => (o && (o.en || o["ja-ro"] || o["ko-ro"] || o["zh-ro"] || Object.values(o)[0])) || "";
// deno-lint-ignore no-explicit-any
const series = (m: any) => {
  const a = m.attributes || {}, rel = m.relationships || [];
  // deno-lint-ignore no-explicit-any
  const people = (t: string) => rel.filter((r: any) => r.type === t && r.attributes).map((r: any) => String(r.attributes.name || ""));
  // deno-lint-ignore no-explicit-any
  const cover = rel.find((r: any) => r.type === "cover_art" && r.attributes);
  // a Korean or Japanese series is titled in romaji first ("Angnyeo neun
  // Marionette"); its English name, when it has one, is among the others
  // deno-lint-ignore no-explicit-any
  const enAlt = (a.altTitles || []).find((t: any) => t && t.en);
  return {
    id: m.id,
    title: (a.title && a.title.en) || (enAlt && enAlt.en) || en(a.title),
    // deno-lint-ignore no-explicit-any
    alt: (a.altTitles || []).map((t: any) => en(t)).filter(Boolean).slice(0, 12),
    desc: String((a.description && a.description.en) || ""),
    lang: String(a.originalLanguage || ""),
    status: String(a.status || ""),
    year: a.year || null,
    rating: String(a.contentRating || ""),
    // deno-lint-ignore no-explicit-any
    tags: (a.tags || []).map((t: any) => ({ n: en(t.attributes && t.attributes.name), g: String((t.attributes && t.attributes.group) || "") })),
    authors: [...new Set([...people("author"), ...people("artist")])],
    cover: cover ? String(cover.attributes.fileName || "") : "",
    last: String(a.lastChapter || ""),
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ---- who is asking: a signed-in My Shelf account on the allowed list ----
  // (every picture passes through here, so it is only yours to spend)
  const allowed = (Deno.env.get("ALLOWED_EMAILS") || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) return say(500, { error: "the ALLOWED_EMAILS secret is not set in Supabase (see claude-function.ts, step 3)" });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const base = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  let email = "";
  try {
    const u = await fetch(base + "/auth/v1/user", { headers: { apikey: anon, Authorization: "Bearer " + token } });
    if (u.ok) email = String((await u.json()).email || "").toLowerCase();
  } catch (_e) { /* falls through to the refusal below */ }
  if (!email) return say(401, { error: "not signed in — sign in to My Shelf and try again" });
  if (!allowed.includes(email)) return say(403, { error: "this account's email is not in ALLOWED_EMAILS" });

  // deno-lint-ignore no-explicit-any
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch (_e) { /* refused below */ }
  const kind = String(body.kind || "");
  const ratings = Array.isArray(body.ratings) && body.ratings.length
    ? body.ratings.filter((r: string) => RATINGS.includes(r)) : RATINGS;
  const id = String(body.id || "");
  const isId = (s: string) => /^[0-9a-f-]{36}$/.test(s);

  try {
    if (kind === "check") return say(200, { ok: true, version: FN_VERSION });

    if (kind === "search") {
      const j = await md("/manga", {
        title: String(body.q || "").slice(0, 200), limit: 20, offset: Math.max(0, +body.offset || 0),
        "includes[]": ["cover_art", "author", "artist"], "contentRating[]": ratings,
        "availableTranslatedLanguage[]": ["en"], "order[relevance]": "desc",
      });
      return say(200, { total: j.total || 0, results: (j.data || []).map(series), version: FN_VERSION });
    }

    if (kind === "manga") {
      if (!isId(id)) return say(400, { error: "not a MangaDex id" });
      const j = await md("/manga/" + id, { "includes[]": ["cover_art", "author", "artist"] });
      return say(200, { result: series(j.data), version: FN_VERSION });
    }

    if (kind === "feed") {
      if (!isId(id)) return say(400, { error: "not a MangaDex id" });
      // deno-lint-ignore no-explicit-any
      const out: any[] = [];
      for (let offset = 0; offset < 5000; offset += 500) {
        const j = await md("/manga/" + id + "/feed", {
          limit: 500, offset, "translatedLanguage[]": ["en"], "contentRating[]": ratings,
          // NOT includeExternalUrl=1: that asks for ONLY the chapters that link
          // out to a publisher (a series of 300 readable chapters answered 0)
          "order[volume]": "asc", "order[chapter]": "asc", "includes[]": ["scanlation_group"],
        });
        for (const c of j.data || []) {
          const a = c.attributes || {};
          out.push({
            id: c.id, ch: String(a.chapter || ""), vol: String(a.volume || ""), title: String(a.title || ""),
            pages: a.pages || 0, ext: String(a.externalUrl || ""), at: String(a.readableAt || a.publishAt || ""),
            // deno-lint-ignore no-explicit-any
            groups: (c.relationships || []).filter((r: any) => r.type === "scanlation_group" && r.attributes).map((r: any) => String(r.attributes.name || "")),
          });
        }
        if (offset + 500 >= (j.total || 0)) break;
      }
      return say(200, { chapters: out, version: FN_VERSION });
    }

    if (kind === "pages") {
      if (!isId(id)) return say(400, { error: "not a MangaDex id" });
      const j = await md("/at-home/server/" + id);
      const saver = !!body.saver;
      return say(200, { base: j.baseUrl, hash: j.chapter.hash, files: saver ? j.chapter.dataSaver : j.chapter.data, saver, version: FN_VERSION });
    }

    if (kind === "img") {
      const b = String(body.base || ""), h = String(body.hash || ""), f = String(body.file || "");
      // only MangaDex's own picture servers: this is not a door to the web
      if (!/^https:\/\/([a-z0-9-]+\.)+mangadex\.network(:\d+)?$/.test(b) && b !== "https://uploads.mangadex.org") return say(400, { error: "not a MangaDex picture server" });
      if (!/^[0-9a-f]{32}$/.test(h) || !/^[A-Za-z0-9._-]{1,200}$/.test(f)) return say(400, { error: "not a MangaDex picture" });
      const url = `${b}/${body.saver ? "data-saver" : "data"}/${h}/${f}`;
      const t0 = Date.now();
      let r: Response | null = null, bytes = 0, ok = false, cached = false;
      try {
        r = await fetch(url, { headers: { "User-Agent": UA } });
        cached = /^HIT/i.test(r.headers.get("x-cache") || "");
        if (r.ok) { const buf = await r.arrayBuffer(); bytes = buf.byteLength; ok = true; r = new Response(buf, { headers: r.headers }); }
      } catch (_e) { /* reported as a failure below */ }
      // MangaDex@Home asks every reader of a node that is not mangadex.org to say how it went
      if (!/mangadex\.org/.test(b)) {
        fetch("https://api.mangadex.network/report", {
          method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA },
          body: JSON.stringify({ url, success: ok, cached, bytes, duration: Date.now() - t0 }),
        }).catch(() => {});
      }
      if (!ok || !r) return say(502, { error: "the picture didn't come", retry: true });
      return new Response(r.body, { headers: { ...CORS, "Content-Type": r.headers.get("content-type") || "image/jpeg", "Cache-Control": "private, max-age=86400" } });
    }

    if (kind === "cover") {
      const f = String(body.file || "");
      if (!isId(id) || !/^[A-Za-z0-9._-]{1,200}$/.test(f)) return say(400, { error: "not a MangaDex cover" });
      const size = +body.size === 512 ? 512 : 256;
      const r = await fetch(`https://uploads.mangadex.org/covers/${id}/${f}.${size}.jpg`, { headers: { "User-Agent": UA } });
      if (!r.ok) return say(502, { error: "the cover didn't come" });
      return new Response(r.body, { headers: { ...CORS, "Content-Type": r.headers.get("content-type") || "image/jpeg", "Cache-Control": "private, max-age=604800" } });
    }

    return say(400, { error: "unknown kind of ask" });
  } catch (e) {
    return say(502, { error: String((e as Error).message || e) });
  }
});
