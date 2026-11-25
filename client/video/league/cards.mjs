// The Demo league's cards between races (Moses, 25 Nov 2026): the standings after race n and the next
// race's track, as 1920×1080 PNGs in the broadcast's look (recorder.html: navy, yellow, Lilita One).
// Points per place 10-8-6-5-4-3-2-1 (places 1 to 8); ties in points go to the better last result.
//   node video/league/cards.mjs <outDir> <race file> [<race file> …] [--next <track slug> <track name> <series>]
// Race files are the league copies in dev/.tracks (video/league/names.mjs). Looks only: nothing here
// touches a race.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const CLIENT = resolve(here, '..', '..');
export const POINTS = [10, 8, 6, 5, 4, 3, 2, 1];

/** Standings after the given races: [{ name, pts, last, prev }] best first. */
export function standings(races, racers) {
  const pts = racers.map(() => 0);
  const lastPlace = racers.map(() => 99);
  let before = null;
  races.forEach((r, k) => {
    if (k > 0 && k === races.length - 1) before = order(pts, lastPlace);
    r.results.forEach((x, place) => {
      const lane = r.entries[x.index].lane;
      pts[lane] += POINTS[place] ?? 0;
      lastPlace[lane] = place;
    });
  });
  const now = order(pts, lastPlace);
  return now.map((lane, i) => ({ lane, name: racers[lane], pts: pts[lane], last: lastPlace[lane] + 1, pos: i + 1, prev: before ? before.indexOf(lane) + 1 : null }));
}
function order(pts, lastPlace) {
  return pts.map((_, i) => i).sort((a, b) => pts[b] - pts[a] || lastPlace[a] - lastPlace[b] || a - b);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const FONT = join(CLIENT, 'node_modules', '@fontsource', 'lilita-one', 'files', 'lilita-one-latin-400-normal.woff2');
const css = `
@font-face { font-family: 'Lilita One'; src: url('file://${FONT}') format('woff2'); }
:root { --navy: #0E1320; --yellow: #FFD21F; --orange: #FF7A1A; --text: #F2F4F8; }
html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; font-family: 'Lilita One', sans-serif; color: var(--text);
  background: radial-gradient(ellipse at 30% 20%, #24305a 0%, var(--navy) 62%); }
.demo { position: absolute; right: 44px; top: 36px; font-size: 26px; letter-spacing: .12em; padding: 6px 16px; border: 3px solid var(--yellow); color: var(--yellow); border-radius: 10px; opacity: .9; }
`;

function standingsHtml({ title, sub, rows }) {
  const half = Math.ceil(rows.length / 2);
  const col = (rs) => `<div class="col">${rs.map((r) => {
    const move = r.prev == null ? '' : r.prev > r.pos ? `<span class="up">▲${r.prev - r.pos}</span>` : r.prev < r.pos ? `<span class="dn">▼${r.pos - r.prev}</span>` : '<span class="eq">–</span>';
    return `<div class="row${r.pos <= 3 ? ' top' : ''}"><span class="p">${r.pos}</span><span class="n">${esc(r.name)}</span><span class="m">${move}</span><span class="pts">${r.pts}</span></div>`;
  }).join('')}</div>`;
  return `<!doctype html><meta charset="utf-8"><style>${css}
h1 { position: absolute; left: 120px; top: 70px; margin: 0; font-weight: 400; font-size: 92px; color: var(--yellow); letter-spacing: .03em; }
.sub { position: absolute; left: 124px; top: 182px; font-size: 38px; color: var(--orange); letter-spacing: .04em; }
.grid { position: absolute; left: 120px; right: 120px; top: 262px; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; }
.col { display: flex; flex-direction: column; border-top: 4px solid var(--yellow); }
.row { display: grid; grid-template-columns: 70px 1fr 90px 90px; align-items: center; height: 70px; font-size: 40px; font-variant-numeric: tabular-nums; border-bottom: 2px solid rgba(242,244,248,.1); }
.row .p { color: var(--orange); } .row.top .p, .row.top .n { color: var(--yellow); }
.row .pts { text-align: right; } .row .m { text-align: center; font-size: 26px; }
.up { color: #57E389; } .dn { color: #FF6B6B; } .eq { color: rgba(242,244,248,.45); }
.hd { height: 44px; font-size: 24px; color: var(--orange); letter-spacing: .1em; border-bottom: none; }
</style><div class="demo">DEMO LEAGUE</div><h1>${esc(title)}</h1><div class="sub">${esc(sub)}</div>
<div class="grid">${col(rows.slice(0, half))}${col(rows.slice(half))}</div>`;
}

function nextHtml({ kicker, name, series, image }) {
  return `<!doctype html><meta charset="utf-8"><style>${css}
.img { position: absolute; inset: 0; background: url('file://${image}') center/cover; filter: saturate(1.1); }
.fade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(14,19,32,.94) 0%, rgba(14,19,32,.72) 42%, rgba(14,19,32,0) 75%); }
.box { position: absolute; left: 120px; bottom: 150px; padding: 30px 48px 34px; border-left: 18px solid var(--yellow); background: rgba(14,19,32,.55); }
.k { font-size: 40px; color: var(--orange); letter-spacing: .1em; }
.t { font-size: 108px; line-height: 1.02; margin-top: 8px; max-width: 1100px; }
.s { font-size: 40px; color: var(--yellow); margin-top: 14px; letter-spacing: .04em; }
</style><div class="img"></div><div class="fade"></div><div class="demo">DEMO LEAGUE</div>
<div class="box"><div class="k">${esc(kicker)}</div><div class="t">${esc(name)}</div><div class="s">${esc(series)}</div></div>`;
}

async function shoot(browser, html, file) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const tmp = `${file}.html`;
  writeFileSync(tmp, html);
  await page.goto(`file://${tmp}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  await page.close();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const out = resolve(args.shift());
  const n = args.indexOf('--next');
  const next = n >= 0 ? args.splice(n, 4).slice(1) : null;
  mkdirSync(out, { recursive: true });
  const { racers } = JSON.parse(readFileSync(join(here, 'racers.json'), 'utf8'));
  const races = args.map((f) => JSON.parse(readFileSync(join(CLIENT, 'dev', '.tracks', `${f}.json`), 'utf8')));
  const rows = standings(races, racers);
  const k = races.length;
  const browser = await chromium.launch();
  await shoot(browser, standingsHtml({ title: 'STANDINGS', sub: `After race ${k} · points 10-8-6-5-4-3-2-1 for places 1 to 8`, rows }), join(out, `standings-${String(k).padStart(2, '0')}.png`));
  if (next) {
    const [slug, name, series] = next;
    await shoot(browser, nextHtml({ kicker: `NEXT · RACE ${k + 1}`, name, series, image: join(CLIENT, 'public', 'tracks', `${slug}@2x.webp`) }), join(out, `next-${String(k + 1).padStart(2, '0')}.png`));
  }
  await browser.close();
  console.log(rows.slice(0, 5).map((r) => `${r.pos}. ${r.name} ${r.pts}`).join(' · '));
}
