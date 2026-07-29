/* ============================================================
   My Shelf — Supabase connection settings
   ------------------------------------------------------------
   The two values live in the settings block at the BOTTOM of this
   file. Find them in the Supabase dashboard: Project Settings → API
     • url      = your "Project URL" — the bare address only,
                  e.g. https://abcd1234.supabase.co
                  (no /rest/v1/ on the end — supabase-js adds that)
     • anonKey  = your "anon public" key, or on newer projects the
                  "Publishable key" (sb_publishable_…). Either works.

   These two values are PUBLIC by design — it is safe for them to
   live in this file and on GitHub. Your data is protected by
   Row Level Security (see schema.sql): every row and every image
   is locked to the signed-in user who owns it.

   If these are left as YOUR_… placeholders, the app just runs in
   local-only mode (exactly like the old offline file) — no login,
   no sync.

   OPTIONAL — googleBooksKey:
   The 🔎 Auto-fill button uses Google Books without any key, but its
   keyless quota is shared per network and sometimes runs dry (the app
   then falls back to Open Library). A free key of your own removes
   that lottery:
     1. console.cloud.google.com → create a project (any name)
     2. APIs & Services → Library → enable "Books API"
     3. APIs & Services → Credentials → Create credentials → API key
     4. Paste the key below.
   Before committing the key to a public repo, restrict it: in the
   key's settings choose "Websites" and add your app's address, e.g.
   https://<your-username>.github.io/* — then it only works from your
   site and is safe to publish. Leave it "" to keep using the shared
   keyless quota.
   ============================================================ */
window.SHELF_CONFIG = {
  url: "https://ckomxkieiypfznyfagpc.supabase.co",
  anonKey: "sb_publishable_n6ma7ssOgVU2wG5XFjXPHA_5B4XhiGQ",
  googleBooksKey: "AIzaSyB4loZgVC1-ymgnZKzr96WLX2pFo0zFWmg"
};
