// The single permission check for the whole site.
//
// RULE: every edit path — buttons, forms, API calls, now and in the future —
// must go through canEdit(). Never invent a second check somewhere else.
// That way, turning the admin lock on (or off) happens in exactly one place.
import { REQUIRE_ADMIN_LOGIN } from "../config.js";
import { supabase } from "../data/supabase.js";

export async function canEdit() {
  if (!REQUIRE_ADMIN_LOGIN) return true;
  // The lock is on: only a signed-in admin may edit.
  // No backend configured (or no session) → fail closed, not open.
  if (!supabase) return false;
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}

export async function getSession() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

export async function signOut() {
  if (supabase) {
    try { await supabase.auth.signOut(); } catch { /* already out */ }
  }
}
