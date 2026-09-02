// The Hardcover half of My Shelf's book lookup. This file does NOT run in the
// app — it runs inside your Supabase project, because Hardcover's rules say
// their API may only be spoken to from a server, never from a web page. So the
// app asks this function, and this function asks Hardcover, holding your key
// where no web page can see it.
//
// To set it up (once):
//
//   1. Get your key: hardcover.app → your avatar → Settings → Hardcover API
//      → New API Key. Name it "My Shelf", pick a long expiry, and it only
//      needs read access to books — no account scopes. Copy the whole token.
//
//   2. Deploy this file: supabase.com → your project → Edge Functions →
//      Deploy a new function → Via Editor. Name it exactly:  hardcover
//      Delete the sample code, paste this entire file in, press Deploy.
//
//   3. Store the key: still under Edge Functions, open Secrets and add one
//      named  HARDCOVER_TOKEN  with the token from step 1 as its value.
//
// That's all. The app reaches it through the same Supabase it already syncs
// with — nothing to paste into the app itself, on any device. If a lookup's
// "Hardcover didn't answer" line ever names this file or the secret, one of
// the three steps above is the thing to check.
//
// When this file changes, do step 2 again: open the function in the editor,
// replace its code with this file, Deploy. The secret stays.
//
// Two shapes of ask, both read-only:
//   { query: "words" }              — the book search the lookup makes
//   { gql: "query …", variables }  — a plain GraphQL query, used for the
//                                    books of a series. A mutation is refused
//                                    at the door: nothing here ever writes to
//                                    your Hardcover shelf.

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
  let q = "", gql = "", variables: unknown = null;
  try {
    const body = await req.json();
    q = String(body.query || "").slice(0, 300);
    gql = String(body.gql || "").slice(0, 4000);
    variables = body.variables ?? null;
  } catch (_e) { /* an unreadable body falls through to the check below */ }
  if (!q.trim() && !gql.trim()) return say(400, { error: "no query" });
  if (gql.trim() && /\bmutation\b/i.test(gql)) return say(400, { error: "only queries are passed through — nothing here writes to your shelf" });

  let token = (Deno.env.get("HARDCOVER_TOKEN") || "").trim();
  if (!token) {
    return say(500, { error: "the HARDCOVER_TOKEN secret is not set in Supabase (step 3 in hardcover-function.ts)" });
  }
  // Hardcover hands some tokens out already prefixed with "Bearer " — send it
  // the shape it expects either way.
  if (!/^Bearer /i.test(token)) token = "Bearer " + token;

  // One search is the whole conversation: a book document carries the blurb,
  // genres, moods, tags, content warnings, pages, year, isbns, cover, series
  // and slug all at once.
  const r = await fetch("https://api.hardcover.app/v1/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token,
      "User-Agent": "My Shelf (personal library, single user)",
    },
    body: JSON.stringify(gql.trim()
      ? { query: gql, variables: variables && typeof variables === "object" ? variables : {} }
      : {
        query: 'query ($q: String!) { search(query: $q, query_type: "Book", per_page: 5, page: 1) { results } }',
        variables: { q },
      }),
  });
  // Passed through as-is, status and all — the app reads Hardcover's own
  // error wording out of the body, which is what makes failures diagnosable
  // from the lookup panel instead of from guesswork.
  const body = await r.text();
  return new Response(body, { status: r.status, headers: { ...CORS, "Content-Type": "application/json" } });
});
