// Tiny hash router. URLs look like:
//
//   #/                      home
//   #/s/s5                  semester
//   #/s/s5/module-1        module
//   #/s/s5/module-1/intro-databases   lesson
//   #/search?q=databases    search
//   #/about                 about
//   #/manage-bxpngexc                 admin (inactive placeholder)
//
// Hash URLs keep every page shareable with zero server configuration:
// the whole site is static files, and the part after # never hits the server.
export function initRouter(onRoute) {
  function current() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const qi = raw.indexOf("?");
    const path = qi >= 0 ? raw.slice(0, qi) : raw;
    const query = qi >= 0 ? raw.slice(qi + 1) : "";
    return {
      segments: path.split("/").filter(Boolean),
      params: Object.fromEntries(new URLSearchParams(query)),
    };
  }

  function handle() {
    onRoute(current());
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", handle);
  handle();

  // Lets app.js re-render the current route (e.g. after a language switch).
  return { refresh: handle, current };
}
