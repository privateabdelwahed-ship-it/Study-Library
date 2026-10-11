// i18n: t(key), setLang(), and document lang/dir switching.
// Arabic is proper right-to-left: the whole layout mirrors through
// CSS logical properties (see css/), not just right-aligned text.
import { translations } from "./translations.js";
import { getPrefs, setPref } from "../lib/prefs.js";
import { getSettings, getSite } from "../data/store.js";

let lang = getPrefs().lang || getSettings().defaultLang || "en";

export function getLang() {
  return lang;
}

// Look up a UI string; {vars} in the string are replaced. Falls back
// to English, then to the key itself, so a missing string never blanks the page.
export function t(key, vars) {
  let s = (translations[lang] && translations[lang][key]) ?? translations.en[key] ?? key;
  if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
  return s;
}

function apply() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.title = getSiteName();
}

// The <title> follows the site name, which the owner can rename later.
function getSiteName() {
  return getSite().name || "Study Library";
}

export function setLang(next) {
  if (next !== "en" && next !== "ar") return;
  lang = next;
  setPref("lang", next);
  apply();
  // Header and the current page re-render themselves on this event.
  window.dispatchEvent(new CustomEvent("langchange"));
}

export function initI18n() {
  apply();
}
