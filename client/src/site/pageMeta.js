/**
 * Every page's title, description, share picture and indexing, in one place: used by the site as
 * you move around (usePageMeta in App.jsx) and by the build's pre-rendering (scripts/prerender.mjs),
 * so search engines and link previews (WhatsApp, Facebook, X) get the same as players.
 */
import { buildFaq } from './help/faq';
import { canonicalUrl, SITE_URL } from './canonical';
import { tracksPhrase } from './trackCount';

export const SITE_NAME = 'Marble Spins';
export const SHARE_IMAGE = '/share/marble-spins-1200x630.png';
// (The track count is the live one at build time, rounded down: "80+ tracks", src/site/trackCount.js.)
const DEFAULT_DESCRIPTION = `Don't just watch marble races, race them. Live 20-marble races on ${tracksPhrase()} with real physics, free in your browser. Race your friends with a code.`;

const STATIC = {
  '/': { title: 'Marble Spins: live marble races with your friends', description: DEFAULT_DESCRIPTION },
  '/shop': { title: 'Shop: Schoolyard Classics marbles', description: 'Collect the Schoolyard Classics: 10 classic marbles in 5 shades, each with its own Marble ID and certificate. Looks only, never speed.' },
  '/collection': { title: 'Shop: Schoolyard Classics marbles', description: 'Collect the Schoolyard Classics: 10 classic marbles in 5 shades, each with its own Marble ID and certificate. Looks only, never speed.', canonical: '/shop' },
  '/scores': { title: 'Scoreboards', description: 'This season\'s top racers, ranked by coins earned in races. Money can\'t buy a place on the board.' },
  '/help': { title: 'Help Centre', description: 'Answers about races, coins, marbles, buying coins, refunds, friend rooms and your account, and a way to contact Marble Spins support.' },
  '/legal': { title: 'Terms, privacy and contact', description: 'Marble Spins terms of use, terms of sale, privacy policy and contact details.' },
  '/cookies': { title: 'Cookie policy', description: 'What Marble Spins stores in your browser: necessary storage, and statistics and marketing cookies only with your consent.' },
  '/tracks': { title: 'All tracks', description: 'Every Marble Spins track: World Tour landmarks, Grand Prix circuits, Coasters, Canyons, Pinball tables and more. Pick one and race it.' },
  '/signup': { title: 'Save your marble', description: 'Make a free Marble Spins account to keep your coins, marbles and progress on every device.' },
  '/play/friends': { title: 'Race with friends', description: 'Make a room, share its code and race your friends on the track you pick.' },
};

// Pages for players, not for search results (their own data, one-time links, the game itself).
const NOINDEX = [/^\/(home|lobby|bag|purchases|settings|checkout|unsubscribe|forgot-password|reset-password|dashboard)$/, /^\/(race|results|r|profile|certificate|preview|admin)\//, /^\/play\/(track|shooter|start)$/, /^\/preview$/, /^\/admin$/];

let faqCache = null;
const faqQuestions = () => {
  if (!faqCache) faqCache = buildFaq().flatMap((s) => s.questions);
  return faqCache;
};

/** The plain text of an answer, for a description (placeholder brackets off). */
export const answerText = (q) => q.text.replace(/\[[^\]]*\]/g, '').replace(/\s+([.,;:])/g, '$1').replace(/\s+/g, ' ').trim();

const clip = (text, n = 158) => (text.length <= n ? text : `${text.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

/** { title, description, canonical, image, noindex } for a path. `track`: a track's data on /tracks/:slug. */
export function metaFor(pathname, { track = null } = {}) {
  const path = `/${String(pathname || '/').split(/[?#]/)[0].replace(/^\/+/, '')}`.replace(/(.)\/+$/, '$1');
  const noindex = NOINDEX.some((re) => re.test(path));
  let m = STATIC[path];
  const help = /^\/help\/([a-z0-9-]+)$/.exec(path);
  if (help) {
    const q = faqQuestions().find((x) => x.slug === help[1]);
    if (q) m = { title: `${q.q} · Help`, description: clip(answerText(q)) };
  }
  const trackPage = /^\/tracks\/([a-z0-9-]+)$/.exec(path);
  if (trackPage) {
    m = track
      ? { title: `${track.name}: race it`, description: clip(`${track.series ? `${track.series} · ` : ''}${track.description ?? ''}`), image: `/share/tracks/${track.slug}.jpg` }
      : { title: 'Track', description: DEFAULT_DESCRIPTION };
  }
  m = m ?? { title: SITE_NAME, description: DEFAULT_DESCRIPTION };
  const title = m.title === SITE_NAME || m.title.startsWith(`${SITE_NAME}:`) ? m.title : `${m.title} · ${SITE_NAME}`;
  return { title, description: m.description, canonical: canonicalUrl(m.canonical ?? path), image: `${SITE_URL}${m.image ?? SHARE_IMAGE}`, noindex };
}

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

/** Puts a page's meta into the document head (the canonical link is kept by canonical.js). */
export function applyMeta(m) {
  if (typeof document === 'undefined') return;
  document.title = m.title;
  setMeta('name', 'description', m.description);
  setMeta('property', 'og:title', m.title);
  setMeta('property', 'og:description', m.description);
  setMeta('property', 'og:image', m.image);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', m.title);
  setMeta('name', 'twitter:description', m.description);
  setMeta('name', 'twitter:image', m.image);
  setMeta('name', 'robots', m.noindex ? 'noindex, follow' : 'index, follow');
}
