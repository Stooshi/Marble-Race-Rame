'use strict';

/**
 * The opening library: proven ways for a kit track to leave the gate, so not
 * every track starts with the same steep drop and the same pile-up.
 *
 *   opening: opening('banked-turn', { side: 'right', costumes: { block: 'tyre-stack' } }),
 *   sections: [ …the rest of the track… ],
 *
 * An opening is the first section or two of a track, plus anything it changes
 * at the gate (how the field is let go, the starting funnel, twin chutes). Each
 * was proven on its own test track (src/tracks/variety-*.js) before any real
 * track used it: three batches of 1,000 races and the full track report, every
 * fairness and racing target passing. The recipe's first rule is that a track
 * opens with one of these (or, as every track before the library did, the
 * classic steep plunge written out by hand).
 *
 * `name`, `names`, `costumes` and the scenery fields dress an opening; its
 * shape and its obstacles' places are what was proven, so they stay as they are.
 */

const { plunge, straight, sweep, sBends, climb, pileUp, slalom, peg, boost, brake, halfPipe } = require('./parts');

// The classic opening (every Grand Prix track's): a steep 80 m plunge, a pile-up, then a slalom.
const classicObstacles = (c) => [
  pileUp({ costume: c.block, at: 0.42 }),
  slalom({ costume: c.slalom, from: 0.55, to: 0.97, count: 6, loss: 0.3 }),
];

const OPENINGS = {
  /** The classic: a steep plunge, a pile-up and a slalom (as on every track before the library). */
  classic: (o) => ({
    sections: [{ key: 'plunge', name: 'Start plunge', shape: plunge(80, { grade: 0.6 }), obstacles: classicObstacles(o.costumes) }],
  }),

  /**
   * Split-and-merge: down the steep plunge through the first pile-up, then into two
   * parallel chutes, an island between them, merging again about two seconds later
   * (the wedge stands just below the gate's funnel, where the field is first in one
   * channel). Both chutes are the same length and the same ice, so neither is
   * quicker; which a marble takes depends on where it is across the plunge.
   */
  'split-start': (o) => ({
    sections: [
      { key: 'plunge', name: 'Start plunge', shape: plunge(70, { grade: 0.6 }), obstacles: [pileUp({ costume: o.costumes.block, at: 0.48 }), slalom({ costume: o.costumes.slalom, from: 0.75, to: 0.97, count: 3, loss: 0.3 })] },
      { key: 'chutes', name: 'Twin chutes', shape: twinChutes(40, { grade: 0.5 }) },
      { key: 'after', name: 'Out of the chutes', shape: plunge(35, { grade: 0.55 }), obstacles: [slalom({ costume: o.costumes.slalom, from: 0.1, to: 0.95, count: 4, loss: 0.3 })] },
    ],
  }),

  /**
   * Staggered gate drop: the gate lets the field go in five waves of four starting
   * places, 0.15 s apart, in an order drawn afresh every race, so each wave leads
   * as often as any other.
   */
  'staggered-drop': (o) => ({
    // (A short rough stretch where the waves catch each other up, then the pile-up and slalom.)
    sections: [{
      key: 'plunge', name: 'Start plunge', shape: plunge(90, { grade: 0.6 }), features: [brake({ at: 0.3, length: 12, drag: 0.02 })],
      obstacles: [pileUp({ costume: o.costumes.block, at: 0.52 }), slalom({ costume: o.costumes.slalom, from: 0.63, to: 0.97, count: 6, loss: 0.3 })],
    }],
    waves: { groups: 5, gap: 0.15, jitter: 0.05 },
  }),

  /** Tunnel launch: down the steep plunge from the gate, through the first pile-up and into a tunnel where the gate's funnel ends, out into daylight. */
  'tunnel-launch': (o) => ({
    sections: [
      { key: 'portal', name: 'To the portal', shape: plunge(55, { grade: 0.6 }), obstacles: [pileUp({ costume: o.costumes.block, at: 0.61 }), slalom({ costume: o.costumes.slalom, from: 0.8, to: 0.97, count: 2, loss: 0.3 })] },
      { key: 'tunnel', name: 'Launch tunnel', shape: plunge(45, { grade: 0.6 }), tunnel: o.tunnel ?? 'rock', obstacles: [slalom({ costume: o.costumes.slalom, from: 0.1, to: 0.6, count: 4, loss: 0.3 })] },
    ],
  }),

  /** Banked first turn: a shorter plunge straight into a steep banked sweep; the field fans up the wall. */
  'banked-turn': (o) => ({
    sections: [
      { key: 'plunge', name: 'Start plunge', shape: plunge(80, { grade: 0.6 }), obstacles: classicObstacles(o.costumes) },
      { key: 'turn', name: 'First turn', shape: sweep({ side: o.side ?? 'left', radius: 60, degrees: 110, grade: 0.14 }) },
    ],
  }),

  /**
   * Boost-pad launch: a gentler drop, then a strip of boost pads across the whole
   * channel, wall to wall, so every marble gets the same kick and the field
   * arrives at the first bend packed together.
   */
  'boost-launch': (o) => ({
    sections: [
      { key: 'drop', name: 'Launch drop', shape: plunge(70, { grade: 0.35 }), obstacles: [pileUp({ costume: o.costumes.block, at: 0.5 })] },
      { key: 'launch', name: 'Launch strip', shape: straight(30, { grade: 0.3 }), features: [boost({ at: 0.2, halfWidth: 5.2, length: 10 })] },
      { key: 'plunge', name: 'After the launch', shape: plunge(50, { grade: 0.45, from: 0.3 }), obstacles: [slalom({ costume: o.costumes.slalom, from: 0.3, to: 0.95, count: 6, loss: 0.3 })] },
    ],
  }),

  /** Funnel drop: a longer bowl at the gate (82 m against the usual 70 m), a longer slalom out of it; the order mixes as the field squeezes into the channel. */
  'funnel-drop': (o) => ({
    sections: [{ key: 'plunge', name: 'Bowl', shape: plunge(95, { grade: 0.6 }), obstacles: [pileUp({ costume: o.costumes.block, at: 0.4 }), slalom({ costume: o.costumes.slalom, from: 0.5, to: 0.97, count: 7, loss: 0.3 })] }],
    funnel: { length: 82 },
  }),

  /** Crest start: the steep plunge and its pile-up and slalom, then a short climb and over a rounded crest; the field bunches on the climb and spills over in a new order. */
  'crest-start': (o) => ({
    sections: [
      { key: 'plunge', name: 'Start plunge', shape: plunge(80, { grade: 0.6 }), obstacles: classicObstacles(o.costumes) },
      { key: 'climb', name: 'The crest', shape: climb(12, { grade: -0.06, after: 0.3 }) },
      { key: 'drop', name: 'Over the top', shape: plunge(40, { grade: 0.5, from: 0.3 }) },
    ],
  }),

  // ── Varied starts (October 2026): no pile-up and slalom after the gate. Without the pile-up's luck the
  // strongest marbles win too often (57% against the usual 42%), so a track starting with one of these
  // has its pile-up later on (the recipe's rule): the luck stays, the first seconds differ.

  /** Clean drop: a plunge with nothing in it, at full speed into deep, tight S-bends that shuffle the field. */
  'clean-drop': (o) => ({
    sections: [
      { key: 'plunge', name: 'Start plunge', shape: plunge(70, { grade: 0.5 }) },
      { key: 'bends', name: 'First S-bends', shape: sBends({ first: o.side === 'right' ? 'right' : 'left', radius: 55, degrees: 110, grade: 0.13 }) },
    ],
    waves: { groups: 5, gap: 0.3, jitter: 0.1 },
  }),

  /** Peg drop: a slightly gentler plunge through a scatter of single pegs, left and right, the field threading through. */
  'peg-drop': (o) => ({
    sections: [{
      key: 'plunge', name: 'Peg drop', shape: plunge(90, { grade: 0.5 }),
      obstacles: [['left', 0.3], ['right', 0.4], ['left', 0.5], ['right', 0.6], ['left', 0.7], ['right', 0.8], ['center', 0.9]].map(([line, at]) => peg({ costume: o.costumes.peg, at, line })),
    }],
    waves: { groups: 5, gap: 0.3, jitter: 0.1 },
  }),

  /** Pipe drop: a short plunge straight into a half-pipe, the field rocking from wall to wall down its U. */
  'pipe-drop': (o) => ({
    sections: [
      { key: 'plunge', name: 'Start plunge', shape: plunge(60, { grade: 0.55 }) },
      { key: 'pipe', name: 'Half-pipe', shape: halfPipe({ first: o.side === 'right' ? 'right' : 'left', width: 8, swings: 4, radius: 150, degrees: 18, grade: 0.12 }) },
    ],
    waves: { groups: 5, gap: 0.3, jitter: 0.1 },
  }),
};

/**
 * Two parallel chutes, side by side, a low wedge between them, merging at the end
 * (the split-and-merge opening's middle). Straight and the same length both ways.
 */
function twinChutes(length, { grade = 0.45 } = {}) {
  return { shape: 'twinChutes', parts: [{ kind: 'straight', length, grade }], fork: { chutes: true, radius: 2.5, apart: 5, tipOffset: 0, left: { drag: 1, scrub: 1 }, right: { drag: 1, scrub: 1 } } };
}

const OPENING_KINDS = Object.keys(OPENINGS);
// Dressing an opening: what may change (looks only) on each of its sections.
const DRESS = ['name', 'scenery', 'landmarks', 'billboards', 'billboardFrame', 'surface', 'figures', 'overhead', 'tunnel', 'height', 'water', 'waterCurtain', 'stadium', 'river'];

/**
 * An opening from the library. `costumes`: what its obstacles look like
 * ({ block, slalom, peg }); `names`: { <key>: 'Section name' }; `dress`:
 * { <key>: { scenery, landmarks, … } }; `side` (banked-turn): which way the
 * first turn goes; `tunnel` (tunnel-launch): the tunnel's look.
 */
function opening(kind, { costumes = {}, names = {}, dress = {}, ...o } = {}) {
  const make = OPENINGS[kind];
  if (!make) throw new Error(`unknown opening ${JSON.stringify(kind)} (${OPENING_KINDS.join(', ')})`);
  const made = make({ ...o, costumes });
  const sections = made.sections.map(({ key, ...sec }) => {
    const extra = dress[key] ?? {};
    for (const k of Object.keys(extra)) if (!DRESS.includes(k)) throw new Error(`opening ${kind}: "${k}" cannot be changed on its ${key} section (only ${DRESS.join(', ')})`);
    return { ...sec, ...extra, ...(names[key] && { name: names[key] }), openingKey: key };
  });
  return { kind, sections, ...(made.waves && { waves: made.waves }), ...(made.funnel && { funnel: made.funnel }) };
}

module.exports = { opening, twinChutes, OPENING_KINDS };
