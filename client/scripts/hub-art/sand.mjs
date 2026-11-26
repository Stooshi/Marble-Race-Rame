/**
 * The pictures for "How to build your own marble race track in the sand" (Moses, 1 Nov 2026): simple
 * step-by-step drawings in the hub's look (the site's dark navy, yellow and orange, chalk-white lines and
 * labels, the game's own marble pictures), with sand drawn in warm flat tones. One picture per step.
 * Each is an SVG 1600 px wide; plates.mjs turns them into WebP.
 */
import { C, arrow, badge, label, marble, svg, text, title, yes, nope } from './diagrams.mjs';

// Sand: flat, warm tones (dry, the channel floor, damp, the walls' shade), and water.
const S = { dry: '#E8C27A', light: '#F2D592', floor: '#D9AE63', wet: '#B98A4C', wall: '#C99A55', shade: '#A9783F', water: '#5FB4E6', water2: '#3E8FC4' };

/** A flat sandy slope seen from the side: from (x0, y0) high on the left down to (x1, y1), filled to the bottom. */
const slope = (x0, y0, x1, y1, h, { fill = S.dry } = {}) => `<path d="M${x0} ${y0} L${x1} ${y1} L${x1} ${h} L${x0} ${h} Z" fill="${fill}"/>`
  + `<path d="M${x0} ${y0} L${x1} ${y1}" stroke="${S.light}" stroke-width="6" stroke-linecap="round"/>`;

/**
 * A channel seen from above along a path `d`: the raised walls (a wide band), the floor inside them, and a
 * soft line down the middle; `w`: the floor's width.
 */
const channel = (d, w = 70, { wall = 34, wet = false } = {}) => `<path d="${d}" stroke="${S.shade}" stroke-width="${w + wall * 2 + 8}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>`
  + `<path d="${d}" stroke="${wet ? S.wet : S.wall}" stroke-width="${w + wall * 2}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  + `<path d="${d}" stroke="${wet ? '#C99558' : S.floor}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  + `<path d="${d}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="${w * 0.18}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

/** The channel's cross-section: a U in a block of sand, walls raised above the ground on both sides. */
function section(cx, cy, s = 1, { smooth = true, high = 0, marbles = null, ctx } = {}) {
  const P = (x, y) => `${cx + x * s} ${cy + y * s}`;
  const wallL = 60; const wallR = 60 + high;
  const floor = smooth
    ? `C ${P(-110, 110)} ${P(110, 110)} ${P(110, 0)}`
    : `C ${P(-110, 95)} ${P(-60, 135)} ${P(-30, 96)} C ${P(0, 125)} ${P(40, 90)} ${P(70, 112)} C ${P(110, 95)} ${P(105, 40)} ${P(110, 0)}`;
  let b = `<path d="M${P(-330, 40)} L ${P(-230, 40)} C ${P(-200, 40)} ${P(-190, -wallL)} ${P(-160, -wallL)} C ${P(-130, -wallL)} ${P(-120, -10)} ${P(-110, 0)} ${floor}
    C ${P(120, -10)} ${P(130, -wallR)} ${P(160, -wallR)} C ${P(190, -wallR)} ${P(200, 40)} ${P(230, 40)} L ${P(330, 40)} L ${P(330, 200)} L ${P(-330, 200)} Z" fill="${S.wall}"/>`;
  b += `<path d="M${P(-110, 0)} ${floor}" stroke="${smooth ? S.light : S.shade}" stroke-width="${6 * s}" fill="none"/>`;
  if (marbles && ctx) marbles.forEach((m, k) => { b += marble(ctx, m, cx + (k ? 42 : -42) * s, cy + 52 * s, 80 * s, { shadow: false, topDown: false }); });
  return b;
}

// ── Tools (flat icons) ─────────────────────────────────────────────────────

const spade = (x, y, s = 1, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <rect x="-10" y="-260" width="20" height="230" rx="8" fill="${C.wood}"/>
  <rect x="-44" y="-292" width="88" height="34" rx="14" fill="${C.wood}"/>
  <path d="M-62 -40 L62 -40 L56 40 Q0 96 -56 40 Z" fill="${C.orange}"/>
  <path d="M-62 -40 L62 -40 L60 -20 L-60 -20 Z" fill="#E0660E"/></g>`;
const bucket = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M-110 -120 Q0 -230 110 -120" stroke="${C.soft}" stroke-width="10" fill="none"/>
  <path d="M-120 -120 L120 -120 L95 110 L-95 110 Z" fill="${C.yellow}"/>
  <rect x="-128" y="-134" width="256" height="30" rx="12" fill="#F2C200"/>
  <path d="M-108 -30 L108 -30" stroke="#E5B400" stroke-width="12"/></g>`;
const can = (x, y, s = 1, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <path d="M-120 -90 Q0 -190 120 -90" stroke="${C.orange}" stroke-width="18" fill="none" stroke-linecap="round"/>
  <rect x="-130" y="-100" width="230" height="200" rx="34" fill="${C.orange}"/>
  <path d="M90 40 L250 -110" stroke="${C.orange}" stroke-width="30" stroke-linecap="round"/>
  <rect x="236" y="-148" width="64" height="44" rx="12" fill="#E0660E" transform="rotate(-42 268 -126)"/>
  <rect x="-130" y="-10" width="230" height="20" fill="#E0660E"/></g>`;
const board = (x, y, s = 1, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <rect x="-210" y="-26" width="420" height="52" rx="10" fill="${C.wood}"/>
  ${Array.from({ length: 13 }, (_, k) => `<path d="M${-180 + k * 30} -26 L${-180 + k * 30} ${k % 2 ? -8 : 2}" stroke="#5E4529" stroke-width="5"/>`).join('')}</g>`;
const drops = (x, y, n = 9, spread = 160, len = 180) => Array.from({ length: n }, (_, k) => {
  const dx = (k / (n - 1) - 0.5) * spread; const dy = (k % 3) * 34;
  return `<path d="M${x + dx} ${y + dy} q -6 22 0 30 q 6 -8 0 -30" fill="${S.water}"/><path d="M${x + dx} ${y + dy + 46} l ${-dx * 0.08} ${len * 0.35}" stroke="${S.water}" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`;
}).join('');
/** A stick gate across the start (seen from above): a thin stick lying across the channel. */
const stick = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${C.wood}" stroke-width="16" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="#A88458" stroke-width="5" stroke-linecap="round"/>`;
const flag = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-5" y="-150" width="10" height="160" fill="${C.chalk}"/>
  ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => `<rect x="${5 + c * 18}" y="${-150 + r * 18}" width="18" height="18" fill="${(r + c) % 2 ? C.ink : C.chalk}"/>`).join('')).join('')}</g>`;

/** On sand the words are navy (yellow and white don't read on it); the accent is a deep orange. */
const ON = { color: C.ink, subColor: '#5A4528' };
const ON_ACCENT = { color: '#A8400A', subColor: '#5A4528' };
const BG = (w, h) => `<rect width="${w}" height="${h}" fill="${C.card}"/>`;
const LOOKS = ['cats-eye', 'corkscrew', 'oxblood', 'clearie', 'aggie', 'clay-blue'];

export const SAND = {
  /** The whole track from above: the start at the top, bends, the splitter, the finish pit. */
  header: (ctx) => {
    const d = 'M260 150 L520 150 C 760 150 820 330 640 400 C 460 470 420 640 640 690 L 1000 700';
    let b = BG(1600, 900) + `<rect width="1600" height="900" fill="${S.dry}"/><rect width="1600" height="900" fill="url(#grain)"/>`;
    b += channel(d, 66);
    // The splitter round a mound, then the merge into the finish pit.
    b += channel('M1000 700 C 1100 700 1130 600 1240 600 C 1320 600 1330 690 1420 700', 54);
    b += channel('M1000 700 C 1100 700 1130 800 1240 800 C 1320 800 1330 710 1420 700', 54);
    b += `<ellipse cx="1240" cy="700" rx="110" ry="62" fill="${S.wall}"/><ellipse cx="1230" cy="688" rx="80" ry="40" fill="${S.light}" opacity="0.6"/>`;
    b += `<circle cx="1470" cy="700" r="70" fill="${S.shade}"/><circle cx="1470" cy="700" r="56" fill="${S.wet}"/>`;
    b += `<rect x="150" y="96" width="150" height="108" rx="18" fill="${S.wall}"/><rect x="164" y="110" width="122" height="80" rx="12" fill="${S.light}"/>`;
    b += stick(300, 112, 300, 188);
    [[700, 280], [610, 420], [520, 520], [820, 690], [1180, 600], [1250, 800]].forEach(([x, y], k) => { b += marble(ctx, LOOKS[k], x, y, 50); });
    return svg(1600, 900, b);
  },

  needs: (ctx) => {
    let b = BG(1600, 820) + title('What you need');
    b += spade(170, 640, 0.95, -8) + label(170, 728, 'Spade', { anchor: 'middle', size: 32, sub: 'or a small shovel' });
    b += bucket(480, 560, 0.85) + label(480, 728, 'Bucket', { anchor: 'middle', size: 32, sub: 'for water' });
    b += can(770, 570, 0.62, 0) + label(800, 728, 'Watering can', { anchor: 'middle', size: 32, sub: 'or the bucket' });
    b += board(1130, 520, 0.55, -12) + label(1130, 728, 'Something flat', { anchor: 'middle', size: 32, sub: 'wood, ruler or hand' });
    b += marble(ctx, 'cats-eye', 1420, 480, 86, { topDown: false }) + marble(ctx, 'corkscrew', 1490, 550, 78, { topDown: false }) + marble(ctx, 'oxblood', 1390, 575, 74, { topDown: false });
    b += label(1440, 728, 'Marbles', { anchor: 'middle', size: 32, sub: 'one each' });
    return svg(1600, 820, b);
  },

  spot: () => {
    let b = BG(1600, 820) + title('Pick a sandy slope');
    b += slope(80, 300, 1520, 640, 820);
    b += `<path d="M80 300 L1520 640 L1520 690 L80 350 Z" fill="${S.wet}" opacity="0.55"/>`;
    b += arrow(260, 260, 1340, 520, { color: C.yellow, width: 8 });
    b += label(700, 300, 'The longer, the more fun', { size: 36, color: C.yellow });
    b += label(240, 560, 'Damp sand', { size: 40, sub: 'holds its shape best', ...ON });
    b += label(900, 740, 'No beach needed', { size: 34, sub: 'any sandy slope works', ...ON });
    return svg(1600, 820, b);
  },

  dig: (ctx) => {
    let b = BG(1600, 860) + title('Dig the channel');
    b += section(560, 470, 1.6, { marbles: ['cats-eye', 'corkscrew'], ctx });
    b += `<path d="M${560 - 160 * 1.6} ${470 - 60 * 1.6 - 30} L ${560 - 160 * 1.6} ${470 - 60 * 1.6 - 90}" stroke="${C.yellow}" stroke-width="0"/>`;
    b += label(560 - 280, 300, 'Raised walls', { size: 32, color: C.yellow, anchor: 'middle' }) + arrow(560 - 280, 320, 560 - 260, 370, { width: 6 });
    b += label(560 + 280, 300, 'on both sides', { size: 32, color: C.yellow, anchor: 'middle' }) + arrow(560 + 280, 320, 560 + 260, 370, { width: 6 });
    // Two marbles wide.
    b += `<path d="M${560 - 176} 712 L${560 + 176} 712" stroke="${C.yellow}" stroke-width="5"/><path d="M${560 - 176} 696 L${560 - 176} 728 M${560 + 176} 696 L${560 + 176} 728" stroke="${C.yellow}" stroke-width="5"/>`;
    b += text(560, 780, 'About two marbles wide', { anchor: 'middle', color: C.chalk, size: 30 });
    b += spade(1260, 650, 1.05, 24) + `<path d="M1150 690 q 50 -40 120 -10" stroke="${S.wall}" stroke-width="40" stroke-linecap="round" fill="none"/>`;
    b += text(1200, 790, 'Pile the dug sand along the edges', { anchor: 'middle', size: 22 });
    return svg(1600, 860, b);
  },

  water: () => {
    let b = BG(1600, 860) + title('Water it');
    b += section(800, 560, 1.7);
    b += `<path d="M${800 - 330 * 1.7} ${560 + 40 * 1.7} L ${800 + 330 * 1.7} ${560 + 40 * 1.7}" stroke="${S.wet}" stroke-width="0"/>`;
    b += `<path d="M${800 - 190} 548 C 760 610 840 610 990 548" stroke="${S.water}" stroke-width="10" fill="none" opacity="0.6"/>`;
    b += can(560, 220, 0.85, 22) + drops(840, 260, 9, 230, 160);
    b += label(1060, 250, 'Wet floor and walls', { size: 32, color: C.chalk });
    b += label(1060, 330, 'Wait a minute', { size: 32, color: C.yellow, sub: 'so the sand settles and sticks' });
    return svg(1600, 860, b);
  },

  smooth: () => {
    let b = BG(1600, 860) + title('Flatten and smooth');
    b += section(420, 520, 1.15, { smooth: false });
    b += nope(420, 300);
    b += label(420, 760, 'Bumpy', { anchor: 'middle', size: 32, sub: 'marbles jump out' });
    b += section(1180, 520, 1.15, { smooth: true });
    b += yes(1180, 300);
    b += label(1180, 760, 'Smooth', { anchor: 'middle', size: 32, sub: 'marbles roll' });
    b += board(1180, 470, 0.45, 0) + arrow(1100, 420, 1260, 420, { width: 6, color: C.orange });
    b += arrow(700, 520, 880, 520, { width: 9 });
    return svg(1600, 860, b);
  },

  start: (ctx) => {
    let b = BG(1600, 860) + title('Build the start');
    b += slope(60, 300, 1540, 620, 860);
    // The raised platform, then the straight run-in.
    b += `<path d="M120 290 L460 290 L460 352 L120 352 Z" fill="${S.wall}"/><path d="M120 290 L460 290" stroke="${S.light}" stroke-width="8"/>`;
    b += `<path d="M460 300 L1100 440" stroke="${S.floor}" stroke-width="40" stroke-linecap="round"/><path d="M460 300 L1100 440" stroke="${S.light}" stroke-width="8" opacity="0.7"/>`;
    b += stick(460, 250, 460, 330);
    [190, 260, 330, 400].forEach((x, k) => { b += marble(ctx, LOOKS[k], x, 260, 58, { topDown: false, shadow: false }); });
    b += label(130, 470, 'Raised platform', { size: 32, sub: 'all marbles side by side', ...ON_ACCENT });
    b += label(700, 290, 'Straight run-in', { size: 32, color: C.yellow, sub: 'a fair start for everyone' });
    b += label(470, 210, 'Lift the stick: go!', { size: 28, color: C.chalk });
    return svg(1600, 860, b);
  },

  bend: (ctx) => {
    let b = BG(1600, 900) + title('Bank the bends') + `<rect x="0" y="130" width="980" height="770" fill="${S.dry}"/>`;
    const d = 'M120 300 L420 300 C 760 300 760 720 420 720 L 140 720';
    b += `<path d="${d}" stroke="${S.shade}" stroke-width="210" fill="none" stroke-linecap="round" opacity="0.6"/>`;
    b += `<path d="${d}" stroke="${S.wall}" stroke-width="200" fill="none" stroke-linecap="round"/>`;
    // The outside wall higher: a thicker, lighter band on the outside of the bend.
    b += `<path d="M420 230 C 850 230 850 790 420 790" stroke="${S.light}" stroke-width="44" fill="none" stroke-linecap="round"/>`;
    b += `<path d="${d}" stroke="${S.floor}" stroke-width="80" fill="none" stroke-linecap="round"/>`;
    b += arrow(200, 300, 620, 380, { dash: '2 18', width: 7, via: [600, 290] }) + marble(ctx, 'cats-eye', 660, 470, 64);
    b += label(40, 200, 'Outside wall higher', { size: 30, ...ON_ACCENT });
    // Cross-section of the bend: the outside wall raised.
    b += `<rect x="1010" y="130" width="590" height="770" fill="${C.card}"/>`;
    b += section(1300, 560, 1.1, { high: 90, marbles: ['cats-eye'], ctx });
    b += label(1300, 360, 'Cut across the bend', { size: 28, anchor: 'middle' });
    b += label(1300 + 180, 395, 'Outside', { size: 26, color: C.yellow, anchor: 'middle' }) + label(1300 - 180, 470, 'Inside', { size: 26, anchor: 'middle' });
    return svg(1600, 900, b);
  },

  splitter: (ctx) => {
    let b = BG(1600, 900) + title('Build a splitter') + `<rect x="0" y="130" width="1600" height="770" fill="${S.dry}"/>`;
    b += channel('M120 520 L 420 520', 66);
    b += channel('M420 520 C 560 520 600 330 800 330 C 1000 330 1040 520 1180 520', 58);
    b += channel('M420 520 C 560 520 600 710 800 710 C 1000 710 1040 520 1180 520', 58);
    b += channel('M1180 520 L 1500 520', 66);
    b += `<ellipse cx="800" cy="520" rx="230" ry="120" fill="${S.wall}"/><ellipse cx="785" cy="500" rx="160" ry="70" fill="${S.light}" opacity="0.6"/>`;
    b += label(800, 530, 'Mound', { size: 30, anchor: 'middle', color: C.ink });
    b += marble(ctx, 'corkscrew', 680, 380, 50) + marble(ctx, 'oxblood', 690, 660, 50) + marble(ctx, 'clearie', 300, 520, 50);
    b += label(800, 215, 'Same length, same slope', { size: 32, anchor: 'middle', sub: 'or one side always wins', ...ON_ACCENT });
    b += label(400, 820, 'Split', { size: 30, anchor: 'middle', ...ON }) + label(1200, 820, 'Merge', { size: 30, anchor: 'middle', ...ON });
    return svg(1600, 900, b);
  },

  finish: (ctx) => {
    let b = BG(1600, 860) + title('The finish') + `<rect x="0" y="130" width="1600" height="730" fill="${S.dry}"/>`;
    b += channel('M100 480 L 1000 480', 66);
    b += `<ellipse cx="1220" cy="500" rx="250" ry="190" fill="${S.shade}"/><ellipse cx="1220" cy="500" rx="210" ry="155" fill="${S.wet}"/>`;
    b += `<path d="M1000 380 L1000 580" stroke="${C.chalk}" stroke-width="12" stroke-dasharray="24 16"/>` + flag(1000, 360, 0.9);
    b += marble(ctx, 'cats-eye', 1200, 480, 60) + marble(ctx, 'corkscrew', 880, 480, 56) + marble(ctx, 'oxblood', 700, 470, 56);
    b += label(1220, 760, 'Finish pit', { size: 32, anchor: 'middle', sub: 'catches the marbles', ...ON_ACCENT });
    b += label(960, 300, 'Finish line', { size: 30, anchor: 'end', ...ON });
    return svg(1600, 860, b);
  },

  race: (ctx) => {
    let b = BG(1600, 900) + title('Race!') + `<rect x="0" y="130" width="1600" height="770" fill="${S.dry}"/>`;
    const d = 'M220 230 L520 230 C 820 230 860 460 640 520 C 420 580 420 790 700 790 L 1340 790';
    b += channel(d, 66);
    b += `<rect x="110" y="180" width="150" height="100" rx="18" fill="${S.wall}"/>`;
    b += `<circle cx="1420" cy="790" r="68" fill="${S.shade}"/><circle cx="1420" cy="790" r="54" fill="${S.wet}"/>`;
    [[760, 300, 'cats-eye'], [720, 360, 'corkscrew'], [560, 560, 'oxblood'], [500, 650, 'clearie']].forEach(([x, y, m]) => { b += marble(ctx, m, x, y, 52); });
    [[1, 860, 260], [2, 820, 390], [3, 470, 600], [4, 440, 690]].forEach(([n, x, y]) => { b += badge(x, y, n, { r: 22 }); });
    b += label(960, 300, 'Everyone picks a marble', { size: 30, ...ON });
    b += label(960, 380, 'All start together', { size: 30, ...ON });
    b += label(960, 460, 'First in the pit wins', { size: 30, ...ON_ACCENT });
    b += label(960, 560, 'Then build it longer', { size: 26, sub: 'and add more bends', ...ON });
    return svg(1600, 900, b);
  },
};
