// Per-device preferences, kept in localStorage.
// Anything personal (bookmarks, done ticks, last-read page) lives ONLY here,
// on the student's own device — there are no accounts.
const KEY = "studylibrary:v1";

const defaults = {
  lang: null,          // null → fall back to settings.defaultLang
  readingDark: false,  // warm dark reading mode
  fontScale: 1,        // written-lesson text size multiplier
  bookmarks: [],       // lesson ids
  done: [],            // lesson ids ticked as done
  lastRead: null,      // { semesterSlug, moduleSlug, lessonSlug, page, at }
};

let cache = null;

export function getPrefs() {
  if (cache) return cache;
  try {
    cache = { ...defaults, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    cache = { ...defaults };
  }
  return cache;
}

export function savePrefs() {
  try {
    localStorage.setItem(KEY, JSON.stringify(getPrefs()));
  } catch {
    /* storage full or blocked — the site still works, nothing is saved */
  }
}

export function setPref(key, value) {
  getPrefs()[key] = value;
  savePrefs();
}

// Toggle an id inside a list pref (bookmarks / done). Returns the new state.
export function toggleInList(key, id) {
  const list = getPrefs()[key];
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else list.push(id);
  savePrefs();
  return list.includes(id);
}

export function inList(key, id) {
  return getPrefs()[key].includes(id);
}
