// Site header: brand, nav, search, language switch, reading-theme
// toggle — plus, when allowed, the Edit mode switch.
// Re-rendered on language change and on editchange (see bottom).
import { t, getLang, setLang } from "../i18n/i18n.js";
import { getSite } from "../data/store.js";
import { getPrefs, setPref } from "../lib/prefs.js";
import { icons } from "../lib/icons.js";
import { esc } from "../lib/format.js";
import { canEdit } from "../lib/permissions.js";
import { isBackendConfigured } from "../data/supabase.js";
import { isEditMode, setEditMode } from "../lib/editmode.js";

function currentPath() {
  return location.hash.replace(/^#/, "") || "/";
}

function isActive(prefix) {
  const p = currentPath();
  if (prefix === "/") return p === "/" || p === "";
  return p === prefix || p.startsWith(prefix + "/");
}

// The thin black bar under the header while edit mode is on.
export function renderEditBar() {
  const mount = document.getElementById("site-header");
  if (!mount) return;
  let bar = mount.querySelector("#edit-bar");
  if (!isEditMode()) {
    bar?.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "edit-bar";
    mount.appendChild(bar);
  }
  bar.innerHTML = `
    <div class="container editbar-inner">
      <span class="editbar-dot" aria-hidden="true"></span>
      <span>${t("edit_on")}</span>
      <span id="edit-saved" aria-hidden="true">✓ ${t("edit_saved")}</span>
      <span class="editbar-spacer"></span>
      <a class="editbar-link" href="#/settings">${t("settings")}</a>
      <button class="editbar-exit" id="edit-exit">${t("exit")}</button>
    </div>`;
  bar.querySelector("#edit-exit").addEventListener("click", () => setEditMode(false));
}

export async function renderHeader() {
  const mount = document.getElementById("site-header");
  const site = getSite();
  const dark = getPrefs().readingDark;
  const q = new URLSearchParams(location.hash.split("?")[1] || "").get("q") || "";

  mount.innerHTML = `
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="#/" aria-label="${esc(site.name)}">
          <span class="brand-mark" aria-hidden="true"></span>${esc(site.name)}
        </a>
        <nav class="main-nav" aria-label="Main">
          <a href="#/" ${isActive("/") ? 'aria-current="page"' : ""}>${t("nav_home")}</a>
          <a href="#/about" ${isActive("/about") ? 'aria-current="page"' : ""}>${t("nav_about")}</a>
        </nav>
        <div class="header-search">
          <form id="site-search" role="search">
            <label class="sr-only" for="q">${t("search_label")}</label>
            <input id="q" name="q" type="search" class="input"
                   placeholder="${esc(t("search_placeholder"))}" value="${esc(q)}" autocomplete="off">
            <button type="submit" aria-label="${t("search_label")}">${icons.search()}</button>
          </form>
        </div>
        <div class="header-tools">
          <button class="lang-switch" id="lang-switch" title="Language / اللغة">${t("lang_name")}</button>
          <button class="icon-btn" id="theme-toggle"
                  aria-label="${dark ? t("theme_to_light") : t("theme_to_dark")}"
                  title="${dark ? t("theme_to_light") : t("theme_to_dark")}">
            ${dark ? icons.sun() : icons.moon()}
          </button>
        </div>
      </div>
    </header>`;

  // The edit bar lives under the header (outside the sticky element).
  renderEditBar();

  // Edit switch: only for people who may edit AND when a backend exists
  // to save to. canEdit() is async (it may check the admin session).
  if (isBackendConfigured() && (await canEdit())) {
    const tools = mount.querySelector(".header-tools");
    const label = document.createElement("label");
    label.className = "edit-toggle";
    label.innerHTML = `
      <input type="checkbox" id="edit-toggle" ${isEditMode() ? "checked" : ""} aria-label="${esc(t("edit_mode"))}">
      <span class="switch" aria-hidden="true"></span>
      <span>${t("edit_mode")}</span>`;
    label.querySelector("input").addEventListener("change", (e) => setEditMode(e.target.checked));
    tools.prepend(label);
  }

  mount.querySelector("#site-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const value = mount.querySelector("#q").value.trim();
    location.hash = "#/search?q=" + encodeURIComponent(value);
  });

  mount.querySelector("#lang-switch").addEventListener("click", () => {
    setLang(getLang() === "en" ? "ar" : "en");
  });

  mount.querySelector("#theme-toggle").addEventListener("click", () => {
    const next = !getPrefs().readingDark;
    setPref("readingDark", next);
    document.documentElement.dataset.readingTheme = next ? "dark" : "light";
    renderHeader(); // swap the moon/sun icon
  });
}

// Edit mode flips re-render the header (switch state + edit bar).
window.addEventListener("editchange", () => { renderHeader(); });
