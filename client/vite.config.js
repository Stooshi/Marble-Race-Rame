import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The live track count, fetched once per build from the server (VITE_API_URL/api/tracks), so the
 * meta descriptions, share previews and pre-rendered pages say "80+ tracks" and never go stale
 * (src/site/trackCount.js rounds it). No server, the dev server or tests: none ("dozens of tracks").
 */
async function liveTrackCount(apiUrl) {
  const api = String(apiUrl || '').replace(/\/+$/, '');
  if (!/^https:\/\//.test(api)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`${api}/api/tracks`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return Array.isArray(body?.tracks) && body.tracks.length ? body.tracks.length : null;
  } catch (e) {
    console.warn(`vite: the live track count couldn't be loaded (${e.message}); the texts say "dozens of tracks"`);
    return null;
  }
}

/** "80+ tracks" for index.html (the same rounding as src/site/trackCount.js). */
const phrase = (n) => (n ? `${n < 10 ? n : `${Math.floor(n / 10) * 10}+`} tracks` : 'dozens of tracks');

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const count = command === 'build' && mode !== 'test'
    ? Number(process.env.VITE_TRACK_COUNT) || await liveTrackCount(env.VITE_API_URL)
    : null;
  if (count) process.env.VITE_TRACK_COUNT = String(count); // (the pre-render's own build reuses it)
  return {
    plugins: [
      react(),
      { name: 'track-count-in-html', transformIndexHtml: (html) => html.replace(/__TRACKS_PHRASE__/g, phrase(count)) },
    ],
    define: { 'import.meta.env.VITE_TRACK_COUNT': JSON.stringify(count ? String(count) : '') },
    server: { port: 5173 },
    // The 3D scene (Three.js) is one lazily loaded chunk of about 140 KB gzipped.
    build: { chunkSizeWarningLimit: 700 },
    test: { environment: 'node' },
  };
});
