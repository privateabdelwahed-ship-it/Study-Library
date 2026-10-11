// Study Library — bootstrap.
// Wires together i18n, the header/footer, and the hash router.
// Pages are small modules under js/pages/; each exports render(args)
// and optionally mount(el, args) / unmount().
import { initI18n, t } from "./i18n/i18n.js";
import { getPrefs } from "./lib/prefs.js";
import { getSite, initStore } from "./data/store.js";
import { initRouter } from "./lib/router.js";
import { renderHeader } from "./components/header.js";
import { renderFooter } from "./components/footer.js";
import { canEdit } from "./lib/permissions.js";
import { isEditMode, setEditMode } from "./lib/editmode.js";
import * as home from "./pages/home.js";
import * as semester from "./pages/semester.js";
import * as modulePage from "./pages/module.js";
import * as lesson from "./pages/lesson.js";
import * as search from "./pages/search.js";
import * as about from "./pages/about.js";
import * as admin from "./pages/admin.js";
import * as settings from "./pages/settings.js";
import { notFound } from "./pages/not-found.js";

let app = document.getElementById("app");
let currentPage = null; // the page module currently on screen

function matchRoute({ segments, params }) {
  const [a, b, c, d] = segments;
  if (segments.length === 0) return { mod: home, args: {} };
  if (a === "about" && segments.length === 1) return { mod: about, args: {} };
  if (a === "manage-bxpngexc" && segments.length === 1) return { mod: admin, args: {} };
  if (a === "settings" && segments.length === 1) return { mod: settings, args: {} };
  if (a === "search") return { mod: search, args: { q: params.q || "" } };
  if (a === "s" && b && !c) return { mod: semester, args: { slug: b } };
  if (a === "s" && b && c && !d) return { mod: modulePage, args: { semSlug: b, modSlug: c } };
  if (a === "s" && b && c && d) return { mod: lesson, args: { semSlug: b, modSlug: c, lessonSlug: d } };
  return { mod: { render: notFound }, args: {} };
}

async function renderRoute(route) {
  // Let the outgoing page clean up (the PDF reader stops its workers).
  if (currentPage && currentPage.unmount) currentPage.unmount();

  const { mod, args } = matchRoute(route);
  currentPage = mod;
  // Swap in a fresh container before rendering: every page's mount()
  // attaches listeners to this element, and replacing innerHTML alone
  // would keep the old listeners alive — stacking one duplicate handler
  // per re-render (a single delete click would open N confirm dialogs
  // after N edits). A clone carries no listeners over.
  const fresh = app.cloneNode(false);
  app.replaceWith(fresh);
  app = fresh;
  app.innerHTML = mod.render(args);
  if (mod.mount) await mod.mount(app, args);

  // The browser tab follows the page's main heading.
  const h1 = app.querySelector("h1");
  const siteName = getSite().name;
  document.title = h1 ? `${h1.textContent.trim()} · ${siteName}` : siteName;
}

async function boot() {
  // Reading theme before first paint, so nothing flashes.
  document.documentElement.dataset.readingTheme = getPrefs().readingDark ? "dark" : "light";

  initI18n();
  // Load the live data from Supabase when configured; otherwise the
  // seed cache from js/data/seed-data.js keeps working offline.
  // Never let a backend failure black-screen the site: fall back to
  // the seed data and say so loudly in the console.
  try {
    await initStore();
  } catch (err) {
    console.error(
      "[app] Could not load data from Supabase — is supabase/schema.sql run? " +
      "Falling back to local seed data.",
      err
    );
  }

  // A stale edit session (signed out in another tab, lock switched on
  // meanwhile) must not leave edit mode switched on.
  if (isEditMode() && !(await canEdit())) {
    setEditMode(false);
  }

  await renderHeader();
  await renderFooter();

  // The skip link is static HTML; keep its label translated too.
  const skipLink = document.getElementById("skip-link");
  if (skipLink) skipLink.textContent = t("skip");

  const router = initRouter(renderRoute);

  // Language switch: re-render the header and the current page in place.
  window.addEventListener("langchange", async () => {
    await renderHeader();
    if (skipLink) skipLink.textContent = t("skip");
    router.refresh();
  });

  // A successful write (edit mode): re-render header + current route.
  // (The header also re-renders itself on editchange for the switch.)
  window.addEventListener("datachange", async () => {
    await renderHeader();
    router.refresh();
  });
  window.addEventListener("editchange", () => {
    router.refresh();
  });

  // The sticky header gains a soft shadow once the page scrolls.
  window.addEventListener("scroll", () => {
    const el = document.querySelector(".site-header");
    if (el) el.classList.toggle("is-scrolled", window.scrollY > 8);
  }, { passive: true });
}

boot();
