// Central configuration for Study Library.

// ---------- the Supabase backend ----------
// 1. Create a free project at https://supabase.com → New project.
// 2. Copy the values from: Supabase dashboard → Project Settings → API
//      Project URL  → SUPABASE_URL below  (exactly like
//                     https://abcdefghijklmnopqrst.supabase.co — no trailing
//                     slash, no /rest/v1, NOT the dashboard URL)
//      anon public  → SUPABASE_ANON_KEY below
//    (Use the ANON key here, never the service_role key — the anon key
//    is safe to ship in frontend code because row-level security
//    decides what it may do.)
// 3. Run supabase/schema.sql in the SQL Editor, then supabase/seed.sql.
export const SUPABASE_URL = "https://wvjcbjrggxygdwvjqyut.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_9dr3ocbVTXoNCNFLO8bMVw_q1_6lnFr";

// Largest single file the site accepts on upload.
export const MAX_FILE_MB = 50;

// ---------- the admin lock ----------
export const REQUIRE_ADMIN_LOGIN = true;
// Turning the lock on later (content is ready, site goes public):
//   1. Supabase dashboard → Authentication → Users → "Add user"
//      (create the admin email + password there).
//   2. Run supabase/lockdown.sql in the SQL Editor — this revokes
//      anonymous writes in the DATABASE, so only the signed-in admin
//      can write. Hiding buttons in the interface is not protection;
//      the backend must refuse writes too.
//   3. Set REQUIRE_ADMIN_LOGIN = true here.
//   4. Sign in on the site at #/manage-bxpngexc.
