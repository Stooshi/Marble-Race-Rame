/**
 * After a new version of the site is published, a page still running the old
 * version may ask for code files that no longer exist (each version names its
 * files afresh), and the code fails to load ("…is not a valid JavaScript MIME
 * type", "Failed to fetch dynamically imported module"). Reloading the page
 * picks up the new version. It reloads at most once a minute (remembered for
 * this tab), so a file that is genuinely broken shows its error instead of
 * reloading forever.
 */
const KEY = 'marble-race:reloaded-for-new-code';
const GUARD_MS = 60_000;

/** Whether an error is a code file that failed to load (rather than a bug in it). */
export function isStaleCodeError(error) {
  const text = `${error?.name ?? ''} ${error?.message ?? error ?? ''}`;
  return /dynamically imported module|Importing a module script failed|not a valid JavaScript MIME type|ChunkLoadError|Loading (CSS )?chunk|Unable to preload CSS/i.test(text);
}

/** Reloads the page once to pick up the new version. Returns false (and does nothing) if it already did so in the last minute. */
export function reloadOnceForNewCode(storage = globalThis.sessionStorage, reload = () => globalThis.location.reload(), now = Date.now()) {
  try {
    const last = Number(storage.getItem(KEY));
    if (last && now - last < GUARD_MS) return false;
    storage.setItem(KEY, String(now));
  } catch {
    return false; // (no storage: never risk a loop)
  }
  reload();
  return true;
}

/** import() that reloads the page once if the file is gone after an update; otherwise the error stands. */
export function importOrReload(load) {
  return load().catch((error) => {
    if (isStaleCodeError(error) && reloadOnceForNewCode()) return new Promise(() => {}); // (the page is reloading)
    throw error;
  });
}
