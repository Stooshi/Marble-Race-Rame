/**
 * The marbles hub's pictures for an article, laid out from the marble illustrations (marbles.mjs):
 * the marbles on the site's dark card colour with soft shadows, labelled in the site's own fonts, as
 * WebP at two widths (for phones and big screens) plus the 1200 × 630 share picture. Every picture's
 * alt text and caption go in a JSON file beside them, for the article page.
 *   node scripts/hub-art/plates.mjs <marbles dir> <out dir> <article>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { HISTORY, MAKING, PLAY, RINGER } from './diagrams.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fonts = path.resolve(here, '../../node_modules/@fontsource');
const font = (pkg, file) => pathToFileURL(path.join(fonts, pkg, 'files', file)).href;

const CSS = `
@font-face { font-family: 'Lilita One'; src: url(${font('lilita-one', 'lilita-one-latin-400-normal.woff2')}); }
@font-face { font-family: 'Barlow Condensed'; font-weight: 700; src: url(${font('barlow-condensed', 'barlow-condensed-latin-700-normal.woff2')}); }
@font-face { font-family: 'Barlow Condensed'; font-weight: 800; src: url(${font('barlow-condensed', 'barlow-condensed-latin-800-normal.woff2')}); }
@font-face { font-family: 'Source Sans 3'; font-weight: 400; src: url(${font('source-sans-3', 'source-sans-3-latin-400-normal.woff2')}); }
@font-face { font-family: 'Source Sans 3'; font-weight: 600; src: url(${font('source-sans-3', 'source-sans-3-latin-600-normal.woff2')}); }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { width: var(--w); height: var(--h); overflow: hidden; color: #F2F4F8; font-family: 'Source Sans 3', sans-serif;
  background: radial-gradient(120% 90% at 50% 38%, #26304A 0%, #1A2133 55%, #0E1320 100%); }
.stage { position: absolute; inset: 0; display: flex; align-items: flex-start; justify-content: center; gap: var(--gap); padding: 90px var(--pad) 0; }
.m { position: relative; display: grid; justify-items: center; gap: 22px; }
.ball { position: relative; width: var(--d); height: var(--d); }
.ball img { position: relative; width: 100%; height: 100%; display: block; z-index: 1; }
.ball::after { content: ''; position: absolute; left: 12%; right: 12%; bottom: -5%; height: 14%; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0,0,0,0.55), rgba(0,0,0,0)); z-index: 0; }
.label { font-family: 'Barlow Condensed'; font-weight: 800; font-size: var(--lf); letter-spacing: 0.03em; text-transform: uppercase; line-height: 1; text-align: center; }
.sub { font-family: 'Source Sans 3'; font-weight: 400; font-size: calc(var(--lf) * 0.66); color: #A9B1C3; margin-top: 6px; text-align: center; }
.tag { position: absolute; right: 26px; bottom: 20px; font-family: 'Barlow Condensed'; font-weight: 700; font-size: 26px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(169,177,195,0.75); }
.callout { position: absolute; z-index: 2; font-family: 'Barlow Condensed'; font-weight: 800; font-size: 58px; letter-spacing: 0.04em; text-transform: uppercase; color: #FFD21F; white-space: nowrap; }
svg.lines { position: absolute; inset: 0; z-index: 2; overflow: visible; }
`;

const page = (w, h, vars, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body style="--w:${w}px;--h:${h}px;${Object.entries(vars).map(([k, v]) => `--${k}:${v}`).join(';')}">${body}</body></html>`;

/** A row of marbles, each with a label (and a smaller line under it). */
function row(items, { w = 1600, h = 900, d = 380, gap = 70, lf = 46 } = {}, dir) {
  const balls = items.map((it) => `<div class="m"><div class="ball" style="${it.d ? `width:${it.d}px;height:${it.d}px` : ''}"><img src="${pathToFileURL(path.join(dir, `${it.img}.png`)).href}"></div>
    ${it.label ? `<div><div class="label">${it.label}</div>${it.sub ? `<div class="sub">${it.sub}</div>` : ''}</div>` : ''}</div>`).join('');
  return page(w, h, { d: `${d}px`, gap: `${gap}px`, pad: '60px', lf: `${lf * 1.45}px` }, `<div class="stage">${balls}</div><div class="tag">Illustration</div>`);
}

/** One marble, big, with a label pointing at a spot on it (e.g. its pontil). */
function single({ img, label, sub, point, note }, { w = 1600, h = 1000, d = 760 } = {}, dir, notes) {
  const cx = w / 2 - (point ? 120 : 0); const cy = h / 2 - 10;
  let callout = '';
  const at = point && notes[img]?.[point];
  if (at) {
    const px = cx - d / 2 + at.x * d; const py = cy - d / 2 + at.y * d;
    const tx = cx + d / 2 + 50; const ty = Math.max(90, py - 10);
    callout = `<svg class="lines" width="${w}" height="${h}"><path d="M${tx - 14} ${ty + 22} L ${px + 22} ${py + 6}" stroke="#FFD21F" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="${px}" cy="${py}" r="20" stroke="#FFD21F" stroke-width="5" fill="none"/></svg>
      <div class="callout" style="left:${tx}px;top:${ty}px">${note}</div>`;
  }
  const body = `<div class="ball" style="position:absolute;left:${cx - d / 2}px;top:${cy - d / 2}px;width:${d}px;height:${d}px"><img src="${pathToFileURL(path.join(dir, `${img}.png`)).href}"></div>
    ${callout}
    ${label ? `<div style="position:absolute;left:${point ? cx + d / 2 + 50 : 60}px;bottom:70px"><div class="label" style="--lf:72px;text-align:left">${label}</div>${sub ? `<div class="sub" style="--lf:72px;text-align:left">${sub}</div>` : ''}</div>` : ''}
    <div class="tag">Illustration</div>`;
  return page(w, h, { d: `${d}px`, lf: '46px' }, body);
}

/** The sizes, drawn to scale: a 16 mm play marble, a 3/4 inch shooter and a 2 inch marble, each with its width marked under it. */
function sizes(dir, { w = 1600, h = 900 } = {}) {
  const mm = 9; // px per mm, the same for all three
  const base = 600;
  const list = [
    { img: 'clearie', mm: 16, label: 'Play marble', sub: '5/8 in · 16 mm' },
    { img: 'cats-eye', mm: 19.05, label: 'Shooter', sub: 'up to 3/4 in · 19 mm' },
    { img: 'onionskin', mm: 50.8, label: 'Big marble', sub: 'about 2 in · 51 mm' },
  ];
  const gap = 210;
  const total = list.reduce((t, it) => t + it.mm * mm, 0) + gap * (list.length - 1);
  let x = (w - total) / 2;
  const lines = [];
  const balls = list.map((it) => {
    const d = it.mm * mm;
    const html = `<div class="ball" style="position:absolute;left:${x}px;top:${base - d}px;width:${d}px;height:${d}px"><img src="${pathToFileURL(path.join(dir, `${it.img}.png`)).href}"></div>
      <div style="position:absolute;left:${x + d / 2 - 200}px;width:400px;top:${base + 92}px"><div class="label" style="--lf:60px">${it.label}</div><div class="sub" style="--lf:60px">${it.sub}</div></div>`;
    // Its width: a dimension line with end ticks under it.
    const y = base + 44;
    lines.push(`<line x1="${x}" y1="${y}" x2="${x + d}" y2="${y}" stroke="#FFD21F" stroke-width="4"/>`,
      `<line x1="${x}" y1="${y - 16}" x2="${x}" y2="${y + 16}" stroke="#FFD21F" stroke-width="4"/>`,
      `<line x1="${x + d}" y1="${y - 16}" x2="${x + d}" y2="${y + 16}" stroke="#FFD21F" stroke-width="4"/>`);
    x += d + gap;
    return html;
  }).join('');
  // A 1 cm scale bar, bottom left.
  const sx = 70; const sy = h - 70;
  lines.push(`<line x1="${sx}" y1="${sy}" x2="${sx + 10 * mm}" y2="${sy}" stroke="#C7CEDC" stroke-width="5"/>`,
    `<line x1="${sx}" y1="${sy - 12}" x2="${sx}" y2="${sy + 12}" stroke="#C7CEDC" stroke-width="4"/>`,
    `<line x1="${sx + 10 * mm}" y1="${sy - 12}" x2="${sx + 10 * mm}" y2="${sy + 12}" stroke="#C7CEDC" stroke-width="4"/>`,
    `<text x="${sx + 10 * mm + 18}" y="${sy + 10}" fill="#C7CEDC" font-family="Barlow Condensed" font-weight="700" font-size="30">1 cm</text>`);
  const svg = `<svg class="lines" width="${w}" height="${h}">${lines.join('')}</svg>`;
  const title = `<div style="position:absolute;left:70px;top:56px"><div class="label" style="--lf:64px;text-align:left">Marble sizes, to scale</div></div>`;
  return page(w, h, { d: '10px', lf: '46px' }, `${title}${balls}${svg}<div class="tag">Illustration</div>`);
}

/** The article's header: a spread of marbles across a wide picture, no words. */
function header(items, dir, { w = 1600, h = 900 } = {}) {
  const balls = items.map(([img, x, y, d]) => `<div class="ball" style="position:absolute;left:${x - d / 2}px;top:${y - d / 2}px;width:${d}px;height:${d}px"><img src="${pathToFileURL(path.join(dir, `${img}.png`)).href}"></div>`).join('');
  return page(w, h, {}, `${balls}<div class="tag">Illustration</div>`);
}

/** The share picture (1200 × 630): the header's marbles and the article's title. */
function share({ title, kicker }, items, dir) {
  const w = 1200; const h = 630;
  const balls = items.map(([img, x, y, d]) => `<div class="ball" style="position:absolute;left:${x - d / 2}px;top:${y - d / 2}px;width:${d}px;height:${d}px"><img src="${pathToFileURL(path.join(dir, `${img}.png`)).href}"></div>`).join('');
  const text = `<div style="position:absolute;left:64px;top:70px;width:560px">
    <div style="font-family:'Barlow Condensed';font-weight:800;font-size:34px;letter-spacing:0.14em;text-transform:uppercase;color:#FFD21F">${kicker}</div>
    <div style="font-family:'Lilita One';font-size:92px;line-height:0.98;margin-top:14px">${title}</div>
    <div style="font-family:'Barlow Condensed';font-weight:700;font-size:34px;letter-spacing:0.06em;color:#C7CEDC;margin-top:26px">marblespins.com/marbles</div></div>`;
  return page(w, h, {}, `${balls}${text}`);
}

// ── The marble types article ───────────────────────────────────────────────

const TYPES = {
  slug: 'marble-types-guide',
  pictures: [
    {
      name: 'header', kind: 'header',
      items: [['aggie', 230, 290, 300], ['clay-tan', 170, 640, 200], ['onionskin', 520, 560, 380], ['cats-eye', 500, 200, 230], ['sulphide', 860, 360, 420], ['moonie', 790, 740, 190], ['corkscrew', 1010, 730, 170], ['handmade-swirl', 1210, 560, 360], ['oxblood', 1230, 190, 230], ['lutz', 1450, 330, 210]],
      alt: 'Illustration of marble types side by side: a banded agate aggie, an onionskin covered in coloured streaks, a cat\'s eye, a sulphide with a white dog inside, a handmade swirl, an oxblood, a Lutz with glittering copper bands, a clay marble, a moonie and a corkscrew.',
      caption: 'Some of the marble types in this guide. Illustration in the Marble Spins style, not photos of real marbles.',
    },
    {
      name: 'clay-and-china', kind: 'row', layout: { d: 250, gap: 50, lf: 33 },
      items: [{ img: 'clay-tan', label: 'Clay' }, { img: 'clay-blue', label: 'Clay', sub: 'dyed' }, { img: 'bennington-brown', label: 'Bennington' }, { img: 'bennington-blue', label: 'Bennington' }, { img: 'china', label: 'China' }],
      alt: 'Illustration of five early marbles: a dull tan clay marble, a faded blue dyed clay marble, glossy brown and blue Bennington marbles with small light spots in the glaze, and a white china marble with hand-painted green and red rings and lines.',
      caption: 'Clay marbles are plain and slightly rough. Benningtons are glazed, with light "eyes" where they touched other marbles in the kiln. Chinas are glazed porcelain with painted lines. Illustration.',
    },
    {
      name: 'aggie-and-steelie', kind: 'row', layout: { d: 440, gap: 160 },
      items: [{ img: 'aggie', label: 'Aggie', sub: 'agate' }, { img: 'steelie', label: 'Steelie', sub: 'steel' }],
      alt: 'Illustration of an aggie, a polished agate marble with wavy bands of red-brown, orange and cream, next to a steelie, a shiny steel ball.',
      caption: 'An aggie (agate, or glass made to look like agate) and a steelie (steel). Illustration.',
    },
    {
      name: 'handmade-swirl', kind: 'single', img: 'handmade-swirl', label: 'Handmade swirl', sub: 'latticinio core', point: 'pontil', note: 'Pontil mark',
      alt: 'Illustration of a handmade glass swirl marble: in the clear glass a core of fine white threads in a lattice, with red, blue, yellow and green ribbons twisting round it from pole to pole. A small rough pontil mark is marked at the top.',
      caption: 'A handmade swirl, its bands twisting from pole to pole, with the small rough pontil mark where it was cut free. Illustration.',
    },
    {
      name: 'onionskin', kind: 'single', img: 'onionskin', label: 'Onionskin', point: 'pontil', note: 'Pontil mark',
      alt: 'Illustration of an onionskin marble: its whole surface covered with closely packed thin streaks of red, yellow, white, blue, orange and green running from pole to pole, under clear glass, with the pontil mark at the top where the streaks meet.',
      caption: 'An onionskin: closely packed streaks of colour all over, like the layers of an onion. Illustration.',
    },
    {
      name: 'lutz', kind: 'single', img: 'lutz', label: 'Lutz', point: 'pontil', note: 'Pontil mark',
      alt: 'Illustration of a Lutz marble: clear glass with bands of glittering copper flecks twisting through it, each band edged with thin white strands.',
      caption: 'A Lutz: bands of glittering copper flecks (goldstone) in the glass, edged with thin white strands. Illustration.',
    },
    {
      name: 'sulphide', kind: 'single', img: 'sulphide', label: 'Sulphide', sub: 'figure: a dog',
      alt: 'Illustration of a sulphide marble: a large clear glass marble with a small white figure of a sitting dog on a little base inside it.',
      caption: 'A sulphide: a large clear marble with a small white figure inside, here a dog. The figure is porcelain, not sulfur. Illustration.',
    },
    {
      name: 'clearie-and-cats-eye', kind: 'row', layout: { d: 440, gap: 160 },
      items: [{ img: 'clearie', label: 'Clearie' }, { img: 'cats-eye', label: 'Cat\'s eye' }],
      alt: 'Illustration of two machine-made glass marbles: a plain transparent green clearie with a few tiny air bubbles, and a clear cat\'s eye with a red and yellow vane in the middle shaped like a cat\'s pupil.',
      caption: 'A clearie (plain transparent glass) and a cat\'s eye (clear glass with coloured vanes inside). Illustration.',
    },
    {
      name: 'corkscrew-oxblood-moonie', kind: 'row', layout: { d: 360, gap: 90 },
      items: [{ img: 'corkscrew', label: 'Corkscrew' }, { img: 'oxblood', label: 'Oxblood' }, { img: 'moonie', label: 'Moonie' }],
      alt: 'Illustration of three machine-made marbles: a corkscrew with red and yellow spirals winding round a white marble, an oxblood with a deep red swirl containing fine black threads on milky white glass, and a moonie of milky white opalescent glass with a bluish sheen and a warm glow at one edge.',
      caption: 'A corkscrew (spirals of colour winding from pole to pole), an oxblood (a deep red swirl with fine black threads) and a moonie (milky white opalescent glass). Illustration.',
    },
    {
      name: 'sizes', kind: 'sizes',
      alt: 'Diagram of marble sizes drawn to scale over a millimetre ruler: a 16 millimetre (5/8 inch) play marble, a 19 millimetre (3/4 inch) shooter and a 5 centimetre (about 2 inch) big marble.',
      caption: 'Marble sizes to scale: a standard play marble, a tournament shooter at its largest, and a big marble. Illustration.',
    },
  ],
  share: {
    kicker: 'Marbles', title: 'Marble types: a beginner\'s guide',
    items: [['sulphide', 905, 300, 400], ['onionskin', 1100, 520, 300], ['cats-eye', 760, 520, 220], ['aggie', 1130, 130, 210]],
    alt: 'Marble types: a beginner\'s guide. Illustrated marbles: a sulphide, an onionskin, a cat\'s eye and an aggie.',
  },
};

// ── The rules, history and making articles: diagrams and illustrations (diagrams.mjs) ──

const P = (fn, alt, caption) => ({ kind: 'svg', fn, alt, caption });

const HOW_TO_PLAY = {
  slug: 'how-to-play-marbles',
  pictures: [
    { name: 'header', ...P(PLAY.header, 'Illustration seen from above: a chalk ring on pavement with a small group of marbles in the middle and a shooter marble at the edge, a dotted line showing its aim.', 'A ring, some marbles and a shooter: all you need to start. Illustration.') },
    { name: 'what-you-need', ...P(PLAY.needs, 'Illustration of what you need to play marbles: a few small target marbles, one slightly bigger shooter marble, and a stick of chalk and a piece of string for marking a ring.', 'Target marbles, a shooter, and chalk or string to mark a ring. Illustration.') },
    { name: 'knuckling-down', ...P(PLAY.knuckle, 'Labelled diagram of a hand knuckling down, seen from the side: the knuckles rest on the ground, the marble sits in the bent index finger, the thumb is tucked behind it, and an arrow shows the thumb flicking the marble forward.', 'Knuckling down: a knuckle on the ground, the marble in the bent index finger, the thumb behind it. Diagram.') },
    { name: 'hunching', ...P(PLAY.hunching, 'Diagram comparing two shots: on the left, marked right, the hand stays still and only the thumb moves; on the right, marked wrong, the hand is pushed forward while shooting, which is the foul called hunching.', 'Only the thumb moves. Pushing your hand forward is a foul: hunching in the US, fudging in Britain. Diagram.') },
    { name: 'lagging', ...P(PLAY.lagging, 'Diagram of lagging seen from above: two players send their shooters toward a line, and the shooter that stops closest to the line wins the first turn.', 'Lagging: whoever stops closest to the line goes first. Diagram.') },
    { name: 'ring-game', ...P(PLAY.ringGame, 'Diagram of a simple ring game seen from above, in three numbered steps: a shooter fired from outside the chalk ring, a target marble knocked out of the ring, and the shooter stopping inside the ring, where the player shoots again from.', 'A simple ring game: shoot from outside the ring; knock a marble out and stay inside, and you shoot again from where your shooter stopped. Diagram.') },
    { name: 'conqueror', ...P(PLAY.conqueror, 'Diagram of Conqueror: one player tosses a marble onto the ground, the next player shoots at it; a hit captures it, a miss leaves the shooter\'s marble where it stopped as the new target.', 'Conqueror: hit the marble and it\'s yours; miss, and your marble becomes the next target. Diagram.') },
    { name: 'hundreds', ...P(PLAY.hundreds, 'Diagram of Hundreds: two players shoot toward a small circle; when only one marble lands inside, that player scores 10 points and shoots again, and the first to 100 wins.', 'Hundreds: only one marble in the circle scores 10. First to 100 wins. Diagram.') },
  ],
  share: { kicker: 'Marble games', title: 'How to play marbles', items: [['cats-eye', 905, 300, 300], ['corkscrew', 1100, 500, 220], ['clearie', 780, 520, 190], ['aggie', 1120, 130, 180]], alt: 'How to play marbles. Illustrated marbles: a cat\'s eye, a corkscrew, a clearie and an aggie.' },
};

const RINGER_ARTICLE = {
  slug: 'ringer',
  pictures: [
    { name: 'header', ...P(RINGER.header, 'Illustration seen from above: a Ringer court, a chalk circle on concrete inside a wooden border, with 13 marbles in an X in the middle and a shooter at the edge.', 'Ringer: 13 marbles in a cross in a 10-foot ring. Illustration.') },
    { name: 'court', ...P(RINGER.court, 'Diagram of the Ringer court seen from above, drawn to scale: a 12-foot square of concrete with a raised wooden border, a 10-foot circle in the middle, a centre mark where the 13 marbles go, and two lag lines that touch the circle and run parallel to the border.', 'The court: a 10-foot circle on a 12-foot square, with two lag lines touching the circle. The court is drawn to scale; the marbles are drawn larger. Diagram.') },
    { name: 'the-cross', ...P(RINGER.rack, 'Diagram of the Ringer set-up drawn to scale: 13 marbles in an X, one in the middle and three along each arm, 3 inches apart centre to centre.', 'The cross: one marble in the middle and three on each arm, 3 inches apart. The first shooter chooses which way the X points. Drawn to scale. Diagram.') },
    { name: 'lagging', ...P(RINGER.lag, 'Diagram of lagging in Ringer: both players toss their shooters at the same time from the far edge of the circle toward the lag line; the shooter that stops closest to the line wins first shot.', 'Lagging: both toss from the far edge at the same time; closest to the lag line shoots first. Diagram.') },
    { name: 'shooting', ...P(RINGER.shooting, 'Diagram of a Ringer turn seen from above: the first shot is taken from outside the circle and knocks a target marble out for one point; the shooter stops inside the circle, and the next shot is taken from where it stopped.', 'Each marble knocked out scores one. If your shooter stays inside, shoot again from where it stopped. Diagram.') },
    { name: 'on-the-line', ...P(RINGER.line, 'Diagram of the on-the-line rule: a target marble lying on the circle\'s line with more than half of it outside counts as out, while a shooter lying on the line counts as in.', 'On the line: a target on the line is out, a shooter on the line is in. Diagram.') },
  ],
  share: { kicker: 'Marble games', title: 'Ringer rules', items: [['clearie', 860, 320, 96], ['clearie', 950, 230, 96], ['clearie', 1040, 140, 96], ['clearie', 770, 230, 96], ['clearie', 680, 140, 96], ['clearie', 950, 410, 96], ['clearie', 1040, 500, 96], ['clearie', 770, 410, 96], ['clearie', 680, 500, 96], ['cats-eye', 570, 560, 120]], alt: 'Ringer rules. Illustrated marbles set out in a cross, with a cat\'s eye shooter.' },
};

const HISTORY_ARTICLE = {
  slug: 'history-of-marbles',
  pictures: [
    { name: 'header', ...P(HISTORY.header, 'Illustration of a row of objects on a shelf, from left to right: a round pebble, a walnut, a clay marble, a china marble, a handmade onionskin, a machine-made corkscrew and a cat\'s eye.', 'From pebbles and nuts to glass. Illustration, not photos of historical objects.') },
    { name: 'timeline', ...P(HISTORY.timeline, 'Illustrated timeline of marbles: stone balls at Mohenjo-daro around 2500 BCE; Roman children\'s nut games; Bruegel\'s 1560 painting of children at marbles; marble scissors in Lauscha around 1846; clay marbles mass-made in the US from the 1870s; Christensen\'s machine patent, filed 1902 and published 1905; tournaments from the 1920s and 1930s; cat\'s eyes common by the 1950s.', 'Some milestones from this history, as an illustrated timeline. Illustration.') },
    { name: 'before-glass', ...P(HISTORY.ancient, 'Illustration of what the earliest marbles may have been: round pebbles, nuts and fruit pits, and small stone balls, on bare earth.', 'Before glass: pebbles, nuts and fruit pits, and small stone balls whose use is uncertain. An illustration, not a picture of particular finds.') },
    { name: 'marble-scissors', ...P(MAKING.header, 'Illustration of a glowing glass cane with a hot, newly rounded swirl marble at its end, held between the blades of a pair of marble scissors.', 'Marble scissors cutting a marble from a glass cane, the method used in Lauscha from around 1846. Illustration.') },
    { name: 'christensen-machine', ...P(MAKING.christensen, 'Diagram of the principle of Christensen\'s marble machine: two grooved rolls turning in opposite directions roll a lump of soft glass into a ball between them, with a spring letting one roll move aside.', 'The idea behind Christensen\'s machine (patent filed 1902, published 1905): two grooved rolls turning in opposite directions. A simplified illustration, not a copy of the patent drawing.') },
  ],
  share: { kicker: 'Marbles', title: 'A short history of marbles', items: [['onionskin', 905, 300, 300], ['clay-tan', 1100, 520, 200], ['cats-eye', 780, 520, 190], ['china', 1120, 130, 180]], alt: 'A short history of marbles. Illustrated marbles: an onionskin, a clay marble, a cat\'s eye and a china.' },
};

const MAKING_ARTICLE = {
  slug: 'how-glass-marbles-are-made',
  pictures: [
    { name: 'header', ...P(MAKING.header, 'Illustration of a glowing glass cane with a hot, newly rounded swirl marble at its end, held between the blades of a pair of marble scissors.', 'A marble cut from a glass cane with marble scissors. Illustration.') },
    { name: 'cane-cut', ...P(MAKING.caneCut, 'Illustration of the five steps of making a cane-cut marble: make a glass cane with the design inside, heat its end until soft, round it off, twist it for the spiral, and cut it free with the marble scissors.', 'Cane-cut marbles in five steps. Illustration.') },
    { name: 'single-gather', ...P(MAKING.punty, 'Illustration of a single-gather marble: a ball of hot glass built up in layers on the end of a metal rod called a punty.', 'A single-gather marble is built up on a punty, then rounded and cut free. Illustration.') },
    { name: 'pontil', kind: 'single', img: 'handmade-swirl', label: 'Pontil mark', sub: 'where it was cut free', point: 'pontil', note: 'Pontil', alt: 'Illustration of a handmade swirl marble with its pontil mark, the small rough spot at one pole where it was cut free, circled.', caption: 'Every handmade marble has a pontil: a small rough spot where it was cut free. Illustration.' },
    { name: 'christensen-machine', ...P(MAKING.christensen, 'Diagram of the principle of Christensen\'s marble machine: two grooved rolls turning in opposite directions roll a lump of soft glass into a ball between them, with a spring letting one roll move aside when the ball is big enough.', 'Christensen\'s machine (patent filed 1902, published 1905): two grooved rolls turning in opposite directions. A simplified illustration, not a copy of the patent drawing.') },
    { name: 'machine-method', ...P(MAKING.modern, 'Illustration of the machine method in five numbered steps: glass melted in a furnace, a stream of molten glass, a rotating shear cutting a gob, spiral-grooved rollers turning it into a sphere, and finished marbles collected to cool.', 'The machine method: melt, stream, cut, roll, collect. Illustration.') },
    { name: 'colour', ...P(MAKING.colour, 'Illustration of where a marble\'s colour comes from: a handmade marble\'s coloured rods built into the cane, a machine-made marble\'s streams of coloured glass flowing together, and a cat\'s eye\'s coloured vanes injected into clear glass.', 'Where the colour comes from: the cane, the glass streams, or vanes injected into clear glass. Illustration.') },
    { name: 'annealing', ...P(MAKING.annealing, 'Illustration of annealing: marbles travelling on a conveyor through a long oven called a lehr, from hot at one end to cool at the other.', 'Annealing: the glass cools slowly in a lehr so it doesn\'t crack later. Illustration.') },
  ],
  share: { kicker: 'Marbles', title: 'How glass marbles are made', items: [['handmade-swirl', 905, 300, 300], ['lutz', 1100, 520, 200], ['onionskin', 780, 520, 190], ['clearie', 1120, 130, 180]], alt: 'How glass marbles are made. Illustrated glass marbles: a handmade swirl, a Lutz, an onionskin and a clearie.' },
};

const ARTICLES = Object.fromEntries([TYPES, HOW_TO_PLAY, RINGER_ARTICLE, HISTORY_ARTICLE, MAKING_ARTICLE].map((a) => [a.slug, a]));

async function shoot(browser, html, w, h, file) {
  const tmp = `${file}.html`;
  fs.writeFileSync(tmp, html);
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  await page.close();
  fs.rmSync(tmp);
  return png;
}

async function main() {
  const [dir, out, slug] = process.argv.slice(2);
  const art = ARTICLES[slug];
  if (!art) throw new Error(`no pictures for ${slug}`);
  const notes = fs.existsSync(path.join(dir, 'notes.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'notes.json'), 'utf8')) : {};
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
  const meta = [];
  try {
    for (const p of art.pictures) {
      let h = p.kind === 'single' ? 1000 : p.kind === 'row' ? Math.round((p.layout?.d ?? 380) + 300) : 900;
      let drawn = null;
      if (p.kind === 'svg') { drawn = p.fn({ dir }); h = Number(/height="(\d+)"/.exec(drawn)[1]); }
      const html = p.kind === 'svg' ? page(1600, h, {}, drawn)
        : p.kind === 'row' ? row(p.items, { ...p.layout, h }, dir)
        : p.kind === 'single' ? single(p, { h }, dir, notes)
          : p.kind === 'sizes' ? sizes(dir)
            : header(p.items, dir);
      const png = await shoot(browser, html, 1600, h, path.join(out, p.name));
      const files = [];
      for (const width of [1600, 800]) {
        const f = `${p.name}-${width}.webp`;
        await sharp(png).resize(width).webp({ quality: 78, effort: 6 }).toFile(path.join(out, f));
        files.push({ file: f, width, height: Math.round((h * width) / 1600), bytes: fs.statSync(path.join(out, f)).size });
      }
      meta.push({ name: p.name, alt: p.alt, caption: p.caption, files });
    }
    const s = art.share;
    const png = await shoot(browser, share(s, s.items, dir), 1200, 630, path.join(out, 'share'));
    await sharp(png).png({ compressionLevel: 9, palette: false }).toFile(path.join(out, 'share-1200x630.png'));
    await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(out, 'share-1200x630.jpg'));
    meta.push({ name: 'share', alt: s.alt, files: [{ file: 'share-1200x630.jpg', width: 1200, height: 630, bytes: fs.statSync(path.join(out, 'share-1200x630.jpg')).size }] });
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(out, 'pictures.json'), JSON.stringify({ article: slug, pictures: meta }, null, 1));
  for (const m of meta) console.log(m.name, m.files.map((f) => `${f.file} ${(f.bytes / 1024).toFixed(0)} KB`).join(', '));
}

main().catch((e) => { console.error(e); process.exit(1); });
