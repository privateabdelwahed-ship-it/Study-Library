// Site footer: a warm line, the colophon, and the Admin link.
//
// The Admin link is deliberately shown ONLY to someone who can edit
// (the signed-in admin once the lock is on). Visitors never see it,
// and the sign-in page lives at an unguessable URL — reachable only
// by typing #/manage-bxpngexc directly. Bookmark it; don't share it.
import { t } from "../i18n/i18n.js";
import { getSite } from "../data/store.js";
import { esc } from "../lib/format.js";
import { canEdit } from "../lib/permissions.js";

export async function renderFooter() {
  const mount = document.getElementById("site-footer");
  const showAdmin = await canEdit();
  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-inner">
        <span><strong>${esc(getSite().name)}</strong> — ${t("footer_tag")}</span>
        <span class="colophon">${t("colophon")}</span>
        ${showAdmin ? `<nav aria-label="Footer"><a href="#/manage-bxpngexc">${t("admin_link")}</a></nav>` : ""}
      </div>
    </footer>`;
}
