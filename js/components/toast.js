// Toasts: small loud messages. Success toasts ("Saved ✓") fade away on
// their own; error toasts are brick-red and stay until dismissed —
// failures are never silent.
import { t } from "../i18n/i18n.js";
import { icons } from "../lib/icons.js";
import { esc } from "../lib/format.js";

function ensureWrap() {
  let wrap = document.getElementById("toasts");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toasts";
    wrap.className = "toasts";
    wrap.setAttribute("aria-live", "polite");
    document.body.appendChild(wrap);
  }
  return wrap;
}

export function toast(message, kind = "success") {
  const wrap = ensureWrap();
  const el = document.createElement("div");
  el.className = `toast toast--${kind}`;
  el.setAttribute("role", kind === "error" ? "alert" : "status");
  el.innerHTML =
    kind === "error"
      ? `<span aria-hidden="true">${icons.alert()}</span><span>${esc(message)}</span>
         <button class="toast-x" aria-label="${esc(t("dismiss"))}">✕</button>`
      : `<span class="toast-check" aria-hidden="true">✓</span><span>${esc(message)}</span>`;
  wrap.appendChild(el);
  if (kind === "error") {
    el.querySelector(".toast-x").addEventListener("click", () => el.remove());
  } else {
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 350);
    }, 2600);
  }
}
