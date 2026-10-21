/**
 * The /marbles/* route. The hub is switched on in src/shared/marblesHub.json ("enabled"); while it is
 * off every /marbles address is the site's 404 page and the hub's code is never loaded. A preview
 * build (VITE_MARBLES_HUB=preview) shows it anyway, kept out of search results; with
 * VITE_MARBLES_HUB=drafts it also shows the review drafts in content/marbles-drafts/ (never in a
 * normal build: those files are only bundled in that mode).
 *
 * The hub's code is its own chunk. On a hub address it is loaded before the app first draws
 * (main.jsx → preloadHub), so the pre-rendered page is replaced by the same page, not a spinner.
 */
import { lazy, Suspense } from 'react';
import hubSwitch from '../shared/marblesHub.json';

const MODE = import.meta.env.VITE_MARBLES_HUB || '';
export const HUB_PREVIEW = MODE === 'preview' || MODE === 'drafts';
export const hubOpen = () => hubSwitch.enabled === true || HUB_PREVIEW;
export const isHubPath = (pathname) => /^\/marbles(\/|$)/.test(pathname || '');

const load = () => import('./HubPages');
const Lazy = lazy(load);
let Loaded = null; // the pages, once loaded (or given by the pre-rendering)
let drafts = null; // the review drafts (VITE_MARBLES_HUB=drafts only)
// (A condition the build can decide: in any other mode this is {} and no draft is bundled.)
const DRAFT_FILES = import.meta.env.VITE_MARBLES_HUB === 'drafts'
  ? import.meta.glob('../../../content/marbles-drafts/*.md', { query: '?raw', import: 'default' })
  : {};

/** The pre-rendering (src/prerender/entry.jsx) hands over the pages it imported itself. */
export function registerHubPages(component) { Loaded = component; }

async function loadDrafts() {
  if (MODE !== 'drafts') return null;
  const [{ readArticles, ARTICLES }, files] = await Promise.all([
    import('./content'),
    Promise.all(Object.entries(DRAFT_FILES).map(async ([file, get]) => [file, await get()])),
  ]);
  return [...ARTICLES, ...readArticles(Object.fromEntries(files.filter(([f]) => !/README\.md$/.test(f))), { drafts: true })];
}

/**
 * Loads the hub's code (and drafts in a drafts preview) before the first draw on a hub address:
 * a promise, or null anywhere else (nothing to wait for).
 */
export function preloadHub(pathname) {
  if (!hubOpen() || !isHubPath(pathname)) return null;
  return Promise.all([load(), loadDrafts()])
    .then(([m, d]) => { Loaded = m.default; drafts = d; })
    .catch(() => { /* drawn with the lazy loader, then */ });
}

export default function MarblesHubRoute({ NotFound }) {
  if (!hubOpen()) return <NotFound />;
  const extra = drafts ? { articles: drafts } : {};
  if (Loaded) return <Loaded NotFound={NotFound} preview={HUB_PREVIEW} {...extra} />;
  return <Suspense fallback={null}><Lazy NotFound={NotFound} preview={HUB_PREVIEW} {...extra} /></Suspense>;
}
