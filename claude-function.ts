// The Claude half of My Shelf. This file does NOT run in the app — it runs
// inside your Supabase project, so your Anthropic API key stays where no web
// page can see it. The app sends this function a photo or a question, this
// function asks Claude, and the answer comes back to the app.
//
// To set it up (once):
//
//   1. Get a key: console.anthropic.com → sign in → choose the organisation
//      that has your API credits → search the Console for "API keys" →
//      Create key → Continue with an API key. Name it "My Shelf". Copy the
//      key (it starts sk-ant-) — it is shown only once.
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
// replace its code with this file, Deploy. The secrets stay. The app knows
// which version it needs (FN_VERSION below) and Check Claude says when the
// one in Supabase is older.
//
// Four shapes of ask, all needing a signed-in My Shelf account:
//   { kind: "check", web? }                 — a one-word call, to prove it works;
//                                             with web: true, one web search too
//   { kind: "book",  media_type, data }     — a cover, spine, title page or back
//   { kind: "quote", media_type, data }     — a page, for the passage and its page
//   { kind: "ask", text, system?, schema?, images?, web?, effort?, max_tokens? }
//                                           — anything else the app asks: the
//                                             app writes the question, this
//                                             function only carries it
// `data` is a photo as base64, no "data:" prefix. Nothing is stored here.
// Every answer carries `usage` (tokens and web searches) for the app's meter.

import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";

const MODEL = "claude-opus-5-5";
const FN_VERSION = 2;

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

// the image types the API reads, and the most a photo may weigh as base64
const IMAGE_TYPE = /^image\/(jpeg|png|webp|gif)$/;
const MAX_IMAGE = 7_000_000;

type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; searches: number };
// deno-lint-ignore no-explicit-any
const addUsage = (u: Usage, r: any) => {
  const x = r.usage || {};
  u.input += x.input_tokens || 0;
  u.output += x.output_tokens || 0;
  u.cacheRead += x.cache_read_input_tokens || 0;
  u.cacheWrite += x.cache_creation_input_tokens || 0;
  u.searches += (x.server_tool_use && x.server_tool_use.web_search_requests) || 0;
};
// deno-lint-ignore no-explicit-any
const textOf = (r: any) => r.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
// the JSON object an answer ends with, when it could not be held to a schema
// by the API itself (a web search turn writes prose first)
const lastObject = (t: string) => {
  const s = t.replace(/```(?:json)?/g, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  return a >= 0 && b > a ? JSON.parse(s.slice(a, b + 1)) : null;
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

  // deno-lint-ignore no-explicit-any
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch (_e) { /* an unreadable body is refused below */ }
  const kind = String(body.kind || "");
  if (!["check", "book", "quote", "ask"].includes(kind)) return say(400, { error: "unknown kind of ask" });

  const client = new Anthropic({ apiKey: key });
  // one road for every ask; the request shape is the API's to check. A
  // decline by the safety classifiers is re-run on another model by the API
  // itself ("default" routes by why it was declined)
  // deno-lint-ignore no-explicit-any
  const ask = (params: Record<string, unknown>): Promise<any> =>
    // deno-lint-ignore no-explicit-any
    (client.beta.messages.create as (p: any) => Promise<any>)({
      model: MODEL,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      ...params,
    });
  const usage: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0 };
  // a turn with web searches can pause after ten server-side steps; it is
  // sent back as it stands and the API carries on where it stopped
  // deno-lint-ignore no-explicit-any
  const run = async (params: Record<string, any>) => {
    // deno-lint-ignore no-explicit-any
    const messages: any[] = [...params.messages];
    // deno-lint-ignore no-explicit-any
    const turns: any[] = [];
    let r = await ask({ ...params, messages });
    addUsage(usage, r); turns.push(r);
    for (let i = 0; r.stop_reason === "pause_turn" && i < 4; i++) {
      messages.push({ role: "assistant", content: r.content });
      r = await ask({ ...params, messages });
      addUsage(usage, r); turns.push(r);
    }
    return { r, turns };
  };
  const webTool = (n: number) => [{ type: "web_search_20260209", name: "web_search", max_uses: n }];
  // the pages a web search turn read, for the app to show as "found on"
  // deno-lint-ignore no-explicit-any
  const sourcesOf = (turns: any[]) => {
    const seen = new Map<string, string>();
    for (const t of turns) for (const b of t.content) {
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        // deno-lint-ignore no-explicit-any
        for (const s of b.content as any[]) if (s.url && !seen.has(s.url)) seen.set(s.url, String(s.title || ""));
      }
    }
    return [...seen].slice(0, 8).map(([url, title]) => ({ url, title }));
  };

  try {
    if (kind === "check") {
      const { r } = await run({
        max_tokens: 64,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: "Reply with the single word OK." }],
      });
      const out: Record<string, unknown> = { ok: true, version: FN_VERSION, model: r.model, said: textOf(r).trim().slice(0, 40), email };
      if (body.web) {
        const w = await run({
          max_tokens: 1024,
          output_config: { effort: "low" },
          tools: webTool(1),
          messages: [{ role: "user", content: "Search the web once for: Open Library. Then reply with the title of one page you found, in eight words or fewer." }],
        });
        out.web = { said: textOf(w.r).trim().slice(0, 80), sources: sourcesOf(w.turns).length };
      }
      return say(200, { ...out, usage });
    }

    if (kind === "book" || kind === "quote") {
      const mt = String(body.media_type || "image/jpeg");
      const data = String(body.data || "");
      if (!IMAGE_TYPE.test(mt) || !data) return say(400, { error: "no photo in the ask" });
      if (data.length > MAX_IMAGE) return say(413, { error: "the photo is too large — the app shrinks it first, so this should not happen" });
      const { r } = await run({
        max_tokens: 4096,
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
      let out: Record<string, string> = {};
      try { out = JSON.parse(textOf(r)); } catch (_e) { return say(502, { error: "Claude's answer could not be read" }); }
      return say(200, { ok: true, kind, model: r.model, ...out, usage });
    }

    // ---- kind "ask": the app's own question, carried as it is ----
    const text = String(body.text || "");
    if (!text.trim()) return say(400, { error: "no question in the ask" });
    if (text.length > 400_000) return say(413, { error: "the question is too long" });
    // deno-lint-ignore no-explicit-any
    const images: any[] = Array.isArray(body.images) ? body.images.slice(0, 10) : [];
    for (const im of images) {
      if (!im || !IMAGE_TYPE.test(String(im.media_type)) || !im.data || String(im.data).length > MAX_IMAGE) {
        return say(400, { error: "a photo in the ask could not be read" });
      }
    }
    const web = Math.max(0, Math.min(5, Number(body.web) || 0));
    const effort = ["low", "medium", "high"].includes(body.effort) ? body.effort : "low";
    const maxTokens = Math.max(256, Math.min(16000, Number(body.max_tokens) || 4096));
    const schema = body.schema && typeof body.schema === "object" ? body.schema : null;
    // a schema is held by the API itself when nothing else is in play; with
    // web searches the answer is asked for as a JSON object at its end
    const held = schema && !web;
    const ending = schema && web
      ? "\n\nWhen you are done, reply with only a JSON object matching this JSON Schema, and nothing after it:\n" + JSON.stringify(schema)
      : "";
    const { r, turns } = await run({
      max_tokens: maxTokens,
      output_config: { effort, ...(held ? { format: { type: "json_schema", schema } } : {}) },
      ...(body.system ? { system: String(body.system).slice(0, 20_000) } : {}),
      ...(web ? { tools: webTool(web) } : {}),
      messages: [{
        role: "user",
        content: [
          ...images.map((im) => ({ type: "image", source: { type: "base64", media_type: String(im.media_type), data: String(im.data) } })),
          { type: "text", text: text + ending },
        ],
      }],
    });
    if (r.stop_reason === "refusal") return say(422, { error: "Claude declined to answer this", usage });
    const said = textOf(r);
    const out: Record<string, unknown> = { ok: true, kind, model: r.model, stop: r.stop_reason, usage };
    if (web) out.sources = sourcesOf(turns);
    if (schema) {
      try { out.json = held ? JSON.parse(said) : lastObject(said); } catch (_e) { out.json = null; }
      if (!out.json) return say(502, { error: "Claude's answer could not be read", usage });
    } else out.text = said.trim();
    return say(200, out);
  } catch (e) {
    // Anthropic's own wording (a wrong key, no credit left, overloaded) is
    // passed through, which is what makes "Check Claude" worth pressing
    const err = e as { status?: number; message?: string };
    return say(err.status && err.status >= 400 ? err.status : 502, { error: String(err.message || e).slice(0, 300), usage });
  }
});
