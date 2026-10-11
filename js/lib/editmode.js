// Edit mode: a per-tab switch kept in sessionStorage (it resets when
// the tab closes — editing is a deliberate act, not a default).
// Pages read isEditMode() synchronously to decide whether to render
// edit controls. After any successful write, call notifyChange(): the
// app re-renders the header + current route from the fresh cache and
// flashes the "Saved" indicator in the edit bar.
import { t } from "../i18n/i18n.js";
import { toast } from "../components/toast.js";

const KEY = "sl_editmode";

export function isEditMode() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setEditMode(on) {
  try {
    if (on) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch { /* private mode — editing just won't stick */ }
  window.dispatchEvent(new CustomEvent("editchange"));
}

export function notifyChange() {
  window.dispatchEvent(new CustomEvent("datachange"));
  const el = document.getElementById("edit-saved");
  if (el) {
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }
}

// Inline rename: any element with [data-rename="<table>"] + data-id
// becomes a text input on click (only rendered in edit mode).
// save(table, id, newTitle) must return a promise.
export function bindInlineRename(root, save) {
  root.querySelectorAll("[data-rename]").forEach((el) => {
    el.classList.add("renameable");
    el.title = t("rename_hint");
    el.addEventListener("click", (e) => {
      if (el.querySelector("input")) return;
      e.preventDefault();
      e.stopPropagation();
      const old = el.textContent.trim();
      el.innerHTML = "";
      const input = document.createElement("input");
      input.type = "text";
      input.value = old;
      input.className = "input rename-input";
      input.setAttribute("aria-label", t("rename_hint"));
      el.appendChild(input);
      input.focus();
      input.select();
      let done = false;
      const commit = async (ok) => {
        if (done) return;
        done = true;
        const v = input.value.trim();
        el.textContent = v || old;
        if (ok && v && v !== old) {
          try {
            await save(el.dataset.rename, el.dataset.id, v);
            notifyChange();
          } catch (err) {
            el.textContent = old;
            toast(err.message, "error");
          }
        }
      };
      input.addEventListener("keydown", (ev) => {
        ev.stopPropagation();
        if (ev.key === "Enter") commit(true);
        else if (ev.key === "Escape") commit(false);
      });
      input.addEventListener("blur", () => commit(true));
    });
  });
}
