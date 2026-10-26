/**
 * The marbles hub's diagrams and illustrations (Moses, 26 Oct 2026): the game rules as clear, labelled
 * top-down diagrams, and the history and making articles as illustrations in the game's style, clearly
 * drawings (never made to pass for old photos). One shared look: the site's dark colours, chalk-white
 * lines, yellow for what to notice, the site's fonts, and the game's own marble pictures (marbles.mjs)
 * wherever a marble appears.
 *
 * Each picture is an SVG of 1600 px wide; `plates.mjs` turns it into WebP and the share picture.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ── The shared look ────────────────────────────────────────────────────────

export const C = {
  chalk: '#E8ECF4', soft: '#C7CEDC', muted: '#A9B1C3', yellow: '#FFD21F', orange: '#FF7A1A', red: '#E5322D', green: '#3DDC97',
  ground: '#2A3349', ground2: '#222A3F', card: '#1A2133', ink: '#0E1320', hand: '#B9C3D6', handLine: '#7D889E', wood: '#8A6A44', glow: '#FF9A3C',
};
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** A label: big condensed capitals (and an optional smaller line under it). anchor: start | middle | end. */
export function label(x, y, text, { size = 40, anchor = 'start', color = C.chalk, sub = null, subColor = C.muted } = {}) {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Barlow Condensed" font-weight="800" font-size="${size}" letter-spacing="1" text-anchor="${anchor}">${esc(String(text).toUpperCase())}</text>`
    + (sub ? `<text x="${x}" y="${y + size * 0.9}" fill="${subColor}" font-family="Source Sans 3" font-size="${Math.round(size * 0.68)}" text-anchor="${anchor}">${esc(sub)}</text>` : '');
}
/** A plain line of text. */
export const text = (x, y, t, { size = 30, anchor = 'start', color = C.soft, weight = 400 } = {}) =>
  `<text x="${x}" y="${y}" fill="${color}" font-family="Source Sans 3" font-weight="${weight}" font-size="${size}" text-anchor="${anchor}">${esc(t)}</text>`;
/** A title across the top left. */
export const title = (t, { x = 70, y = 92, size = 54 } = {}) => label(x, y, t, { size });

/** A marble (one of marbles.mjs's pictures) of diameter d centred at x, y, with a soft shadow (top-down: just below right). */
export function marble(ctx, img, x, y, d, { shadow = true, topDown = true } = {}) {
  const href = pathToFileURL(path.join(ctx.dir, `${img}.png`)).href;
  const sh = shadow ? (topDown
    ? `<ellipse cx="${x + d * 0.12}" cy="${y + d * 0.14}" rx="${d * 0.5}" ry="${d * 0.46}" fill="url(#shadow)"/>`
    : `<ellipse cx="${x}" cy="${y + d * 0.5}" rx="${d * 0.42}" ry="${d * 0.08}" fill="url(#shadow)"/>`) : '';
  return `${sh}<image href="${href}" x="${x - d / 2}" y="${y - d / 2}" width="${d}" height="${d}"/>`;
}
/** An arrow from (x1, y1) to (x2, y2), optionally curved through (cx, cy); dashed for a path a marble rolls. */
export function arrow(x1, y1, x2, y2, { color = C.yellow, width = 6, dash = null, via = null, head = 22 } = {}) {
  const d = via ? `M${x1} ${y1} Q${via[0]} ${via[1]} ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`;
  const [fx, fy] = via ?? [x1, y1];
  const a = Math.atan2(y2 - fy, x2 - fx);
  const p1 = [x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)];
  const p2 = [x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45)];
  return `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`
    + `<path d="M${p1[0]} ${p1[1]} L${x2} ${y2} L${p2[0]} ${p2[1]}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}
/** A dimension line with end ticks and its measure written beside it. */
export function dim(x1, y1, x2, y2, t, { color = C.yellow, side = -1, size = 34 } = {}) {
  const a = Math.atan2(y2 - y1, x2 - x1); const nx = -Math.sin(a) * 16; const ny = Math.cos(a) * 16;
  const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
  const tx = mx + side * -Math.sin(a) * 34; const ty = my + side * Math.cos(a) * 34 + size * 0.35;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="4"/>`
    + `<line x1="${x1 - nx}" y1="${y1 - ny}" x2="${x1 + nx}" y2="${y1 + ny}" stroke="${color}" stroke-width="4"/>`
    + `<line x1="${x2 - nx}" y1="${y2 - ny}" x2="${x2 + nx}" y2="${y2 + ny}" stroke="${color}" stroke-width="4"/>`
    + `<text x="${tx}" y="${ty}" fill="${color}" font-family="Barlow Condensed" font-weight="800" font-size="${size}" text-anchor="middle">${esc(t)}</text>`;
}
/** A numbered step badge. */
export const badge = (x, y, n, { r = 26 } = {}) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.yellow}"/><text x="${x}" y="${y + r * 0.42}" fill="${C.ink}" font-family="Barlow Condensed" font-weight="800" font-size="${r * 1.25}" text-anchor="middle">${n}</text>`;
/** A cross for "not allowed". */
export const nope = (x, y, s = 30) => `<path d="M${x - s} ${y - s} L${x + s} ${y + s} M${x + s} ${y - s} L${x - s} ${y + s}" stroke="${C.red}" stroke-width="9" stroke-linecap="round"/>`;
/** A tick for "right". */
export const yes = (x, y, s = 30) => `<path d="M${x - s} ${y} L${x - s * 0.3} ${y + s * 0.7} L${x + s} ${y - s * 0.8}" stroke="${C.green}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Shared gradients: shadows, the pavement, hot glass. */
const DEFS = `<defs>
  <radialGradient id="shadow"><stop offset="0.3" stop-color="#000" stop-opacity="0.5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <radialGradient id="slab" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#3A4560"/><stop offset="1" stop-color="#2A3349"/></radialGradient>
  <radialGradient id="dirt" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#6E5A44"/><stop offset="1" stop-color="#4E3F31"/></radialGradient>
  <linearGradient id="hot" x1="0" x2="1"><stop offset="0" stop-color="#FFE7A0"/><stop offset="0.5" stop-color="#FF9A3C"/><stop offset="1" stop-color="#C8401A"/></linearGradient>
  <linearGradient id="steel" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#DCE3EC"/><stop offset="0.5" stop-color="#8A95A8"/><stop offset="1" stop-color="#4A5466"/></linearGradient>
  <linearGradient id="lehr" x1="0" x2="1"><stop offset="0" stop-color="#FF7A1A"/><stop offset="0.45" stop-color="#C8401A"/><stop offset="1" stop-color="#2A3349"/></linearGradient>
  <pattern id="grain" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1.2" fill="#ffffff" opacity="0.05"/><circle cx="10" cy="11" r="1" fill="#000" opacity="0.12"/></pattern>
</defs>`;

/** A whole picture: w × h, the background, then `body`, and the "Illustration" mark (unless it's a diagram: `mark`). */
export const svg = (w, h, body, { mark = 'Illustration' } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}${body}
  ${mark ? `<text x="${w - 26}" y="${h - 22}" fill="${C.muted}" fill-opacity="0.75" font-family="Barlow Condensed" font-weight="700" font-size="26" letter-spacing="3" text-anchor="end">${mark.toUpperCase()}</text>` : ''}</svg>`;

/** A chalk ring on the ground (top-down), centre cx, cy, radius r. */
const ring = (cx, cy, r, { width = 7 } = {}) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.chalk}" stroke-width="${width}" stroke-opacity="0.92"/>`;

/**
 * A hand knuckling down, seen from the side (the thumb's side), shooting to the right: the knuckles of
 * the curled fingers on the ground, the marble in the bend of the index finger, the thumb tucked behind
 * it. (x, y): where the knuckles touch the ground; s: scale (1 ≈ 320 px long).
 */
function hand(x, y, s = 1, { color = C.hand, line = C.handLine } = {}) {
  // An icon-like hand, from simple rounded shapes: the forearm coming down from the upper left, the
  // back of the fist, the curled fingers along the ground (their knuckles touching it), the index
  // finger curled forward under the marble, and the thumb on top, its tip tucked behind the marble.
  const P = (px, py) => `${x + px * s} ${y + py * s}`;
  const rr = (x0, y0, x1, y1, r, rot = 0) => `<rect x="${x + x0 * s}" y="${y + y0 * s}" width="${(x1 - x0) * s}" height="${(y1 - y0) * s}" rx="${r * s}" transform="rotate(${rot} ${x + ((x0 + x1) / 2) * s} ${y + ((y0 + y1) / 2) * s})"/>`;
  return `<g fill="${color}" stroke="${line}" stroke-width="${5 * s}" stroke-linejoin="round">
    <path d="M${P(-360, -300)} L ${P(-230, -235)} L ${P(-190, -150)} L ${P(-330, -215)} Z"/>
    <path d="M${P(-250, -230)} C ${P(-170, -260)} ${P(-40, -230)} ${P(20, -170)} C ${P(60, -130)} ${P(70, -80)} ${P(50, -50)} L ${P(-160, -50)} C ${P(-220, -80)} ${P(-260, -150)} ${P(-250, -230)} Z"/>
    ${rr(-170, -62, 36, 0, 30)}
    <path fill="none" d="M${P(-100, -60)} L ${P(-100, -6)} M${P(-35, -60)} L ${P(-35, -6)}"/>
    ${rr(10, -96, 116, -44, 26)}
    ${rr(-40, -168, 96, -124, 22, 14)}
  </g>`;
}

// ── How to play marbles ────────────────────────────────────────────────────

/** A top-down patch of ground (pavement), as the diagrams' floor. */
const slab = (x, y, w, h, r = 28) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#slab)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#grain)"/>`;

/** The ring game's set-up from above: chalk ring, marbles in the middle, a shooter at the edge. (Shared by headers.) */
function ringScene(ctx, cx, cy, r, { shooter = 'cats-eye', aim = true } = {}) {
  const targets = [];
  const bits = [[0, 0], [-0.13, -0.08], [0.12, -0.1], [-0.05, 0.14], [0.16, 0.08], [-0.17, 0.1], [0.04, -0.2], [0.22, -0.02], [-0.24, -0.06]];
  const looks = ['clearie', 'corkscrew', 'clay-tan', 'oxblood', 'aggie', 'clay-blue', 'moonie', 'china', 'clearie'];
  bits.forEach(([u, v], i) => targets.push(marble(ctx, looks[i], cx + u * r * 1.25, cy + v * r * 1.25, r * 0.13)));
  const sx = cx - r * 1.15; const sy = cy + r * 0.62;
  return ring(cx, cy, r) + targets.join('') + marble(ctx, shooter, sx, sy, r * 0.17)
    + (aim ? arrow(sx + r * 0.08, sy - r * 0.05, cx - r * 0.2, cy + r * 0.06, { dash: '2 18', width: 7 }) : '');
}

export const PLAY = {
  header: (ctx) => svg(1600, 900, `${slab(0, 0, 1600, 900, 0)}${ringScene(ctx, 900, 450, 330)}`),

  needs: (ctx) => {
    let b = title('What you need');
    b += marble(ctx, 'clearie', 270, 380, 120, { topDown: false }) + marble(ctx, 'corkscrew', 400, 400, 110, { topDown: false }) + marble(ctx, 'clay-tan', 330, 500, 105, { topDown: false })
      + marble(ctx, 'oxblood', 200, 520, 100, { topDown: false });
    b += label(300, 650, 'Target marbles', { anchor: 'middle', sub: 'any small marbles · 16 mm in tournaments' });
    b += marble(ctx, 'cats-eye', 800, 450, 170, { topDown: false });
    b += label(800, 650, 'A shooter', { anchor: 'middle', sub: 'a little bigger · glass or stone' });
    // Chalk and string.
    b += `<g transform="rotate(-18 1270 430)"><rect x="1180" y="410" width="190" height="44" rx="10" fill="${C.chalk}"/><rect x="1180" y="410" width="40" height="44" rx="10" fill="#C9D0DE"/></g>`;
    b += `<path d="M1150 520 C 1230 470 1330 560 1400 500 C 1440 470 1460 520 1420 545" stroke="#E8C88A" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    b += label(1290, 650, 'Chalk or string', { anchor: 'middle', sub: 'to mark the ring' });
    return svg(1600, 800, b);
  },

  knuckle: (ctx) => {
    let b = title('Knuckling down');
    const gy = 640;
    b += `<rect x="0" y="${gy}" width="1600" height="${900 - gy}" fill="url(#slab)"/><line x1="0" y1="${gy}" x2="1600" y2="${gy}" stroke="${C.chalk}" stroke-width="3" stroke-opacity="0.4"/>`;
    b += hand(640, gy, 1.25);
    // The marble in the bend of the index finger, the thumb behind it.
    b += marble(ctx, 'cats-eye', 640 + 168, gy - 128, 72, { shadow: false });
    b += arrow(880, gy - 128, 1100, gy - 128, { width: 8 });
    b += label(1120, gy - 116, 'Flick', { sub: 'the thumb shoots it off' });
    // Callouts.
    b += `<ellipse cx="${640 - 80}" cy="${gy - 2}" rx="120" ry="20" stroke="${C.yellow}" stroke-width="5" fill="none"/>` + `<path d="M${640 - 80} ${gy + 20} L 540 ${gy + 110}" stroke="${C.yellow}" stroke-width="5"/>`;
    b += label(380, gy + 150, 'Knuckles on the ground', { color: C.yellow });
    b += `<path d="M${640 + 100} ${gy - 80} L 880 ${gy + 40}" stroke="${C.yellow}" stroke-width="5"/>`;
    b += label(890, gy + 70, 'Index finger curled under it', { color: C.yellow, size: 36 });
    b += `<path d="M${640 + 120} ${gy - 210} L 860 ${gy - 330}" stroke="${C.yellow}" stroke-width="5"/>`;
    b += label(870, gy - 340, 'Thumb tucked behind the marble', { color: C.yellow, size: 36 });
    return svg(1600, 900, b);
  },

  hunching: (ctx) => {
    let b = title('Keep your hand still');
    const gy = 600;
    b += `<rect x="0" y="${gy}" width="1600" height="${900 - gy}" fill="url(#slab)"/>`;
    // Left: right (hand still); right: hunching (hand pushed forward).
    b += hand(330, gy, 0.85) + marble(ctx, 'cats-eye', 330 + 143, gy - 109, 58, { shadow: false }) + arrow(520, gy - 109, 700, gy - 109, { width: 7 });
    b += yes(250, 190) + label(300, 205, 'Right', { sub: 'only the thumb moves' });
    b += `<line x1="800" y1="150" x2="800" y2="${gy - 20}" stroke="${C.border ?? '#2A3349'}" stroke-width="3"/>`;
    b += `<g opacity="0.3">${hand(1060, gy, 0.85)}</g>` + hand(1180, gy, 0.85) + marble(ctx, 'cats-eye', 1180 + 143, gy - 109, 58, { shadow: false });
    b += arrow(1000, gy + 60, 1170, gy + 60, { color: C.red, width: 7 });
    b += nope(950, 190) + label(1000, 205, 'Hunching', { sub: 'pushing the hand forward: a foul', color: C.chalk });
    b += text(1030, gy + 140, 'In Britain the same foul is called fudging.', { size: 30, color: C.muted });
    return svg(1600, 900, b, { mark: 'Diagram' });
  },

  lagging: (ctx) => {
    let b = title('Lagging: who goes first');
    b += slab(80, 160, 1440, 640);
    b += `<line x1="1260" y1="200" x2="1260" y2="760" stroke="${C.chalk}" stroke-width="7"/>` + label(1280, 220, 'The line');
    b += label(150, 300, 'Player 1') + label(150, 640, 'Player 2');
    b += arrow(320, 300, 1180, 330, { dash: '2 18', via: [760, 230], width: 7 }) + marble(ctx, 'cats-eye', 1215, 335, 54);
    b += arrow(320, 640, 1060, 600, { dash: '2 18', via: [700, 560], color: C.soft, width: 7 }) + marble(ctx, 'aggie', 1090, 598, 54);
    b += text(1170, 410, 'Closest: goes first', { size: 32, color: C.yellow, anchor: 'end', weight: 600 });
    return svg(1600, 900, b, { mark: 'Diagram' });
  },

  ringGame: (ctx) => {
    let b = title('A simple ring game');
    const cx = 760; const cy = 500; const r = 330;
    b += slab(0, 0, 1600, 1000, 0) + title('A simple ring game');
    b += ring(cx, cy, r);
    const looks = ['clearie', 'corkscrew', 'clay-tan', 'oxblood', 'clay-blue', 'moonie'];
    const at = [[-0.1, -0.05], [0.12, -0.12], [0.05, 0.12], [0.2, 0.06], [-0.15, 0.15], [0.32, -0.02]];
    at.forEach(([u, v], i) => { if (i !== 5) b += marble(ctx, looks[i], cx + u * r, cy + v * r, 34); });
    // The shot: from outside the ring, knocking one marble out; the shooter stops inside.
    const sx = cx - r - 60; const sy = cy + 140;
    b += badge(sx - 40, sy - 70, 1) + marble(ctx, 'cats-eye', sx, sy, 44);
    b += arrow(sx + 24, sy - 10, cx + 0.3 * r - 20, cy - 0.02 * r + 6, { dash: '2 16', width: 6 });
    b += marble(ctx, 'moonie', cx + r + 70, cy - 70, 34) + arrow(cx + 0.36 * r, cy - 0.04 * r, cx + r + 46, cy - 64, { dash: '2 16', color: C.chalk, width: 5, head: 16 });
    b += badge(cx + r + 70, cy - 140, 2) + label(cx + r + 110, cy - 128, 'Knocked out', { sub: 'yours' });
    b += marble(ctx, 'cats-eye', cx + 0.22 * r, cy + 0.02 * r + 40, 44) + `<circle cx="${cx + 0.22 * r}" cy="${cy + 0.02 * r + 40}" r="34" stroke="${C.yellow}" stroke-width="5" fill="none" stroke-dasharray="10 8"/>`;
    b += badge(cx + 0.22 * r + 60, cy + 150, 3) + label(cx + r + 110, cy + 120, 'Still inside?', { sub: 'shoot again from here' });
    b += `<path d="M${cx + 0.22 * r + 30} ${cy + 0.02 * r + 60} L ${cx + r + 100} ${cy + 115}" stroke="${C.yellow}" stroke-width="4" stroke-dasharray="6 8"/>`;
    b += label(sx - 60, sy + 110, 'Shoot from', { sub: 'outside the ring' });
    return svg(1600, 1000, b, { mark: 'Diagram' });
  },

  conqueror: (ctx) => {
    let b = title('Conqueror');
    b += slab(60, 150, 1480, 690);
    // 1: a marble tossed out; 2: the next player shoots at it. Then: hit, captured; miss, the new target.
    b += marble(ctx, 'corkscrew', 560, 360, 60) + badge(640, 330, 1) + label(680, 345, 'Toss a marble', { sub: 'onto the ground' });
    b += marble(ctx, 'cats-eye', 230, 700, 60) + arrow(262, 676, 528, 392, { dash: '2 16', width: 6 }) + badge(150, 620, 2) + label(300, 740, 'Next player shoots at it');
    b += `<line x1="930" y1="200" x2="930" y2="800" stroke="#3A4560" stroke-width="3"/>`;
    b += yes(1010, 360) + label(1060, 375, 'Hit', { sub: 'the marble is yours' }) + text(1060, 450, 'Put down a new one to start again.', { size: 28, color: C.muted });
    b += nope(1010, 610) + label(1060, 625, 'Miss', { sub: 'your marble stays where it stopped' }) + text(1060, 700, 'It is the next target.', { size: 28, color: C.muted });
    return svg(1600, 900, b, { mark: 'Diagram' });
  },

  hundreds: (ctx) => {
    let b = title('Hundreds');
    b += slab(60, 150, 1480, 690);
    const cx = 1050; const cy = 490;
    b += ring(cx, cy, 120);
    b += label(cx, cy - 160, 'Small circle', { anchor: 'middle' });
    b += marble(ctx, 'cats-eye', 260, 400, 54) + marble(ctx, 'aggie', 260, 600, 54) + label(180, 300, 'Two players');
    b += arrow(290, 400, cx - 30, cy - 20, { dash: '2 16', via: [650, 320], width: 6 }) + marble(ctx, 'cats-eye', cx - 10, cy - 10, 54);
    b += arrow(290, 600, cx - 220, cy + 140, { dash: '2 16', via: [600, 680], color: C.soft, width: 6 }) + marble(ctx, 'aggie', cx - 200, cy + 150, 54);
    b += label(cx + 170, cy - 20, '+10 points', { color: C.yellow, sub: 'only one inside: shoot again' });
    b += text(cx + 170, cy + 80, 'First to 100 wins.', { size: 32, color: C.chalk, weight: 600 });
    return svg(1600, 900, b, { mark: 'Diagram' });
  },
};

// ── Ringer ─────────────────────────────────────────────────────────────────

/** The 13 marbles in a cross: centre, then three along each arm, `step` px apart, arms at `angle`. */
function cross(ctx, cx, cy, step, d, angle = 45) {
  const out = [];
  const a0 = (angle * Math.PI) / 180;
  out.push([cx, cy]);
  for (let arm = 0; arm < 4; arm += 1) {
    const a = a0 + (arm * Math.PI) / 2;
    for (let k = 1; k <= 3; k += 1) out.push([cx + Math.cos(a) * step * k, cy + Math.sin(a) * step * k]);
  }
  return out.map(([x, y]) => marble(ctx, 'clearie', x, y, d)).join('');
}

export const RINGER = {
  header: (ctx) => {
    const cx = 800; const cy = 450; const r = 330; const half = 400;
    const court = `<rect x="${cx - half - 16}" y="${cy - half - 16}" width="${2 * half + 32}" height="${2 * half + 32}" rx="8" fill="${C.wood}"/><rect x="${cx - half}" y="${cy - half}" width="${2 * half}" height="${2 * half}" fill="url(#slab)"/><rect x="${cx - half}" y="${cy - half}" width="${2 * half}" height="${2 * half}" fill="url(#grain)"/>`;
    return svg(1600, 900, `${court}${ring(cx, cy, r)}${cross(ctx, cx, cy, 62, 40)}${marble(ctx, 'cats-eye', cx - r - 30, cy + 220, 56)}`);
  },

  court: (ctx) => {
    // To scale: 12 ft square (70 px a foot), the 10 ft circle, the centre mark, two lag lines.
    const ft = 66; const w = 1600; const h = 1060;
    const cx = 640; const cy = 560; const half = 6 * ft; const r = 5 * ft;
    let b = title('The Ringer court');
    b += `<rect x="${cx - half - 14}" y="${cy - half - 14}" width="${2 * half + 28}" height="${2 * half + 28}" rx="6" fill="${C.wood}"/>`;
    b += `<rect x="${cx - half}" y="${cy - half}" width="${2 * half}" height="${2 * half}" fill="url(#slab)"/><rect x="${cx - half}" y="${cy - half}" width="${2 * half}" height="${2 * half}" fill="url(#grain)"/>`;
    b += ring(cx, cy, r);
    b += `<circle cx="${cx}" cy="${cy}" r="7" fill="${C.chalk}"/>`;
    // Lag lines: touching the circle at two opposite sides, parallel to the border.
    b += `<line x1="${cx - half}" y1="${cy - r}" x2="${cx + half}" y2="${cy - r}" stroke="${C.yellow}" stroke-width="5"/><line x1="${cx - half}" y1="${cy + r}" x2="${cx + half}" y2="${cy + r}" stroke="${C.yellow}" stroke-width="5"/>`;
    b += cross(ctx, cx, cy, 0.25 * ft * 1, 0.052 * ft * 4);
    b += dim(cx - r, cy + 80, cx + r, cy + 80, '10 ft circle', { side: 1 });
    b += dim(cx - half, cy + half + 50, cx + half, cy + half + 50, '12 ft square', { side: 1 });
    b += `<path d="M${cx + half + 20} ${cy - r} L ${cx + half + 120} ${cy - r - 60}" stroke="${C.yellow}" stroke-width="4"/>` + label(cx + half + 130, cy - r - 60, 'Lag lines', { color: C.yellow, sub: 'touch the circle' });
    b += `<path d="M${cx + half + 10} ${cy + half - 30} L ${cx + half + 120} ${cy + half - 90}" stroke="${C.wood}" stroke-width="4"/>` + label(cx + half + 130, cy + half - 90, 'Raised border', { sub: 'wood, 1–2 in high' });
    b += `<path d="M${cx + 10} ${cy - 6} L ${cx + half + 120} ${cy - 40}" stroke="${C.chalk}" stroke-width="3" stroke-dasharray="6 8"/>` + label(cx + half + 130, cy - 30, 'Centre mark', { sub: 'the 13 marbles go here' });
    return svg(w, h, b, { mark: 'Diagram' });
  },

  rack: (ctx) => {
    // To scale: 3 in apart centre to centre (150 px), 5/8 in marbles (31 px).
    const step = 150; const d = 31.25; const cx = 640; const cy = 520;
    let b = title('Setting up: 13 marbles in a cross');
    b += slab(160, 150, 960, 800);
    b += `<line x1="${cx - 3.3 * step * 0.707}" y1="${cy - 3.3 * step * 0.707}" x2="${cx + 3.3 * step * 0.707}" y2="${cy + 3.3 * step * 0.707}" stroke="${C.chalk}" stroke-width="2" stroke-opacity="0.25"/>`;
    b += `<line x1="${cx + 3.3 * step * 0.707}" y1="${cy - 3.3 * step * 0.707}" x2="${cx - 3.3 * step * 0.707}" y2="${cy + 3.3 * step * 0.707}" stroke="${C.chalk}" stroke-width="2" stroke-opacity="0.25"/>`;
    b += cross(ctx, cx, cy, step, d);
    const a = Math.PI / 4;
    b += dim(cx + 18, cy - 18, cx + Math.cos(-a) * step - 0, cy + Math.sin(-a) * step - 0, '3 in', { side: -1 });
    b += label(1170, 300, '1 in the middle');
    b += label(1170, 380, '3 on each arm');
    b += label(1170, 460, '3 in apart', { sub: 'centre to centre' });
    b += label(1170, 590, 'Marbles 5/8 in', { sub: 'drawn to scale' });
    b += text(1170, 720, 'The first shooter chooses', { size: 32, color: C.soft });
    b += text(1170, 760, 'which way the X points.', { size: 32, color: C.soft });
    return svg(1600, 1000, b, { mark: 'Diagram' });
  },

  lag: (ctx) => {
    const cx = 700; const cy = 520; const r = 330;
    let b = title('Lagging for first shot');
    b += slab(0, 0, 1600, 1000, 0) + title('Lagging for first shot');
    b += ring(cx, cy, r);
    b += `<line x1="${cx - 420}" y1="${cy - r}" x2="${cx + 420}" y2="${cy - r}" stroke="${C.yellow}" stroke-width="6"/>` + label(cx + 440, cy - r + 12, 'Lag line', { color: C.yellow });
    // Both toss from the far edge, at the same time.
    b += marble(ctx, 'cats-eye', cx - 90, cy + r + 40, 40) + marble(ctx, 'aggie', cx + 90, cy + r + 40, 40);
    b += label(cx + r + 80, cy + 120, 'Both toss at once', { sub: 'from the far edge of the circle' });
    b += label(cx + r + 80, cy - 60, 'Closest to the line', { color: C.yellow, sub: 'shoots first' });
    b += arrow(cx - 90, cy + r + 20, cx - 70, cy - r + 28, { dash: '2 18', width: 6 }) + marble(ctx, 'cats-eye', cx - 70, cy - r + 14, 40);
    b += arrow(cx + 90, cy + r + 20, cx + 110, cy - r + 95, { dash: '2 18', color: C.soft, width: 6 }) + marble(ctx, 'aggie', cx + 110, cy - r + 80, 40);
    b += yes(cx - 160, cy - r + 70, 22);
    return svg(1600, 1000, b, { mark: 'Diagram' });
  },

  shooting: (ctx) => {
    const cx = 760; const cy = 500; const r = 330;
    let b = slab(0, 0, 1600, 1000, 0) + title('Shooting: from the edge, then from where you stop');
    b += ring(cx, cy, r);
    b += cross(ctx, cx + 20, cy, 46, 24);
    const sx = cx - r - 70; const sy = cy + 120;
    b += badge(sx - 30, sy - 80, 1) + marble(ctx, 'cats-eye', sx, sy, 40) + label(sx - 120, sy + 90, 'First shot', { sub: 'hand outside the circle' });
    b += arrow(sx + 22, sy - 8, cx - 30, cy + 24, { dash: '2 16', width: 6 });
    b += marble(ctx, 'clearie', cx + r + 80, cy + 60, 24) + arrow(cx + 10, cy + 6, cx + r + 60, cy + 56, { dash: '2 14', color: C.chalk, width: 5, head: 16 });
    b += label(cx + r + 110, cy + 70, 'Out: 1 point');
    b += marble(ctx, 'cats-eye', cx - 40, cy + 70, 40) + `<circle cx="${cx - 40}" cy="${cy + 70}" r="32" stroke="${C.yellow}" stroke-width="5" fill="none" stroke-dasharray="10 8"/>`;
    b += badge(cx - 40, cy + 140, 2) + `<path d="M${cx - 10} ${cy + 86} L ${cx + r + 90} ${cy + 200}" stroke="${C.yellow}" stroke-width="4" stroke-dasharray="6 8"/>` + label(cx + r + 110, cy + 210, 'Shooter still inside', { sub: 'shoot again from here' });
    b += text(70, 940, 'Shooter rolls out? Your turn ends, but the points count.', { size: 32, color: C.soft });
    return svg(1600, 1000, b, { mark: 'Diagram' });
  },

  line: (ctx) => {
    let b = title('On the line');
    const y = 470;
    b += slab(60, 150, 1480, 640);
    // The circle's line, a slice of it, crossing the picture; inside below, outside above.
    b += `<path d="M60 ${y + 30} Q 800 ${y - 30} 1540 ${y + 30}" stroke="${C.chalk}" stroke-width="10" fill="none"/>`;
    b += text(90, y - 110, 'outside', { size: 30, color: C.muted }) + text(90, y + 130, 'inside', { size: 30, color: C.muted });
    b += marble(ctx, 'clearie', 470, y - 22, 110) + label(470, y + 170, 'Target on the line', { anchor: 'middle', sub: 'more than half outside: out' });
    b += marble(ctx, 'cats-eye', 1130, y + 16, 120) + label(1130, y + 170, 'Shooter on the line', { anchor: 'middle', sub: 'it stays in' });
    b += text(800, 860, 'The rule of thumb: a target on the line is out, a shooter on the line is in.', { size: 34, color: C.chalk, anchor: 'middle', weight: 600 });
    return svg(1600, 940, b, { mark: 'Diagram' });
  },
};

// ── Making: how glass marbles are made ─────────────────────────────────────

/** A glass cane (a rod with coloured threads through it), from x to x + len, centred at y; `hot` heats its end. */
function cane(x, y, len, thick, { hot = 0 } = {}) {
  const threads = [['#E5322D', -0.25], ['#FFD21F', 0], ['#2457B8', 0.25]].map(([c, o]) => `<line x1="${x}" y1="${y + o * thick}" x2="${x + len}" y2="${y + o * thick}" stroke="${c}" stroke-width="${thick * 0.12}" opacity="0.85"/>`).join('');
  const glow = hot ? `<rect x="${x + len * (1 - hot)}" y="${y - thick / 2}" width="${len * hot}" height="${thick}" rx="${thick / 2}" fill="url(#hot)" opacity="0.85"/>` : '';
  return `<rect x="${x}" y="${y - thick / 2}" width="${len}" height="${thick}" rx="${thick / 2}" fill="#CFE6EC" opacity="0.85"/>${threads}${glow}<rect x="${x}" y="${y - thick / 2}" width="${len}" height="${thick * 0.3}" rx="${thick * 0.15}" fill="#fff" opacity="0.35"/>`;
}
/** Marble scissors: two curved jaws cupping the ball at (x, y), their arms crossing at a pivot and running off as handles. */
function scissors(x, y, s = 1, open = 18, ball = 96) {
  const r = ball * 0.62 * s;
  const px = x + ball * 1.15 * s; // the pivot, beyond the ball
  const g = (sign) => {
    const jaw = `M${x - r * 0.9} ${y + sign * r * 0.45} A ${r} ${r} 0 0 ${sign > 0 ? 0 : 1} ${x + r * 0.55} ${y + sign * r * 0.85}`;
    const arm = `M${x + r * 0.55} ${y + sign * r * 0.85} L ${px} ${y} L ${px + 300 * s} ${y - sign * (open * 3) * s}`;
    return `<path d="${jaw}" stroke="#9AA5B8" stroke-width="${12 * s}" fill="none" stroke-linecap="round"/><path d="${arm}" stroke="#9AA5B8" stroke-width="${14 * s}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  return `${g(1)}${g(-1)}<circle cx="${px}" cy="${y}" r="${10 * s}" fill="#5A6476"/>`;
}

export const MAKING = {
  header: (ctx) => {
    let b = `<rect width="1600" height="900" fill="url(#slab)" opacity="0.5"/>`;
    b += `<circle cx="1180" cy="420" r="300" fill="${C.glow}" opacity="0.08"/>`;
    b += cane(-40, 430, 1080, 120, { hot: 0.22 });
    b += `<circle cx="1150" cy="430" r="96" fill="url(#hot)"/>` + marble(ctx, 'handmade-swirl', 1150, 430, 192, { shadow: false });
    b += `<circle cx="1150" cy="430" r="96" fill="${C.glow}" opacity="0.35"/>`;
    b += scissors(1150, 430, 1, 10, 192);
    return svg(1600, 900, b);
  },

  caneCut: (ctx) => {
    let b = title('Cane-cut: five steps');
    const steps = [
      ['Make the cane', 'a rod with the design inside'],
      ['Heat the end', 'until it is soft'],
      ['Round it off', 'in a rounding tool'],
      ['Twist', 'for the spiral'],
      ['Cut it free', 'with the marble scissors'],
    ];
    const colW = 300; const x0 = 60; const y = 420;
    steps.forEach(([t, s], i) => {
      const x = x0 + i * colW;
      b += badge(x + 34, 190, i + 1);
      if (i === 0) b += cane(x + 10, y, 260, 84);
      if (i === 1) b += cane(x + 10, y, 260, 84, { hot: 0.35 });
      if (i === 2) b += cane(x + 10, y, 160, 84, { hot: 0.3 }) + `<circle cx="${x + 215}" cy="${y}" r="62" fill="url(#hot)"/>` + `<path d="M${x + 150} ${y - 100} A 80 80 0 0 1 ${x + 280} ${y - 60}" stroke="${C.yellow}" stroke-width="6" fill="none"/>` + arrow(x + 270, y - 72, x + 280, y - 60, { head: 18, width: 6 });
      if (i === 3) b += cane(x + 10, y, 160, 84, { hot: 0.2 }) + marble(ctx, 'handmade-swirl', x + 215, y, 124, { shadow: false }) + `<path d="M${x + 150} ${y - 92} A 70 26 0 1 0 ${x + 280} ${y - 92}" stroke="${C.yellow}" stroke-width="6" fill="none"/>` + arrow(x + 270, y - 100, x + 280, y - 92, { head: 18, width: 6 });
      if (i === 4) b += cane(x + 10, y, 120, 84) + scissors(x + 200, y + 24, 0.55, 10, 110) + marble(ctx, 'handmade-swirl', x + 200, y + 24, 110, { shadow: false });
      b += label(x + 140, 640, t, { anchor: 'middle', size: 38, sub: s });
      if (i < 4) b += arrow(x + 270, 190, x + colW - 20, 190, { color: C.muted, width: 4, head: 14 });
    });
    b += text(800, 830, 'Then the next marble is started from the same cane.', { size: 32, anchor: 'middle', color: C.soft });
    return svg(1600, 900, b);
  },

  punty: (ctx) => {
    let b = title('Single gather: on a punty');
    b += `<line x1="60" y1="470" x2="900" y2="470" stroke="#9AA5B8" stroke-width="22" stroke-linecap="round"/>`;
    b += `<circle cx="990" cy="470" r="120" fill="url(#hot)" opacity="0.9"/>` + `<circle cx="990" cy="470" r="84" fill="#FFE7A0" opacity="0.35"/>` + `<circle cx="990" cy="470" r="48" fill="#FFF4D0" opacity="0.35"/>`;
    b += label(300, 420, 'Punty', { sub: 'a metal rod' });
    b += label(1140, 330, 'Glass built up in layers', { sub: 'then rounded and cut free' });
    b += `<path d="M1080 360 L 1140 330" stroke="${C.yellow}" stroke-width="4"/>`;
    b += text(80, 760, 'Sulphides were made like this: a white figure set in glass on a punty, with more glass folded round it.', { size: 30, color: C.soft });
    return svg(1600, 860, b);
  },

  christensen: (ctx) => {
    let b = title('Christensen\'s machine (patent 1905)');
    const roll = (cx, cy, dir) => {
      let g = `<circle cx="${cx}" cy="${cy}" r="190" fill="url(#steel)" stroke="#4A5466" stroke-width="6"/>`;
      for (let k = 0; k < 12; k += 1) {
        const a = (k * Math.PI) / 6; g += `<line x1="${cx + Math.cos(a) * 150}" y1="${cy + Math.sin(a) * 150}" x2="${cx + Math.cos(a) * 185}" y2="${cy + Math.sin(a) * 185}" stroke="#5A6476" stroke-width="5"/>`;
      }
      g += `<circle cx="${cx}" cy="${cy}" r="28" fill="#4A5466"/>`;
      g += `<path d="M${cx - 110 * dir} ${cy - 160} A 195 195 0 0 ${dir > 0 ? 1 : 0} ${cx + 110 * dir} ${cy - 160}" stroke="${C.yellow}" stroke-width="8" fill="none"/>`;
      g += arrow(cx + 100 * dir, cy - 166, cx + 116 * dir, cy - 158, { head: 26, width: 8 });
      return g;
    };
    b += roll(560, 520, 1) + roll(1040, 520, -1);
    // The glass lump between them, being rolled into a ball.
    b += `<circle cx="800" cy="520" r="52" fill="url(#hot)"/>`;
    b += label(560, 790, 'Grooved roll', { anchor: 'middle' }) + label(1040, 790, 'Grooved roll', { anchor: 'middle' });
    b += label(800, 230, 'Soft glass', { anchor: 'middle', color: C.orange, sub: 'rolled into a ball between them' }) + `<path d="M800 290 L 800 455" stroke="${C.orange}" stroke-width="4" stroke-dasharray="6 8"/>`;
    b += `<path d="M1240 520 C 1300 470 1300 570 1360 520 C 1420 470 1420 570 1480 520" stroke="${C.soft}" stroke-width="6" fill="none"/>` + label(1250, 620, 'Spring', { sub: 'lets a roll move aside' });
    b += text(800, 900, 'The rolls turn in opposite directions; when the ball is big enough it drops out. Fed by hand.', { size: 30, anchor: 'middle', color: C.soft });
    return svg(1600, 960, b);
  },

  modern: (ctx) => {
    let b = title('The machine method');
    // Furnace → stream → shear → spiral rollers → collect.
    b += `<rect x="70" y="200" width="300" height="300" rx="26" fill="#3A2A2A"/><rect x="110" y="250" width="220" height="150" rx="18" fill="url(#hot)"/>`;
    b += badge(110, 230, 1) + label(220, 560, 'Melt', { anchor: 'middle', sub: 'in a furnace' });
    b += `<path d="M300 400 L 300 470 C 300 520 470 520 470 560" stroke="url(#hot)" stroke-width="18" fill="none" stroke-linecap="round"/>`;
    b += badge(500, 450, 2) + label(560, 470, 'A stream of glass');
    // The rotating shear.
    b += `<g transform="translate(470 610)"><circle r="56" fill="none" stroke="#9AA5B8" stroke-width="10"/><path d="M-60 0 L 60 0" stroke="#9AA5B8" stroke-width="10"/></g>` + `<circle cx="470" cy="700" r="26" fill="url(#hot)"/>`;
    b += badge(380, 610, 3) + label(200, 760, 'Cut', { sub: 'a rotating shear snips a gob' });
    // The spiral rollers.
    const rx = 620; const ry = 760;
    b += `<rect x="${rx}" y="${ry - 34}" width="700" height="68" rx="34" fill="url(#steel)"/><rect x="${rx}" y="${ry + 36}" width="700" height="68" rx="34" fill="url(#steel)" opacity="0.8"/>`;
    for (let k = 0; k < 14; k += 1) b += `<path d="M${rx + 20 + k * 50} ${ry - 32} l 26 64" stroke="#4A5466" stroke-width="6"/>`;
    b += marble(ctx, 'clearie', rx + 80, ry - 46, 44, { shadow: false }) + marble(ctx, 'cats-eye', rx + 330, ry - 46, 44, { shadow: false }) + marble(ctx, 'corkscrew', rx + 580, ry - 46, 44, { shadow: false });
    b += arrow(rx + 120, ry - 90, rx + 540, ry - 90, { width: 6 });
    b += badge(rx + 20, ry + 150, 4) + label(rx + 60, ry + 162, 'Roll', { sub: 'spiral-grooved rollers turn it into a sphere' });
    b += marble(ctx, 'clearie', 1420, 820, 50, { topDown: false }) + marble(ctx, 'oxblood', 1480, 830, 50, { topDown: false }) + marble(ctx, 'cats-eye', 1450, 780, 50, { topDown: false });
    b += badge(1380, 640, 5) + label(1420, 660, 'Collect', { sub: 'to cool' });
    return svg(1600, 980, b);
  },

  colour: (ctx) => {
    let b = title('Where the colour comes from');
    // Handmade: threads in the cane; machine: streams; cat's eye: vanes injected into clear glass.
    b += cane(80, 420, 380, 110);
    b += label(270, 600, 'Handmade', { anchor: 'middle', sub: 'coloured rods in the cane' });
    b += `<path d="M700 260 L 700 470" stroke="#E5322D" stroke-width="22" stroke-linecap="round"/><path d="M740 260 L 740 470" stroke="#F4F1EA" stroke-width="22" stroke-linecap="round"/><path d="M780 260 L 780 470" stroke="#FFD21F" stroke-width="22" stroke-linecap="round"/>`;
    b += arrow(740, 480, 740, 520, { color: C.muted, width: 5, head: 14 }) + marble(ctx, 'corkscrew', 740, 600, 110, { topDown: false });
    b += label(740, 740, 'Machine-made', { anchor: 'middle', sub: 'streams of coloured glass together' });
    b += `<path d="M1190 260 L 1190 470" stroke="#CFE6EC" stroke-width="80" stroke-linecap="round" opacity="0.6"/><path d="M1190 280 L 1190 460" stroke="#E5322D" stroke-width="10"/><path d="M1205 280 L 1205 460" stroke="#FFD21F" stroke-width="8"/>`;
    b += arrow(1190, 480, 1190, 520, { color: C.muted, width: 5, head: 14 }) + marble(ctx, 'cats-eye', 1190, 600, 110, { topDown: false });
    b += label(1190, 740, 'Cat\'s eye', { anchor: 'middle', sub: 'coloured vanes injected into clear glass' });
    return svg(1600, 860, b);
  },

  annealing: (ctx) => {
    let b = title('Annealing: the slow cool');
    b += `<rect x="120" y="300" width="1360" height="260" rx="40" fill="url(#lehr)"/><rect x="120" y="300" width="1360" height="260" rx="40" fill="url(#grain)"/>`;
    b += `<rect x="80" y="560" width="1440" height="26" rx="13" fill="#5A6476"/>`;
    ['handmade-swirl', 'onionskin', 'lutz', 'sulphide'].forEach((m, i) => { b += marble(ctx, m, 260 + i * 330, 510, 90, { topDown: false }); });
    b += arrow(200, 650, 1400, 650, { color: C.chalk, width: 6 });
    b += label(200, 270, 'Hot', { color: C.orange }) + label(1400, 270, 'Cool', { anchor: 'end', color: C.soft });
    b += label(800, 740, 'A lehr: an annealing oven', { anchor: 'middle', sub: 'the glass cools slowly, so it doesn\'t crack later' });
    return svg(1600, 860, b);
  },
};

// ── History ─────────────────────────────────────────────────────────────────

export const HISTORY = {
  header: (ctx) => {
    let b = `<rect width="1600" height="900" fill="url(#slab)" opacity="0.35"/>`;
    // From pebbles and nuts to glass: a row along a shelf.
    const sy = 660;
    b += `<rect x="0" y="${sy}" width="1600" height="46" fill="${C.wood}" opacity="0.9"/><rect x="0" y="${sy + 46}" width="1600" height="14" fill="#000" opacity="0.25"/>`;
    const row = [['pebble', 130, 120], ['walnut', 330, 150], ['clay-tan', 545, 170], ['china', 765, 180], ['onionskin', 1000, 210], ['corkscrew', 1235, 180], ['cats-eye', 1460, 200]];
    for (const [m, x, d] of row) {
      if (m === 'pebble') b += `<ellipse cx="${x}" cy="${sy - d * 0.42}" rx="${d * 0.55}" ry="${d * 0.42}" fill="#8C8F96"/><ellipse cx="${x - 14}" cy="${sy - d * 0.6}" rx="${d * 0.2}" ry="${d * 0.1}" fill="#fff" opacity="0.3"/>`;
      else if (m === 'walnut') b += walnut(x, sy - d / 2, d);
      else b += marble(ctx, m, x, sy - d / 2, d, { topDown: false });
    }
    return svg(1600, 900, b);
  },

  timeline: (ctx) => {
    const y = 470;
    let b = title('Marbles through time');
    b += `<line x1="80" y1="${y}" x2="1520" y2="${y}" stroke="${C.chalk}" stroke-width="5"/>`;
    const items = [
      [140, 'c. 2500 BCE', 'Stone balls at', 'Mohenjo-daro', 'pebble'],
      [330, 'Rome', 'Children play', 'games with nuts', 'walnut'],
      [520, '1560', 'Bruegel paints', 'children at marbles', 'clay-tan'],
      [710, 'c. 1846', 'Marble scissors', 'in Lauscha', 'handmade-swirl'],
      [900, '1870s', 'Clay marbles', 'mass-made in the US', 'clay-red'],
      [1090, '1902–1905', 'Christensen\'s', 'machine patent', 'clearie'],
      [1280, '1920s–1930s', 'Tournaments begin', 'in the US and UK', 'corkscrew'],
      [1460, '1950s', 'Cat\'s eyes', 'everywhere', 'cats-eye'],
    ];
    items.forEach(([x, when, a, c, m], i) => {
      const up = i % 2 === 0;
      b += `<circle cx="${x}" cy="${y}" r="12" fill="${C.yellow}"/>`;
      const my = up ? y - 120 : y + 120;
      if (m === 'pebble') b += `<ellipse cx="${x}" cy="${my}" rx="40" ry="31" fill="#8C8F96"/>`;
      else if (m === 'walnut') b += walnut(x, my, 76);
      else b += marble(ctx, m, x, my, 80, { topDown: false });
      const ty = up ? y + 64 : y - 92;
      b += `<text x="${x}" y="${ty}" fill="${C.yellow}" font-family="Barlow Condensed" font-weight="800" font-size="34" text-anchor="middle">${when}</text>`;
      b += text(x, ty + 34, a, { size: 25, anchor: 'middle', color: C.soft }) + text(x, ty + 62, c, { size: 25, anchor: 'middle', color: C.soft });
    });
    return svg(1600, 900, b);
  },

  ancient: (ctx) => {
    let b = title('Before glass');
    const gy = 600;
    b += `<rect x="0" y="${gy}" width="1600" height="300" fill="url(#dirt)"/>`;
    const pebbles = [[190, gy - 40, 110, '#8C8F96'], [330, gy - 30, 84, '#9C8F80'], [450, gy - 36, 96, '#7E838C']];
    for (const [x, y, d, c] of pebbles) b += `<ellipse cx="${x}" cy="${y}" rx="${d * 0.55}" ry="${d * 0.42}" fill="${c}"/><ellipse cx="${x - 12}" cy="${y - d * 0.18}" rx="${d * 0.2}" ry="${d * 0.09}" fill="#fff" opacity="0.3"/>`;
    b += label(320, gy + 90, 'Round pebbles', { anchor: 'middle' });
    b += walnut(700, gy - 66, 140) + walnut(850, gy - 52, 110) + `<ellipse cx="960" cy="${gy - 28}" rx="34" ry="28" fill="#7A3A22"/><ellipse cx="1040" cy="${gy - 24}" rx="28" ry="23" fill="#9A5A32"/>`;
    b += label(860, gy + 90, 'Nuts and fruit pits', { anchor: 'middle' });
    b += `<circle cx="1250" cy="${gy - 62}" r="64" fill="#7A2E3A"/><circle cx="1250" cy="${gy - 62}" r="64" fill="url(#grain)"/><circle cx="1390" cy="${gy - 50}" r="52" fill="#6A2A34"/><ellipse cx="1232" cy="${gy - 96}" rx="20" ry="10" fill="#fff" opacity="0.25"/>`;
    b += label(1320, gy + 90, 'Small stone balls', { anchor: 'middle', sub: 'found in graves: perhaps game pieces' });
    b += text(800, 860, 'An illustration of what the earliest "marbles" may have been, not of particular finds.', { size: 30, anchor: 'middle', color: C.chalk });
    return svg(1600, 900, b);
  },
};

/** A walnut: a wrinkled brown ball. */
function walnut(x, y, d) {
  const r = d / 2;
  let w = `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.9}" fill="#8A5A32"/><path d="M${x} ${y - r * 0.9} C ${x - r * 0.15} ${y - r * 0.3} ${x + r * 0.15} ${y + r * 0.3} ${x} ${y + r * 0.9}" stroke="#5A3A20" stroke-width="${r * 0.08}" fill="none"/>`;
  for (let k = -2; k <= 2; k += 1) w += `<path d="M${x - r * 0.75} ${y + k * r * 0.28} q ${r * 0.3} ${-r * 0.12} ${r * 0.6} 0" stroke="#6A4426" stroke-width="${r * 0.05}" fill="none"/><path d="M${x + r * 0.15} ${y + k * r * 0.28} q ${r * 0.3} ${r * 0.12} ${r * 0.6} 0" stroke="#6A4426" stroke-width="${r * 0.05}" fill="none"/>`;
  return `${w}<ellipse cx="${x - r * 0.35}" cy="${y - r * 0.45}" rx="${r * 0.25}" ry="${r * 0.12}" fill="#fff" opacity="0.18"/>`;
}
