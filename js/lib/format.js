// Small formatting helpers: relative dates and file sizes, in en + ar.
import { t, getLang } from "../i18n/i18n.js";

// "3 days ago" / "منذ 3 أيام" — used on module cards and lesson rows.
export function timeAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const min = Math.floor(diff / 6e4);
  if (min < 1) return t("time_now");
  if (min < 60) return t("time_min", { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("time_hour", { n: hr });
  return t("time_day", { n: Math.floor(hr / 24) });
}

// "8.6 KB" — same in both languages.
export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n >= 10 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

// A calendar date in the visitor's language, e.g. "Oct 8, 2026".
export function formatDate(isoDate) {
  try {
    return new Date(isoDate).toLocaleDateString(getLang() === "ar" ? "ar" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return "";
  }
}

// Escape text before injecting it into HTML (titles come from data).
export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
