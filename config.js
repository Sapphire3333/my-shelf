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
   ============================================================ */
window.SHELF_CONFIG = {
  url: "https://ckomxkieiypfznyfagpc.supabase.co",
  anonKey: "sb_publishable_n6ma7ssOgVU2wG5XFjXPHA_5B4XhiGQ"
};
