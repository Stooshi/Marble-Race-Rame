/**
 * Google Analytics 4 (with Google Consent Mode v2) and the Meta Pixel on the website, each loaded
 * only after the player allows its category (./consent.js), and never:
 *   - inside the iPhone and Android apps (website only);
 *   - when its ID is empty (VITE_GA4_ID, VITE_META_PIXEL_ID, set in Vercel): nothing loads at all;
 *   - the Meta Pixel and Google's ad signals for a player whose account says under 13.
 * No personal data is sent: no name, email, user ID or player name; GA gets the page path only.
 *
 * Events (track(name, params)):
 *   sign_up            GA sign_up                Meta CompleteRegistration
 *   first_race         GA first_race             Meta FirstRace (custom)          once per account
 *   race_finished      GA race_finished          Meta RaceFinished (custom)       once per race
 *   shop_view          GA view_item_list         Meta ViewContent
 *   checkout_started   GA begin_checkout         Meta InitiateCheckout            value, currency
 *   purchase           GA purchase               Meta Purchase                    value, currency, order
 *                      (only from a payment the server has confirmed; once per order, and the order
 *                      number is GA's transaction_id and Meta's event ID, so neither counts it twice)
 */
import { allowed, readConsent } from './consent';

export const GA4_ID = (import.meta.env.VITE_GA4_ID ?? '').trim();
export const META_PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID ?? '').trim();
/** Whether there is anything to ask consent for (with no IDs set, the banner isn't shown). */
export const TRACKING_CONFIGURED = Boolean(GA4_ID || META_PIXEL_ID);

const ONCE_KEY = 'marble-tracked';
const state = { ga: false, meta: false, under13: false, consent: null, lastPage: null };

const isApp = () => typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());

function addScript(src) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function gtag() {
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

/** Google's consent signals for the current choice (Consent Mode v2). */
function googleConsent(consent, under13) {
  const ads = consent?.marketing && !under13 ? 'granted' : 'denied';
  return { analytics_storage: consent?.statistics ? 'granted' : 'denied', ad_storage: ads, ad_user_data: ads, ad_personalization: ads };
}

function loadGa(consent, under13) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  gtag('consent', 'update', googleConsent(consent, under13));
  gtag('js', new Date());
  state.lastPage = null; // (its first page view is sent by trackPage)
  gtag('config', GA4_ID, {
    send_page_view: false, // (sent on every page change: the site is one page app)
    allow_google_signals: Boolean(consent.marketing && !under13),
    allow_ad_personalization_signals: Boolean(consent.marketing && !under13),
  });
  addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`);
  state.ga = true;
}

function loadMeta() {
  /* eslint-disable */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
  }(window, document);
  /* eslint-enable */
  window.fbq('init', META_PIXEL_ID); // (no advanced matching: no email or phone ever)
  state.lastPage = null; // (its first page view is sent by trackPage)
  addScript('https://connect.facebook.net/en_US/fbevents.js');
  state.meta = true;
}

/** Removes a site cookie (the trackers' own, when the player withdraws consent). */
function dropCookies(prefixes) {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0].trim();
    if (!prefixes.some((p) => name.startsWith(p))) continue;
    const host = window.location.hostname;
    for (const domain of ['', host, `.${host.replace(/^www\./, '')}`]) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

/**
 * Applies the player's choice: loads what was allowed (once), tells Google about the choice, and
 * when a "yes" becomes a "no", tells Google and Meta and removes their cookies.
 * `user`: the logged-in account (for the under-13 rule), or null.
 */
export function applyConsent(consent = readConsent(), user = null) {
  if (typeof window === 'undefined' || isApp() || !TRACKING_CONFIGURED) return;
  const under13 = user?.age_group === 'under-13';
  state.under13 = under13;
  state.consent = consent;
  if (GA4_ID) {
    if (consent?.statistics && !state.ga) loadGa(consent, under13);
    else if (state.ga) {
      gtag('consent', 'update', googleConsent(consent, under13));
      if (!consent?.statistics) dropCookies(['_ga']);
    }
  }
  if (META_PIXEL_ID) {
    const mayMeta = Boolean(consent?.marketing && !under13);
    if (mayMeta && !state.meta) loadMeta();
    else if (state.meta && !mayMeta) {
      window.fbq('consent', 'revoke');
      dropCookies(['_fbp']);
    } else if (state.meta && mayMeta) window.fbq('consent', 'grant');
  }
}

/** Whether any event would be sent now (so callers can skip extra work). */
export const trackingActive = () => gaOn() || metaOn();

const gaOn = () => state.ga && allowed('statistics', state.consent);
const metaOn = () => state.meta && allowed('marketing', state.consent) && !state.under13;

/** A page change (the site is a one-page app): its path only, never the query (it can hold codes). */
export function trackPage(pathname, title = document.title) {
  if (!(gaOn() || metaOn()) || pathname === state.lastPage) return; // (once per page change)
  state.lastPage = pathname;
  if (gaOn()) gtag('event', 'page_view', { page_location: `${window.location.origin}${pathname}`, page_path: pathname, page_title: title });
  if (metaOn()) window.fbq('track', 'PageView');
}

function once(key) {
  try {
    const seen = JSON.parse(localStorage.getItem(ONCE_KEY) ?? '[]');
    if (seen.includes(key)) return false;
    localStorage.setItem(ONCE_KEY, JSON.stringify([...seen, key].slice(-200)));
  } catch { /* (no storage: may count twice, the order number still dedupes purchases) */ }
  return true;
}

/** Sends an event (see the list above) to whatever the player allowed. `onceKey`: send it only once. */
export function track(name, params = {}, { onceKey = null } = {}) {
  if (typeof window === 'undefined' || isApp() || !(gaOn() || metaOn())) return;
  if (onceKey && !once(onceKey)) return;
  const value = params.value != null ? Number(params.value) : undefined;
  const currency = params.currency ? String(params.currency).toUpperCase() : undefined;
  switch (name) {
    case 'sign_up':
      if (gaOn()) gtag('event', 'sign_up', { method: 'email' });
      if (metaOn()) window.fbq('track', 'CompleteRegistration');
      break;
    case 'first_race':
      if (gaOn()) gtag('event', 'first_race', {});
      if (metaOn()) window.fbq('trackCustom', 'FirstRace');
      break;
    case 'race_finished':
      if (gaOn()) gtag('event', 'race_finished', { friend_room: Boolean(params.friendRoom) });
      if (metaOn()) window.fbq('trackCustom', 'RaceFinished');
      break;
    case 'shop_view':
      if (gaOn()) gtag('event', 'view_item_list', { item_list_name: 'Shop' });
      if (metaOn()) window.fbq('track', 'ViewContent', { content_name: 'Shop' });
      break;
    case 'checkout_started':
      if (gaOn()) gtag('event', 'begin_checkout', { currency, value, items: [{ item_id: params.productId, item_name: params.productName }] });
      if (metaOn()) window.fbq('track', 'InitiateCheckout', { currency, value, content_ids: [params.productId] });
      break;
    case 'purchase':
      if (gaOn()) gtag('event', 'purchase', { transaction_id: params.orderNo, currency, value, items: [{ item_id: params.productId }] });
      if (metaOn()) window.fbq('track', 'Purchase', { currency, value, content_ids: [params.productId] }, { eventID: params.orderNo });
      break;
    default:
  }
}
