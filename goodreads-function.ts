// The Goodreads half of My Shelf's "what's on my Goodreads shelves" card.
// This file does NOT run in the app — it runs inside your Supabase project,
// like hardcover-function.ts, because Goodreads refuses to hand its feeds to
// a web page (no CORS header) while it hands them to a server without fuss.
// The app asks this function, and this function asks Goodreads, holding your
// feed link — which carries your private feed key — where no web page can see it.
//
// To set it up (once):
//
//   1. Get your feed link: goodreads.com → My Books → scroll to the very
//      bottom → the small RSS icon. Copy the link it opens. It looks like
//      https://www.goodreads.com/review/list_rss/1234567?key=…&shelf=%23ALL%23
//      That key is what lets the function read shelves you keep private, so
//      it must never go into config.js or anywhere public.
//
//   2. Deploy this file: supabase.com → your project → Edge Functions →
//      Deploy a new function → Via Editor. Name it exactly:  goodreads
//      Delete the sample code, paste this entire file in, press Deploy.
//      (The NAME is the address — the editor offers a sample name such as
//      smart-task, and renaming the title afterwards does not change it. If
//      that has happened, either make a new function called goodreads, or
//      tell the app the name: goodreadsFunction: "smart-task" in config.js.)
//
//   3. Store the link: still under Edge Functions, open Secrets and add one
//      named  GOODREADS_RSS  with the whole link from step 1 as its value.
//
// That's all. If the card ever says this file or the secret by name, one of
// the three steps above is the thing to check. When this file changes, do
// step 2 again; the secret stays.
//
// The ask is { shelf, page }: shelf is one of read, currently-reading,
// to-read, or #ALL#; page counts from 1 with 200 books a page, which is the
// most Goodreads gives. The answer is Goodreads' own XML, passed through as
// it is — the app reads it, so a change in what Goodreads writes is fixed in
// the app rather than here.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let shelf = "#ALL#", page = 1;
  try {
    const body = await req.json();
    shelf = String(body.shelf || "#ALL#").slice(0, 40);
    page = Math.max(1, Math.min(50, parseInt(body.page) || 1));
  } catch (_e) { /* an unreadable body keeps the defaults */ }
  if (!/^(#ALL#|[a-z0-9-]{1,40})$/.test(shelf)) return say(400, { error: "that is not a shelf name" });

  const link = (Deno.env.get("GOODREADS_RSS") || "").trim();
  if (!link) {
    return say(500, { error: "the GOODREADS_RSS secret is not set in Supabase (step 3 in goodreads-function.ts)" });
  }
  let url: URL;
  try { url = new URL(link); } catch (_e) {
    return say(500, { error: "the GOODREADS_RSS secret is not a link (step 1 in goodreads-function.ts)" });
  }
  url.searchParams.set("shelf", shelf);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", "200");

  const r = await fetch(url.href, {
    headers: { "User-Agent": "My Shelf (personal library, single user)", "Accept": "application/rss+xml, application/xml, text/xml" },
  });
  const body = await r.text();
  // Passed through as-is, status and all: the app reads Goodreads' own words
  // out of the body, which is what makes a failure diagnosable from the card.
  return new Response(body, {
    status: r.status,
    headers: { ...CORS, "Content-Type": r.headers.get("content-type") || "application/xml; charset=utf-8" },
  });
});
