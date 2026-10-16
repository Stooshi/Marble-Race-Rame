/**
 * Website build, step 2 (after `vite build`): the public pages rendered to plain HTML, so Google and
 * link previews (WhatsApp, Facebook, X) read them without running the game, plus sitemap.xml.
 *
 *   /, /shop, /scores, /help, /help/<question>, /legal, /cookies, /tracks, /tracks/<track>
 *
 * Each page is written as dist/<path>.html (Vercel serves it at /<path>: cleanUrls in vercel.json)
 * with its own title, description, canonical link, share picture and, for /help, the FAQ data.
 * The browser then draws the real page over it. The track list comes from the live server
 * (VITE_API_URL/api/tracks); if that can't be reached the build still works, without track pages.
 *
 * Not used for the phone apps (scripts/app-sync.mjs runs `vite build` only).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssrOut = join(root, 'node_modules', '.prerender');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function liveTracks() {
  const api = (process.env.VITE_API_URL || '').replace(/\/+$/, '');
  if (!api) return [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`${api}/api/tracks`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return Array.isArray(body?.tracks) ? body.tracks : [];
  } catch (e) {
    console.warn(`prerender: the track list couldn't be loaded (${e.message}); no track pages this build`);
    return [];
  }
}

// The pre-rendered copy (wrapped in [data-ms-prerender]) shows only while the page's code loads;
// it is hidden at once when it isn't the page the visitor asked for, when they're logged in (they
// get their own pages), or inside the apps. Only the copy is hidden, never the app that replaces it.
const GUARD = (path) => `<script>(function(){try{var p=location.pathname.replace(/\\/+$/,'')||'/';`
  + `if(p!==${JSON.stringify(path)}||localStorage.getItem('marble-race-token')||window.Capacitor)`
  + `document.documentElement.setAttribute('data-ms-shell','1')}catch(e){}})()</script>`
  + `<style>html[data-ms-shell] [data-ms-prerender]{display:none!important}</style>`;

function headFor(m, extra = '') {
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${esc(m.canonical)}" />`,
    `<meta property="og:url" content="${esc(m.canonical)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:image" content="${esc(m.image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${esc(m.image)}" />`,
    `<meta name="robots" content="${m.noindex ? 'noindex, follow' : 'index, follow'}" />`,
    extra,
  ].filter(Boolean).join('\n    ');
}

/** The built index.html with its own head (the generic title/description/og lines replaced). */
function page(template, m, html, path, extra) {
  const cleaned = template
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace(/<link rel="canonical"[^>]*>\s*/, '')
    .replace(/<meta (property|name)="(og|twitter):[^"]*"[^>]*>\s*/g, '')
    .replace(/<meta name="robots"[^>]*>\s*/, '');
  return cleaned
    .replace('</head>', () => `    ${headFor(m, extra)}\n    ${GUARD(path)}\n  </head>`)
    // (functions, so a "$" in the page, e.g. a price, is never read as a replacement pattern)
    .replace('<div id="root"></div>', () => `<div id="root"><div data-ms-prerender style="display:contents">${html}</div></div>`);
}

async function main() {
  rmSync(ssrOut, { recursive: true, force: true });
  await build({
    root,
    logLevel: 'warn',
    build: { ssr: 'src/prerender/entry.jsx', outDir: ssrOut, emptyOutDir: true, rollupOptions: { output: { format: 'es', entryFileNames: 'entry.mjs' } } },
    ssr: { noExternal: true },
  });
  const { render, metaFor, buildFaq, faqStructuredData, organizationStructuredData, socialLinks, SITE_URL } = await import(pathToFileURL(join(ssrOut, 'entry.mjs')).href);

  const template = readFileSync(join(dist, 'index.html'), 'utf8');
  writeFileSync(join(dist, 'app-shell.html'), template); // (the plain page, for every other address)
  const tracks = await liveTracks();
  const data = { tracks: { tracks } };
  const sections = buildFaq({ tracks });
  const faq = sections.flatMap((s) => s.questions);
  const routes = ['/', '/shop', '/scores', '/help', '/legal', '/cookies', '/tracks',
    ...faq.map((q) => `/help/${q.slug}`), ...tracks.map((t) => `/tracks/${t.slug}`)];

  const sitemap = [];
  for (const path of routes) {
    const track = path.startsWith('/tracks/') ? tracks.find((t) => `/tracks/${t.slug}` === path) : null;
    const m = metaFor(path, { track });
    // A track without its own share picture (public/share/tracks/<slug>.jpg) uses its banner.
    if (track && !existsSync(join(dist, 'share', 'tracks', `${track.slug}.jpg`))) m.image = m.image.replace(`/share/tracks/${track.slug}.jpg`, `/tracks/${track.slug}@2x.webp`);
    let html;
    try {
      html = render(path, data);
    } catch (e) {
      console.warn(`prerender: ${path} couldn't be rendered (${e.message}); it gets the plain page`);
      html = '';
    }
    const ld = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
    // Structured data: the FAQ on /help; who runs Marble Spins and its social profiles (sameAs) on the landing page.
    const extra = path === '/help' ? ld(faqStructuredData(sections, metaFor('/help').canonical))
      : path === '/' ? ld(organizationStructuredData(SITE_URL, socialLinks)) : '';
    const file = path === '/' ? join(dist, 'index.html') : join(dist, `${path.slice(1)}.html`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, page(template, m, html, path, extra));
    if (!m.noindex) sitemap.push(m.canonical);
  }
  writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    sitemap.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`);
  rmSync(ssrOut, { recursive: true, force: true });
  console.log(`prerender: ${routes.length} pages, ${sitemap.length} in the sitemap (${tracks.length} tracks)`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
