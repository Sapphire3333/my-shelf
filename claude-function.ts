// The Claude half of My Shelf's photo reading. This file does NOT run in the
// app — it runs inside your Supabase project, so your Anthropic API key stays
// where no web page can see it. The app sends this function a photo (a cover,
// or a page you want to quote), this function asks Claude what it says, and
// the answer comes back as the same boxes the app fills in today.
//
// To set it up (once):
//
//   1. Get a key: console.anthropic.com → sign in → choose the organisation
//      that has your API credits → Settings → API keys → Create key. Name it
//      "My Shelf". Copy the key (it starts sk-ant-) — it is shown only once.
//
//   2. Deploy this file: supabase.com → your project → Edge Functions →
//      Deploy a new function → Via Editor. Name it exactly:  claude
//      Delete the sample code, paste this entire file in, press Deploy.
//
//   3. Store two secrets: still under Edge Functions, open Secrets and add
//        ANTHROPIC_API_KEY   the key from step 1
//        ALLOWED_EMAILS      the email you sign in to My Shelf with
//                            (several, if ever needed, separated by commas)
//      Without ALLOWED_EMAILS the function answers nobody: your project's
//      address and public key are in the app for anyone to read, and every
//      answer here is paid for with your credit.
//
// Then in My Shelf: ⚙ Settings → How it works → 📷 Reading text in photos →
// "Check Claude". It says "Claude answered" or names the step to look at.
//
// When this file changes, do step 2 again: open the function in the editor,
// replace its code with this file, Deploy. The secrets stay.
//
// Three shapes of ask, all needing a signed-in My Shelf account:
//   { kind: "check" }                       — a one-word call, to prove it works
//   { kind: "book",  media_type, data }     — a cover, spine, title page or back
//   { kind: "quote", media_type, data }     — a page, for the passage and its page
// `data` is the photo as base64, no "data:" prefix. Nothing is stored here.

import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";

const MODEL = "claude-opus-5-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const say = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// what each kind of photo is asked for — every field always present, "" when
// the photo does not say, so the app can fill its boxes without guessing
const BOOK_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    author: { type: "string" },
    series: { type: "string" },
    seriesNum: { type: "string" },
    isbn: { type: "string" },
    pages: { type: "string" },
    year: { type: "string" },
    blurb: { type: "string" },
  },
  required: ["title", "subtitle", "author", "series", "seriesNum", "isbn", "pages", "year", "blurb"],
  additionalProperties: false,
};
const QUOTE_SCHEMA = {
  type: "object",
  properties: {
    text: { type: "string" },
    page: { type: "string" },
  },
  required: ["text", "page"],
  additionalProperties: false,
};
const ASK = {
  book:
    "This is a photo of a book: its cover, spine, title page or back cover, or a screenshot of the " +
    "book's page on a shop or catalogue site. Read only what is shown. " +
    "Return the title, any subtitle, the author or authors as printed (several joined with a comma), " +
    "the series name and the number in the series if printed, the ISBN if printed (digits only), the " +
    "number of pages if shown (digits only), the year it was published if shown (four digits), and " +
    "the blurb if there is one (a back cover, flap or description), as one paragraph. Use an empty string for " +
    "anything the photo does not show. Do not fill anything in from what you know about the book.",
  quote:
    "This is a photo of a page of a book. Return the passage as it reads: join the lines of a paragraph, " +
    "rejoin a word hyphenated across a line end, keep paragraph breaks as a single newline, and leave out " +
    "the running header, footnote markers and the page number. If part of the page is marked, underlined " +
    "or highlighted, return only that part. Put the page number printed on the page in `page` (digits or " +
    "roman numerals as printed), or an empty string if none shows.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ---- who is asking: a signed-in My Shelf account on the allowed list ----
  const allowed = (Deno.env.get("ALLOWED_EMAILS") || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) {
    return say(500, { error: "the ALLOWED_EMAILS secret is not set in Supabase (step 3 in claude-function.ts)" });
  }
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const base = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  let email = "";
  try {
    const u = await fetch(base + "/auth/v1/user", { headers: { apikey: anon, Authorization: "Bearer " + token } });
    if (u.ok) email = String((await u.json()).email || "").toLowerCase();
  } catch (_e) { /* falls through to the refusal below */ }
  if (!email) return say(401, { error: "not signed in — sign in to My Shelf and try again" });
  if (!allowed.includes(email)) return say(403, { error: "this account's email is not in ALLOWED_EMAILS (step 3)" });

  const key = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
  if (!key) return say(500, { error: "the ANTHROPIC_API_KEY secret is not set in Supabase (step 3 in claude-function.ts)" });

  let body: { kind?: string; media_type?: string; data?: string } = {};
  try { body = await req.json(); } catch (_e) { /* an unreadable body is refused below */ }
  const kind = String(body.kind || "");
  if (kind !== "check" && kind !== "book" && kind !== "quote") return say(400, { error: "unknown kind of ask" });

  const client = new Anthropic({ apiKey: key });
  // one road for both asks; the request shape is the API's to check
  // deno-lint-ignore no-explicit-any
  const ask = (params: Record<string, unknown>): Promise<any> =>
    // deno-lint-ignore no-explicit-any
    (client.beta.messages.create as (p: any) => Promise<any>)(params);
  try {
    if (kind === "check") {
      const r = await ask({
        model: MODEL,
        max_tokens: 64,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: "Reply with the single word OK." }],
      });
      // deno-lint-ignore no-explicit-any
      const text = r.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
      return say(200, { ok: true, model: r.model, said: text.slice(0, 40), email });
    }

    const mt = String(body.media_type || "image/jpeg");
    const data = String(body.data || "");
    if (!/^image\/(jpeg|png|webp|gif)$/.test(mt) || !data) return say(400, { error: "no photo in the ask" });
    if (data.length > 7_000_000) return say(413, { error: "the photo is too large — the app shrinks it first, so this should not happen" });

    // a decline by the safety classifiers is re-run on another model by the
    // API itself ("default" routes by why it was declined)
    const r = await ask({
      model: MODEL,
      max_tokens: 4096,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: kind === "book" ? BOOK_SCHEMA : QUOTE_SCHEMA },
      },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mt, data } },
          { type: "text", text: ASK[kind] },
        ],
      }],
    });
    if (r.stop_reason === "refusal") return say(422, { error: "Claude declined to read this photo" });
    // deno-lint-ignore no-explicit-any
    const text = r.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    let out: Record<string, string> = {};
    try { out = JSON.parse(text); } catch (_e) { return say(502, { error: "Claude's answer could not be read" }); }
    return say(200, { ok: true, kind, model: r.model, ...out });
  } catch (e) {
    // Anthropic's own wording (a wrong key, no credit left, overloaded) is
    // passed through, which is what makes "Check Claude" worth pressing
    const err = e as { status?: number; message?: string };
    return say(err.status && err.status >= 400 ? err.status : 502, { error: String(err.message || e).slice(0, 300) });
  }
});
