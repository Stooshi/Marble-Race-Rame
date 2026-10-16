/**
 * Cookie consent on the website (EU rules): the player's choice per category, kept in this
 * browser and (when logged in) logged to their account (see ConsentManager.jsx).
 *
 *   necessary    always on: login, settings, this choice itself (no consent needed)
 *   statistics   Google Analytics 4, only after a "yes"
 *   marketing    the Meta Pixel (and Google's ad signals), only after a "yes"
 *
 * Nothing is pre-ticked; until the player chooses, nothing but necessary storage is used.
 * The phone apps never show the banner and never load any of it (see ./tracking.js).
 * Bump CONSENT_VERSION when what a category covers changes: everyone is asked again.
 */
export const CONSENT_VERSION = 1;
export const CONSENT_KEY = 'marble-consent';
export const CATEGORIES = ['statistics', 'marketing'];

const listeners = new Set();

/** The saved choice { v, statistics, marketing, at } for this banner version, or null (not asked yet). */
export function readConsent(storage = globalThis.localStorage) {
  try {
    const c = JSON.parse(storage?.getItem(CONSENT_KEY) ?? 'null');
    if (!c || c.v !== CONSENT_VERSION) return null;
    return { v: c.v, statistics: c.statistics === true, marketing: c.marketing === true, at: c.at };
  } catch {
    return null;
  }
}

/** Saves a choice ({ statistics, marketing }) and tells everyone listening. → the saved choice */
export function saveConsent({ statistics = false, marketing = false }, storage = globalThis.localStorage, now = new Date()) {
  const c = { v: CONSENT_VERSION, statistics: statistics === true, marketing: marketing === true, at: now.toISOString() };
  try { storage?.setItem(CONSENT_KEY, JSON.stringify(c)); } catch { /* (private mode: kept for this visit only) */ }
  for (const fn of listeners) fn(c);
  return c;
}

/** Whether a category may be used now. Necessary storage always may. */
export function allowed(category, consent = readConsent()) {
  if (category === 'necessary') return true;
  return Boolean(consent?.[category]);
}

/** Calls fn(choice) whenever the player decides or changes their mind. → unsubscribe */
export function onConsent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// "Cookie settings" (the footer link, the /cookies page) opens the settings again.
const openers = new Set();
export function openCookieSettings() { for (const fn of openers) fn(); }
export function onOpenCookieSettings(fn) { openers.add(fn); return () => openers.delete(fn); }

/**
 * What the site stores in the browser, by category, for the /cookies page (and its tests).
 * name, where (cookie | local | session), who sets it, why, how long.
 */
export const STORAGE_LIST = [
  { category: 'necessary', name: 'marble-race-token', where: 'local storage', by: 'Marble Spins', why: 'Keeps you logged in (your login token).', lasts: 'Until you log out' },
  { category: 'necessary', name: 'marble-consent', where: 'local storage', by: 'Marble Spins', why: 'Remembers your cookie choices.', lasts: 'Until you change them or clear your browser' },
  { category: 'necessary', name: 'marble-sound', where: 'local storage', by: 'Marble Spins', why: 'Your sound levels and mute setting.', lasts: 'Until you clear your browser' },
  { category: 'necessary', name: 'marble-race-fps', where: 'local storage', by: 'Marble Spins', why: 'Whether the frame counter is shown (only if you turn it on).', lasts: 'Until you clear your browser' },
  { category: 'necessary', name: 'marble-consent-logged', where: 'local storage', by: 'Marble Spins', why: 'Which of your accounts already has your cookie choice on record.', lasts: 'Until you clear your browser' },
  { category: 'necessary', name: 'marble-tracked', where: 'local storage', by: 'Marble Spins', why: 'Makes sure a purchase or a first race is counted only once (only with statistics or marketing allowed).', lasts: 'Until you clear your browser' },
  { category: 'necessary', name: 'marble-room-sent:…', where: 'session storage', by: 'Marble Spins', why: 'Takes you from a friend room to its race only once.', lasts: 'Until you close the tab' },
  { category: 'necessary', name: 'marble-race:reloaded-for-new-code', where: 'session storage', by: 'Marble Spins', why: 'Reloads the page once when a new version of the site goes live.', lasts: 'Until you close the tab' },
  { category: 'necessary', name: 'marble-admin-session', where: 'session storage', by: 'Marble Spins', why: 'The back office login (staff only).', lasts: 'Until you close the tab, 30 minutes idle' },
  { category: 'necessary', name: '__stripe_mid, __stripe_sid', where: 'cookies', by: 'Stripe (on its payment page)', why: 'Fraud prevention when you pay for coins on Stripe\'s page.', lasts: '1 year / 30 minutes' },
  { category: 'statistics', name: '_ga, _ga_<id>', where: 'cookies', by: 'Google Analytics 4', why: 'Counts visits and which pages and features are used, without your name or email.', lasts: 'Up to 2 years' },
  { category: 'marketing', name: '_fbp', where: 'cookies', by: 'Meta (Facebook, Instagram)', why: 'Measures whether our ads on Facebook and Instagram lead to sign-ups and purchases.', lasts: '3 months' },
  { category: 'marketing', name: 'Google ad signals', where: 'cookies', by: 'Google', why: 'Lets Google Analytics measure our Google ads (only with marketing allowed).', lasts: 'Up to 2 years' },
];
