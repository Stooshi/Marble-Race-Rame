// Serves `vercel build` output (.vercel/output) following its config.json the way Vercel's edge
// does for a static site: routes before `handle: filesystem` (redirects, headers), the filesystem
// (with `overrides`: clean URLs), then the rewrite routes (with `check`: the destination must exist,
// else the error phase: its 404 page (dist/404.html) with HTTP 404, or 404 NOT_FOUND without one).
// For checking routing before a push (docs/05-runbook.md): `npx vercel build --prod`, then
//   node scripts/serve-vercel-output.mjs . 4300   (and open http://localhost:4300/any/route)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const out = path.join(process.argv[2], '.vercel', 'output');
const port = Number(process.argv[3] || 4300);
const config = JSON.parse(fs.readFileSync(path.join(out, 'config.json'), 'utf8'));
const staticDir = path.join(out, 'static');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.xml': 'application/xml', '.txt': 'text/plain', '.glb': 'model/gltf-binary' };

// URL path -> file (overrides move "help.html" to "/help").
const files = new Map();
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    const rel = path.relative(staticDir, p).split(path.sep).join('/');
    const o = config.overrides?.[rel];
    files.set(`/${o?.path ?? rel}`, { file: p, type: o?.contentType ?? types[path.extname(p)] ?? 'application/octet-stream' });
  }
};
walk(staticDir);
const lookup = (p) => files.get(p.endsWith('/') ? `${p}index` : p) ?? files.get(p.replace(/\/$/, '') || '/index');

const subst = (s, m) => s.replace(/\$(\d+)/g, (_, i) => m[Number(i)] ?? '');

function route(urlPath) {
  const headers = {};
  let p = urlPath;
  let phase = 'pre';
  for (const r of config.routes) {
    if (r.handle) {
      phase = r.handle;
      if (phase === 'filesystem') { const hit = lookup(p); if (hit) return { status: 200, hit, headers }; }
      if (phase === 'error') {
        // The error phase: Vercel's own 404 route (e.g. dest "/404", the site's 404.html), still HTTP 404.
        const er = config.routes.slice(config.routes.indexOf(r) + 1).find((x) => x.status === 404 && x.dest && new RegExp(x.src).test(urlPath));
        const page = er && lookup(er.dest);
        return page ? { status: 404, hit: page, headers } : { status: 404, headers };
      }
      continue;
    }
    const m = new RegExp(r.src).exec(p);
    if (!m) continue;
    if (r.headers) for (const [k, v] of Object.entries(r.headers)) headers[k] = subst(v, m);
    if (r.status && r.status >= 300 && r.status < 400) return { status: r.status, headers };
    if (r.dest) {
      p = subst(r.dest, m).split('?')[0];
      if (r.check) { const hit = lookup(p); if (hit) return { status: 200, hit, headers }; continue; }
    }
    if (!r.continue && !r.dest) break;
  }
  const hit = lookup(p);
  return hit ? { status: 200, hit, headers } : { status: 404, headers };
}

http.createServer((req, res) => {
  const r = route(decodeURIComponent(req.url.split('?')[0]));
  if (r.status === 404 && r.hit) { res.writeHead(404, { ...r.headers, 'content-type': r.hit.type }); fs.createReadStream(r.hit.file).pipe(res); return; }
  if (r.status === 404) { res.writeHead(404, { 'content-type': 'text/plain', 'x-vercel-error': 'NOT_FOUND' }); res.end('404: NOT_FOUND'); return; }
  if (r.status >= 300) { res.writeHead(r.status, r.headers); res.end(); return; }
  res.writeHead(200, { ...r.headers, 'content-type': r.hit.type });
  fs.createReadStream(r.hit.file).pipe(res);
}).listen(port, () => console.log(`serving ${out} on :${port}`));
