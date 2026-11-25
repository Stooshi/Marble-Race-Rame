import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The live track count, fetched once per build from the server (VITE_API_URL/api/tracks), so the
 * meta descriptions, share previews and pre-rendered pages say "80+ tracks" and never go stale
 * (src/site/trackCount.js rounds it). No server, the dev server or tests: none ("dozens of tracks").
 */
async function liveTracks(apiUrl) {
  const api = String(apiUrl || '').replace(/\/+$/, '');
  if (!/^https:\/\//.test(api)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`${api}/api/tracks`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const tracks = Array.isArray(body?.tracks) ? body.tracks : [];
    // The series the live tracks are in (the Help Centre lists them), in the order they appear.
    return tracks.length ? { count: tracks.length, series: [...new Set(tracks.map((t) => t.series).filter(Boolean))] } : null;
  } catch (e) {
    console.warn(`vite: the live track count couldn't be loaded (${e.message}); the texts say "dozens of tracks"`);
    return null;
  }
}

/** "80+ tracks" for index.html (the same rounding as src/site/trackCount.js). */
const phrase = (n) => (n ? `${n < 10 ? n : `${Math.floor(n / 10) * 10}+`} tracks` : 'dozens of tracks');

/**
 * When this build was made (UTC), shown small in the footer and written into index.html as
 * <meta name="ms-build">, so a phone shows which build it runs, and app-sync.mjs can check the apps
 * got this build's files (Moses, 25 Oct 2026: an Android build that showed an older design).
 */
const BUILD_STAMP = process.env.VITE_BUILD_STAMP || `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const live = command === 'build' && mode !== 'test' && !Number(process.env.VITE_TRACK_COUNT)
    ? await liveTracks(env.VITE_API_URL)
    : null;
  const count = command === 'build' && mode !== 'test' ? Number(process.env.VITE_TRACK_COUNT) || live?.count || null : null;
  const series = process.env.VITE_TRACK_SERIES || (live?.series ?? []).join('|');
  if (count) process.env.VITE_TRACK_COUNT = String(count); // (the pre-render's own build reuses them)
  if (series) process.env.VITE_TRACK_SERIES = series;
  return {
    plugins: [
      react(),
      { name: 'track-count-in-html', transformIndexHtml: (html) => html.replace(/__TRACKS_PHRASE__/g, phrase(count)) },
      { name: 'build-stamp', transformIndexHtml: (html) => html.replace('</head>', `    <meta name="ms-build" content="${BUILD_STAMP}" />\n  </head>`) },
    ],
    define: {
      'import.meta.env.VITE_TRACK_COUNT': JSON.stringify(count ? String(count) : ''),
      'import.meta.env.VITE_TRACK_SERIES': JSON.stringify(count ? series : ''),
      'import.meta.env.VITE_BUILD_STAMP': JSON.stringify(command === 'build' ? BUILD_STAMP : 'dev'),
    },
    server: { port: 5173 },
    // The 3D scene (Three.js) is one lazily loaded chunk of about 140 KB gzipped.
    build: { chunkSizeWarningLimit: 700 },
    test: { environment: 'node' },
  };
});
