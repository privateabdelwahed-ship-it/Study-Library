// Supabase client for Study Library.
//
// If SUPABASE_URL / SUPABASE_ANON_KEY are still the placeholders in
// js/config.js, `supabase` is null and the whole site falls back to the
// local seed data (js/data/seed-data.js) — reads keep working, writes
// throw a loud, readable error instead of failing silently.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL as RAW_SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

// People often paste the URL with a trailing slash, a "/rest/v1" suffix,
// or the dashboard URL — any of those makes EVERY Supabase request fail
// with PGRST125 "Invalid path specified in request URL". Normalize so the
// common copy-paste forms still work.
function normalizeUrl(raw) {
  const original = String(raw || "").trim();
  const dashboard = original.match(/\/project\/([a-z0-9-]+)/i);
  if (dashboard) return `https://${dashboard[1]}.supabase.co`;
  const host = original.replace(/^https?:\/\//i, "").split("/")[0].replace(/\/+$/, "");
  return host ? `https://${host}` : original;
}

function looksLikeUrl(v) {
  // After normalization this is always "https://<host>" with no path.
  return typeof v === "string" && /^https:\/\/[^\/\s?#]+$/.test(v) && !v.includes("PASTE_YOUR");
}

function looksLikeKey(v) {
  return typeof v === "string" && v.length > 20 && !v.includes("PASTE_YOUR");
}

const SUPABASE_URL = normalizeUrl(RAW_SUPABASE_URL);
if (RAW_SUPABASE_URL && String(RAW_SUPABASE_URL).trim() !== SUPABASE_URL) {
  console.warn(
    "[supabase] SUPABASE_URL was cleaned up to " + SUPABASE_URL +
    " — in js/config.js paste the plain Project URL (https://<project-ref>.supabase.co), no trailing slash."
  );
}

const configured = looksLikeUrl(SUPABASE_URL) && looksLikeKey(SUPABASE_ANON_KEY);

export const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export function isBackendConfigured() {
  return supabase !== null;
}

if (!configured) {
  console.warn(
    "[supabase] Backend not configured — using local seed data. " +
    "Create a Supabase project and paste the URL + anon key into js/config.js (see README)."
  );
}
