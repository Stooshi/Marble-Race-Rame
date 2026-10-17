'use strict';

/**
 * The sameness check (track report, "Variety"): no two tracks may feel alike, in
 * their opening or in the run as a whole. It needs no races: it compares a
 * track's opening and its sequence of sections with every other track's.
 *
 * - Opening: the opening's kind, its first obstacle and the way its first bend
 *   turns. Two tracks of one family (World Tour, Grand Prix, coasters) may not
 *   share all three, and no more than two tracks of a family may use one kind.
 * - Layout: the sections after the opening as a row of tokens (S-bends left,
 *   splitter, sweep right, climb, drop, hairpin left, spiral right…; straights
 *   and the run-in left out), compared by edit distance: similarity = 1 - the
 *   cost of turning one row into the other / the longer row's length, where the
 *   same section turning the other way costs a quarter. Too alike at 0.80; at
 *   0.70 too if the splitters and the sharp bend also stand where the other
 *   track's do (within 10% of the track); 0.65 is shown as a warning.
 *
 * Test tracks (the kit's and the libraries') are never compared, and a mirrored
 * track is not compared with the track it mirrors (it is the same track the
 * other way round, and says so).
 */

const LAYOUT_FAIL = 0.8;
const LAYOUT_FAIL_SAME_PLACES = 0.7;
const LAYOUT_WARN = 0.65;
const PLACE_CLOSE = 0.1;
const MAX_PER_OPENING = 2;

const TOKEN = { plunge: 'drop', waterfall: 'waterfall', climb: 'climb', sBends: 'S-bends', sweep: 'sweep', spiral: 'spiral', hairpin: 'hairpin', splitter: 'splitter', twinChutes: 'chutes', halfPipe: 'half-pipe' };
const OBSTACLE = { block: 'block', pileUp: 'pile-up', curtain: 'curtain', swipe: 'swipe', parked: 'parked', slalom: 'slalom', peg: 'peg' };

// The three hand-built tracks (src/game/physicsTracks.js), written out as the kit would see them.
const HAND_BUILT = {
  'bobsleigh-run': {
    family: 'classic', opening: 'classic', firstObstacle: 'pile-up', firstBend: 'left',
    tokens: [['S-bends', 'left'], ['splitter', 'left'], ['sweep', 'right'], ['hairpin', 'left'], ['spiral', 'right'], ['drop', null]],
    splitters: [0.36], sharp: 0.64,
  },
  'san-francisco': {
    family: 'classic', opening: 'classic', firstObstacle: 'none', firstBend: 'right',
    tokens: [['sweep', 'right'], ['climb', null], ['drop', null], ['S-bends', 'left'], ['hairpin', 'right'], ['climb', null], ['drop', null], ['sweep', 'left']],
    splitters: [], sharp: 0.5,
  },
  'table-mountain-run': {
    family: 'classic', opening: 'classic', firstObstacle: 'pile-up', firstBend: 'left',
    tokens: [['S-bends', 'left'], ['splitter', 'left'], ['sweep', 'right'], ['hairpin', 'left'], ['splitter', 'right'], ['spiral', 'right'], ['drop', null]],
    splitters: [0.33, 0.67], sharp: 0.55,
  },
};

/** A track as the sameness check sees it (null for a track it cannot read). */
function profile(track) {
  const hand = HAND_BUILT[track.slug];
  if (hand) {
    const look = track.physics?.startLook;
    const start = look ? { type: null, gate: look.gate, countdown: look.shots.countdown, launch: look.shots.launch } : { type: null, gate: 'paddle', countdown: 'classic', launch: 'high-behind' };
    return { slug: track.slug, name: track.name, start, ...hand, tokens: hand.tokens.map(([t, side]) => ({ t, side })) };
  }
  const v = track.variety;
  if (!v) return null;
  const secs = v.sections;
  const opening = secs.slice(0, v.openingSections);
  const rest = secs.slice(v.openingSections);
  const firstObstacle = secs.flatMap((s) => s.obstacles).find((o) => OBSTACLE[o]);
  const firstBend = secs.find((s) => s.side)?.side ?? 'none';
  const tokens = rest.filter((s) => TOKEN[s.shape]).map((s) => ({ t: TOKEN[s.shape], side: s.side ?? null }));
  const mid = (s) => (s.from + s.to) / 2;
  return {
    slug: track.slug,
    name: track.name,
    family: v.family,
    mirrorOf: v.mirrorOf ?? null,
    opening: v.opening,
    layout: v.layout,
    firstObstacle: firstObstacle ? OBSTACLE[firstObstacle] : 'none',
    firstBend,
    openingTokens: opening.filter((s) => TOKEN[s.shape]).map((s) => ({ t: TOKEN[s.shape], side: s.side ?? null })),
    tokens,
    start: v.start ?? { type: null, gate: 'paddle', countdown: 'classic', launch: 'high-behind' },
    splitters: secs.filter((s) => s.shape === 'splitter').map(mid),
    sharp: secs.find((s) => s.shape === 'hairpin') ? mid(secs.find((s) => s.shape === 'hairpin')) : null,
  };
}

/** How alike two rows of sections are: 1 = the same, 0 = nothing in common. */
function similarity(a, b) {
  const n = a.length;
  const m = b.length;
  if (!n && !m) return 1;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...new Array(m).fill(0)]);
  for (let j = 1; j <= m; j += 1) d[0][j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const x = a[i - 1];
      const y = b[j - 1];
      const sub = x.t !== y.t ? 1 : x.side === y.side ? 0 : 0.25;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + sub);
    }
  }
  return 1 - d[n][m] / Math.max(n, m);
}

const samePlaces = (a, b) => {
  const near = (x, y) => x !== null && y !== null && Math.abs(x - y) <= PLACE_CLOSE;
  if (!near(a.sharp, b.sharp)) return false;
  if (a.splitters.length !== b.splitters.length) return false;
  return a.splitters.every((s, k) => near(s, b.splitters[k]));
};

/** Every other track this one is compared with. */
function others(me, all) {
  return all.filter((o) => o && o.slug !== me.slug && o.family !== 'test' && o.slug !== me.mirrorOf && o.mirrorOf !== me.slug);
}

/** The sameness check for one track against all the others: the report's lines, and the scores. */
function varietyCheck(track, tracks) {
  const all = tracks.map(profile);
  const me = profile(track);
  if (!me) return { lines: [{ part: 'Variety', what: 'Sameness check', value: 'not a kit track', target: '', pass: null }], scores: [] };
  if (me.family === 'test') {
    return { lines: [{ part: 'Variety', what: 'Sameness check', value: `a test track (opening: ${me.opening}${me.layout ? `, layout: ${me.layout}` : ''}): not compared`, target: '', pass: null }], scores: [] };
  }
  const rest = others(me, all);
  const lines = [];

  // The opening.
  const family = rest.filter((o) => o.family === me.family);
  const twin = family.find((o) => o.opening === me.opening && o.firstObstacle === me.firstObstacle && o.firstBend === me.firstBend);
  lines.push({
    part: 'Variety',
    what: `Opening: no other ${familyName(me.family)} track opens the same way (kind, first obstacle, first bend)`,
    value: `${me.opening}, ${me.firstObstacle}, first bend ${me.firstBend}${twin ? `: the same as ${twin.name}` : ''}`,
    target: 'none the same',
    pass: !twin,
  });
  const sameKind = family.filter((o) => o.opening === me.opening);
  lines.push({
    part: 'Variety',
    what: `Opening: at most ${MAX_PER_OPENING} ${familyName(me.family)} tracks with this kind of opening`,
    value: `${sameKind.length + 1} with "${me.opening}"${sameKind.length ? ` (also ${list(sameKind.map((o) => o.name))})` : ''}`,
    target: `at most ${MAX_PER_OPENING}`,
    pass: sameKind.length + 1 <= MAX_PER_OPENING,
  });

  // How the start looks: the two camera shots of the first seconds, and a coaster's start type.
  const st = me.start;
  const sameShots = family.filter((o) => o.start.countdown === st.countdown && o.start.launch === st.launch);
  lines.push({
    part: 'Variety',
    what: `Start: no other ${familyName(me.family)} track opens on the same camera shots (countdown, first seconds)`,
    value: `${st.countdown} then ${st.launch}, gate: ${st.gate}${st.type ? `, start: ${st.type}` : ''}${sameShots.length ? `: the same as ${list(sameShots.map((o) => o.name))}` : ''}`,
    target: 'none the same',
    pass: !sameShots.length,
  });
  if (st.type) {
    const sameType = family.filter((o) => o.start.type === st.type);
    lines.push({
      part: 'Variety',
      what: `Start: at most ${MAX_PER_OPENING} coasters with this start type`,
      value: `${sameType.length + 1} with "${st.type}"${sameType.length ? ` (also ${list(sameType.map((o) => o.name))})` : ''}`,
      target: `at most ${MAX_PER_OPENING}`,
      pass: sameType.length + 1 <= MAX_PER_OPENING,
    });
  }

  // The layout, against every other track of every family.
  const scores = rest.map((o) => ({ slug: o.slug, name: o.name, score: similarity(me.tokens, o.tokens), samePlaces: samePlaces(me, o) }))
    .sort((a, b) => b.score - a.score);
  const failing = scores.filter((s) => s.score >= LAYOUT_FAIL - 1e-9 || (s.score >= LAYOUT_FAIL_SAME_PLACES - 1e-9 && s.samePlaces));
  const closest = scores[0];
  lines.push({
    part: 'Variety',
    what: 'Layout: the section order differs from every other track\'s (too alike at 0.80, or 0.70 with the splitters and sharp bend in the same places)',
    value: closest
      ? `closest is ${closest.name} (${closest.score.toFixed(2)}${closest.samePlaces ? ', same places' : ''})${failing.length ? `; too alike: ${list(failing.map((f) => `${f.name} ${f.score.toFixed(2)}`))}` : ''}`
      : 'no other track to compare',
    target: `under ${LAYOUT_FAIL_SAME_PLACES.toFixed(2)}`,
    pass: !failing.length,
  });
  const warn = scores.filter((s) => s.score >= LAYOUT_WARN - 1e-9 && !failing.includes(s));
  if (warn.length) lines.push({ part: 'Variety', what: `Layout: close to (${LAYOUT_WARN} or more)`, value: list(warn.map((w) => `${w.name} ${w.score.toFixed(2)}`)), target: 'shown', pass: null });
  return { lines, scores };
}

const familyName = (f) => ({ 'world-tour': 'World Tour', 'grand-prix': 'Grand Prix', coaster: 'coaster', pinball: 'pinball', arcade: 'arcade', canyon: 'canyon', block: 'Block Series', athletics: 'Track and Field', classic: 'hand-built' }[f] ?? f);
const list = (xs) => (xs.length > 4 ? `${xs.slice(0, 4).join(', ')} and ${xs.length - 4} more` : xs.join(', '));

module.exports = { varietyCheck, profile, similarity, LAYOUT_FAIL, LAYOUT_FAIL_SAME_PLACES, LAYOUT_WARN };
