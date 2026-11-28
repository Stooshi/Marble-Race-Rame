// The Marble Spins Championship's cards (Moses, 28 Nov 2026), 1920×1080 PNGs in the broadcast's look (navy,
// yellow, orange, Lilita One, the small mark top right): the title, the 20 competitors, how points work, the
// racers to watch before a race, the ceremony (the top 3 on the podium, points awarded), the standings and the
// next race. The racers are made-up usernames (racers.json); nothing says they are real people, no prize.
// Points 10-8-6-5-4-3-2-1 for places 1 to 8; on equal points the better place in the latest race ranks higher.
//   node video/championship/cards.mjs <out dir> <episode n> <marbles dir>   (race files: dev/.tracks/champ-<n>-*.json)
// Looks only: nothing here touches a race.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const CLIENT = resolve(here, '..', '..');
const C = JSON.parse(readFileSync(join(here, 'champ.json'), 'utf8'));
const { racers, looks } = JSON.parse(readFileSync(join(here, 'racers.json'), 'utf8'));
const POINTS = C.points;

/** The race files of races 1..n (dev/.tracks/champ-<k>-*.json). */
export function raceFiles(n) {
  const dir = join(CLIENT, 'dev', '.tracks');
  return Array.from({ length: n }, (_, k) => {
    const f = readdirSync(dir).find((x) => x.startsWith(`champ-${k + 1}-`) && x.endsWith('.json'));
    if (!f) throw new Error(`no race file for race ${k + 1}`);
    return JSON.parse(readFileSync(join(dir, f), 'utf8'));
  });
}
/** Each racer's place in a race (by gate = racer), 1-based. */
const placesOf = (r) => { const out = []; r.results.forEach((x, k) => { out[r.entries[x.index].lane] = k + 1; }); return out; };
/** The standings after the given races: [{ lane, name, pts, pos, prev, last }] best first. */
export function standings(races) {
  const pts = racers.map(() => 0);
  const order = (ps, last) => ps.map((_, i) => i).sort((a, b) => ps[b] - ps[a] || last[a] - last[b] || a - b);
  let before = null;
  let last = racers.map(() => 99);
  races.forEach((r, k) => {
    if (k === races.length - 1 && k > 0) before = order(pts, last);
    const pl = placesOf(r);
    pl.forEach((p, lane) => { pts[lane] += POINTS[p - 1] ?? 0; });
    last = pl;
  });
  return order(pts, last).map((lane, i) => ({ lane, name: racers[lane], pts: pts[lane], pos: i + 1, prev: before ? before.indexOf(lane) + 1 : null, last: last[lane] }));
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const FONT = join(CLIENT, 'node_modules', '@fontsource', 'lilita-one', 'files', 'lilita-one-latin-400-normal.woff2');
const MARK = `<svg class="mark" viewBox="-120 -120 240 240"><defs><radialGradient id="mk" cx="35%" cy="30%" r="75%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="28%" stop-color="#FFD21F"/><stop offset="100%" stop-color="#E8580C"/></radialGradient></defs><path d="M 104 0 A 104 104 0 0 1 52 90" fill="none" stroke="#FF7A1A" stroke-width="14" stroke-linecap="round"/><path d="M -104 0 A 104 104 0 0 1 -52 -90" fill="none" stroke="#FFD21F" stroke-width="14" stroke-linecap="round"/><circle cx="0" cy="0" r="80" fill="url(#mk)"/><path d="M -64 16 C -34 -46 34 -50 62 -16" fill="none" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="15" stroke-linecap="round"/></svg>`;
const page = (body, extra = '') => `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: 'Lilita One'; src: url('file://${FONT}') format('woff2'); }
:root { --navy: #0E1320; --yellow: #FFD21F; --orange: #FF7A1A; --text: #F2F4F8; }
html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; font-family: 'Lilita One', sans-serif; color: var(--text);
  background: radial-gradient(ellipse at 30% 20%, #24305a 0%, var(--navy) 62%); }
.mark { position: absolute; right: 35px; top: 35px; width: 76px; height: 76px; opacity: .92; }
.kicker { position: absolute; left: 120px; top: 74px; font-size: 36px; letter-spacing: .14em; color: var(--orange); }
h1 { position: absolute; left: 116px; top: 112px; margin: 0; font-weight: 400; font-size: 92px; color: var(--yellow); letter-spacing: .02em; }
img.m { display: block; filter: drop-shadow(0 6px 10px rgba(0,0,0,.45)); }
${extra}</style>${body}${MARK}`;
const marble = (dir, lane, size) => `<img class="m" src="file://${join(dir, `${looks[lane]}.png`)}" style="width:${size}px;height:${size}px">`;

export function titleHtml() {
  return page(`<div class="t1">${esc(C.title.replace(' CHAMPIONSHIP', ''))}</div><div class="t2">CHAMPIONSHIP</div><div class="t3">10 races · 10 series · 20 racers</div>`, `
.t1 { position: absolute; left: 0; right: 0; top: 300px; text-align: center; font-size: 110px; letter-spacing: .06em; }
.t2 { position: absolute; left: 0; right: 0; top: 420px; text-align: center; font-size: 190px; color: var(--yellow); letter-spacing: .04em; text-shadow: 0 8px 30px rgba(0,0,0,.4); }
.t3 { position: absolute; left: 0; right: 0; top: 670px; text-align: center; font-size: 52px; color: var(--orange); letter-spacing: .08em; }`);
}
export function competitorsHtml(dir) {
  const cells = racers.map((n, lane) => `<div class="c">${marble(dir, lane, 118)}<div class="n">${esc(n)}</div></div>`).join('');
  return page(`<div class="kicker">${esc(C.title)}</div><h1>THE 20 COMPETITORS</h1><div class="g">${cells}</div>`, `
.g { position: absolute; left: 110px; right: 110px; top: 262px; display: grid; grid-template-columns: repeat(5, 1fr); row-gap: 30px; }
.c { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.n { font-size: 34px; letter-spacing: .02em; }`);
}
export function pointsHtml() {
  const cells = POINTS.map((p, k) => `<div class="pc"><div class="pl">${k + 1}${['st', 'nd', 'rd'][k] ?? 'th'}</div><div class="pp">${p}</div></div>`).join('');
  return page(`<div class="kicker">${esc(C.title)}</div><h1>HOW POINTS WORK</h1><div class="row">${cells}</div>
<div class="l1">Points for the first 8 places in every race</div><div class="l2">10 races · the most points after race 10 wins the championship</div><div class="l3">Same marbles, same physics: every race is decided on the track</div>`, `
.row { position: absolute; left: 120px; right: 120px; top: 300px; display: grid; grid-template-columns: repeat(8, 1fr); gap: 22px; }
.pc { background: rgba(255,255,255,.06); border-top: 6px solid var(--yellow); border-radius: 12px; padding: 22px 0 26px; text-align: center; }
.pl { font-size: 38px; color: var(--orange); } .pp { font-size: 120px; color: var(--yellow); line-height: 1; margin-top: 8px; }
.l1, .l2, .l3 { position: absolute; left: 120px; right: 120px; text-align: center; }
.l1 { top: 590px; font-size: 52px; } .l2 { top: 672px; font-size: 44px; color: var(--yellow); } .l3 { top: 754px; font-size: 38px; color: rgba(242,244,248,.75); }`);
}
/** Before race n: the leader and 2–3 marbles to watch, from the standings so far (race n ≥ 2). */
export function watchHtml(dir, n, races) {
  const st = standings(races);
  const lead = st[0];
  const prev = races[races.length - 1];
  const winnerLane = prev.entries[prev.results[0].index].lane;
  const picks = [{ lane: lead.lane, tag: 'CHAMPIONSHIP LEADER', line: `${lead.pts} points` }];
  if (winnerLane !== lead.lane) picks.push({ lane: winnerLane, tag: 'WON THE LAST RACE', line: `${st.find((r) => r.lane === winnerLane).pts} points` });
  for (const r of st.slice(1)) {
    if (picks.length >= 3) break;
    if (picks.some((x) => x.lane === r.lane)) continue;
    picks.push({ lane: r.lane, tag: `P${r.pos} IN THE STANDINGS`, line: `${lead.pts - r.pts} point${lead.pts - r.pts === 1 ? '' : 's'} behind` });
  }
  const climber = st.filter((r) => r.prev && r.prev - r.pos >= 4 && !picks.some((x) => x.lane === r.lane)).sort((a, b) => (b.prev - b.pos) - (a.prev - a.pos))[0];
  if (climber) picks.push({ lane: climber.lane, tag: `UP ${climber.prev - climber.pos} PLACES`, line: `now P${climber.pos} · ${climber.pts} points` });
  const cards = picks.slice(0, 4).map((x) => `<div class="w">${marble(dir, x.lane, 190)}<div class="tg">${esc(x.tag)}</div><div class="nm">${esc(racers[x.lane])}</div><div class="ln">${esc(x.line)}</div></div>`).join('');
  return page(`<div class="kicker">BEFORE RACE ${n}</div><h1>MARBLES TO WATCH</h1><div class="ws" style="grid-template-columns: repeat(${Math.min(4, picks.length)}, 1fr)">${cards}</div>`, `
.ws { position: absolute; left: 140px; right: 140px; top: 300px; display: grid; gap: 40px; }
.w { display: flex; flex-direction: column; align-items: center; text-align: center; background: rgba(255,255,255,.05); border-radius: 18px; padding: 40px 10px 44px; border-top: 6px solid var(--yellow); }
.tg { margin-top: 26px; font-size: 30px; color: var(--orange); letter-spacing: .08em; }
.nm { margin-top: 10px; font-size: 64px; color: var(--yellow); } .ln { margin-top: 8px; font-size: 40px; }`);
}
/** The ceremony after race n: the top 3 on the podium with their times and points. */
export function ceremonyHtml(dir, n, race, raceInfo) {
  const top = race.results.slice(0, 3).map((x, k) => ({ lane: race.entries[x.index].lane, ms: x.finishTimeMs, place: k + 1 }));
  const t = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(Math.round(ms % 1000)).padStart(3, '0')}`;
  const gap = (x) => (x.place === 1 ? t(x.ms) : `+${((x.ms - top[0].ms) / 1000).toFixed(3)} s`);
  const col = (x, h) => `<div class="col p${x.place}">${marble(dir, x.lane, x.place === 1 ? 210 : 170)}<div class="nm">${esc(racers[x.lane])}</div><div class="tm">${gap(x)}</div><div class="step" style="height:${h}px"><div class="pl">${x.place}</div><div class="pts">+${POINTS[x.place - 1]} PTS</div></div></div>`;
  return page(`<div class="kicker">RACE ${n} · ${esc(raceInfo.name.toUpperCase())}</div><h1>THE PODIUM</h1><div class="pod">${col(top[1], 250)}${col(top[0], 340)}${col(top[2], 190)}</div>`, `
.pod { position: absolute; left: 330px; right: 330px; bottom: 0; display: grid; grid-template-columns: 1fr 1.15fr 1fr; align-items: end; gap: 18px; }
.col { display: flex; flex-direction: column; align-items: center; }
.nm { margin-top: 14px; font-size: 54px; } .p1 .nm { color: var(--yellow); font-size: 64px; }
.tm { font-size: 34px; color: rgba(242,244,248,.8); margin: 4px 0 18px; }
.step { width: 100%; border-radius: 14px 14px 0 0; background: linear-gradient(#2c3a6a, #1a2240); border-top: 8px solid var(--orange); display: flex; flex-direction: column; align-items: center; padding-top: 14px; }
.p1 .step { border-top-color: var(--yellow); }
.pl { font-size: 110px; line-height: 1; color: var(--yellow); } .pts { font-size: 40px; color: var(--orange); margin-top: 6px; }`);
}
export function standingsHtml(dir, n, races) {
  const rows = standings(races);
  const half = 10;
  const row = (r) => {
    const move = r.prev == null ? '' : r.prev > r.pos ? `<span class="up">▲${r.prev - r.pos}</span>` : r.prev < r.pos ? `<span class="dn">▼${r.pos - r.prev}</span>` : '<span class="eq">–</span>';
    return `<div class="row${r.pos <= 3 ? ' top' : ''}"><span class="p">${r.pos}</span>${marble(dir, r.lane, 46)}<span class="n">${esc(r.name)}</span><span class="m">${move}</span><span class="pts">${r.pts}</span></div>`;
  };
  return page(`<div class="kicker">${esc(C.title)}</div><h1>STANDINGS AFTER RACE ${n}</h1><div class="sub">${n} of 10 races · points</div>
<div class="grid"><div class="col">${rows.slice(0, half).map(row).join('')}</div><div class="col">${rows.slice(half).map(row).join('')}</div></div>`, `
.sub { position: absolute; right: 140px; top: 150px; font-size: 34px; color: var(--orange); letter-spacing: .06em; }
.grid { position: absolute; left: 120px; right: 120px; top: 262px; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; }
.col { display: flex; flex-direction: column; border-top: 4px solid var(--yellow); }
.row { display: grid; grid-template-columns: 64px 62px 1fr 80px 90px; align-items: center; height: 70px; font-size: 40px; font-variant-numeric: tabular-nums; border-bottom: 2px solid rgba(242,244,248,.1); }
.row .p { color: var(--orange); } .row.top .p, .row.top .n { color: var(--yellow); }
.row .pts { text-align: right; } .row .m { text-align: center; font-size: 26px; }
.up { color: #57E389; } .dn { color: #FF6B6B; } .eq { color: rgba(242,244,248,.45); }`);
}
export function nextHtml(next) {
  const image = join(CLIENT, 'public', 'tracks', `${next.slug}@2x.webp`);
  return page(`<div class="img"></div><div class="fade"></div><div class="box"><div class="k">NEXT RACE · RACE ${next.n} OF 10</div><div class="t">${esc(next.name)}</div><div class="s">${esc(next.series)} · ${esc(next.place)}</div></div>`, `
.img { position: absolute; inset: 0; background: url('file://${image}') center/cover; filter: saturate(1.1); }
.fade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(14,19,32,.94) 0%, rgba(14,19,32,.72) 42%, rgba(14,19,32,0) 75%); }
.box { position: absolute; left: 120px; bottom: 150px; padding: 30px 48px 34px; border-left: 18px solid var(--yellow); background: rgba(14,19,32,.55); }
.k { font-size: 40px; color: var(--orange); letter-spacing: .1em; } .t { font-size: 108px; line-height: 1.02; margin-top: 8px; max-width: 1100px; }
.s { font-size: 40px; color: var(--yellow); margin-top: 14px; letter-spacing: .04em; }`);
}

export async function shoot(browser, html, file) {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const tmp = `${file}.html`;
  writeFileSync(tmp, html);
  await p.goto(`file://${tmp}`);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; })))));
  await p.screenshot({ path: file });
  await p.close();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [outArg, nArg, dirArg] = process.argv.slice(2);
  const out = resolve(outArg);
  const n = Number(nArg);
  const dir = resolve(dirArg);
  mkdirSync(out, { recursive: true });
  const races = raceFiles(n);
  const info = C.races.find((r) => r.n === n);
  const next = C.races.find((r) => r.n === n + 1);
  const browser = await chromium.launch();
  if (n === 1) {
    await shoot(browser, titleHtml(), join(out, 'title.png'));
    await shoot(browser, competitorsHtml(dir), join(out, 'competitors.png'));
    await shoot(browser, pointsHtml(), join(out, 'points.png'));
  } else {
    await shoot(browser, watchHtml(dir, n, races.slice(0, n - 1)), join(out, 'watch.png'));
  }
  await shoot(browser, ceremonyHtml(dir, n, races[n - 1], info), join(out, 'ceremony.png'));
  await shoot(browser, standingsHtml(dir, n, races), join(out, 'standings.png'));
  if (next) await shoot(browser, nextHtml(next), join(out, 'next.png'));
  await browser.close();
  console.log(standings(races).slice(0, 5).map((r) => `${r.pos}. ${r.name} ${r.pts}`).join(' · '));
}
