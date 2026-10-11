// Admin: the lock's front door.
//
// Lock OFF (REQUIRE_ADMIN_LOGIN = false) → the original placeholder:
// anyone with the link can browse, and canEdit() is always true.
// Lock ON → a Supabase email+password sign-in. The first admin account
// is created in the Supabase dashboard (Authentication → Add user);
// the README walks through it. Signing in flips edit mode on;
// signing out flips it off.
import { t } from "../i18n/i18n.js";
import { icons } from "../lib/icons.js";
import { esc } from "../lib/format.js";
import { REQUIRE_ADMIN_LOGIN } from "../config.js";
import { supabase, isBackendConfigured } from "../data/supabase.js";
import { getSession, signOut } from "../lib/permissions.js";
import { setEditMode } from "../lib/editmode.js";
import { toast } from "../components/toast.js";

function placeholder() {
  return `
    <div class="container page" style="max-inline-size: 46rem;">
      <header class="page-head">
        <p class="overline">${t("admin_link")}</p>
        <h1>${t("admin_heading")}</h1>
        <div class="rule-double" aria-hidden="true"></div>
      </header>
      <div class="notice">
        <h2>${t("admin_inactive")}</h2>
        <p>${t("admin_inactive_body")}</p>
      </div>
      <p style="margin-block-start: 1.5rem;">
        <a class="btn" href="#/">
          <span class="flip-rtl" style="display:inline-flex;" aria-hidden="true">${icons.arrowLeft()}</span>
          ${t("back_home")}
        </a>
      </p>
    </div>`;
}

export function render() {
  if (!REQUIRE_ADMIN_LOGIN) return placeholder();
  return `
    <div class="container page" style="max-inline-size: 42rem;">
      <header class="page-head">
        <p class="overline">${t("admin_link")}</p>
        <h1>${t("admin_login_t")}</h1>
        <div class="rule-double" aria-hidden="true"></div>
      </header>
      <div id="admin-body" aria-live="polite"></div>
    </div>`;
}

export async function mount(el) {
  if (!REQUIRE_ADMIN_LOGIN) return;
  const body = el.querySelector("#admin-body");
  if (!body) return;

  const session = await getSession();
  const email = session?.user?.email;

  if (email) {
    body.innerHTML = `
      <section class="set-section">
        <h2>${esc(t("admin_signed_in", { email }))}</h2>
        <p class="set-desc">${t("admin_lock_note")}</p>
        <button class="btn" id="signout">${t("admin_signout")}</button>
      </section>`;
    body.querySelector("#signout").addEventListener("click", async () => {
      await signOut();
      setEditMode(false);
      toast(t("toast_saved"));
      location.hash = "#/";
    });
    return;
  }

  body.innerHTML = `
    <section class="set-section">
      <h2>${t("admin_login_t")}</h2>
      <p class="set-desc">${t("admin_login_d")}</p>
      ${isBackendConfigured() ? "" : `<div class="notice is-error" role="alert"><p>${t("err_no_backend")}</p></div>`}
      <form id="admin-form" class="set-grid">
        <label class="m-field"><span>${t("f_email")}</span>
          <input type="email" name="email" autocomplete="username" required></label>
        <label class="m-field"><span>${t("f_password")}</span>
          <input type="password" name="password" autocomplete="current-password" required></label>
        <p><button class="btn btn-primary" type="submit">${t("admin_signin")}</button></p>
      </form>
    </section>`;

  body.querySelector("#admin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase) {
      toast(t("err_no_backend"), "error");
      return;
    }
    const fd = new FormData(e.target);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")).trim(),
      password: String(fd.get("password")),
    });
    if (error) {
      toast(t("err_login"), "error");
      return;
    }
    setEditMode(true);
    toast(t("toast_saved"));
    location.hash = "#/";
  });
}
