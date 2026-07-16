/* ============================================================
   My Shelf — Supabase connection settings
   ------------------------------------------------------------
   Paste your project's two values below. Find them in the
   Supabase dashboard:  Project Settings → API
     • url      = "https://ckomxkieiypfznyfagpc.supabase.co/rest/v1/"        (looks like https://abcd1234.supabase.co)
     • anonKey  = "sb_publishable_n6ma7ssOgVU2wG5XFjXPHA_5B4XhiGQ    (a long token starting with "eyJ...")

   These two values are PUBLIC by design — it is safe for them to
   live in this file and on GitHub. Your data is protected by
   Row Level Security (see schema.sql): every row and every image
   is locked to the signed-in user who owns it.

   Until you replace the YOUR_… placeholders, the app simply runs
   in local-only mode (exactly like the old offline file) — no
   login, no sync. Fill these in to switch cloud sync on.
   ============================================================ */
window.SHELF_CONFIG = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_ANON_PUBLIC_KEY"
};
