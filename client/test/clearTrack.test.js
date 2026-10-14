// The clear-track check (src/three/scenery/clearCheck.js) on the tracks where
// scenery patches were first seen over the track (Aturi Arcade, Bullet Hell),
// phone and computer: nothing drawn round the track reaches inside it. The full
// reports (scripts/track-report.js) and scripts/clear-check.js --all run it on
// every track, with the follow camera's path too.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { buildScenery } from '../src/three/scenery';
import { buildStructures } from '../src/three/structures';
import { buildBillboards } from '../src/three/billboards';
import { themeFor } from '../src/three/themes';
import { corridorIntrusions, markStructures, nameOf, pieceFinder, stretchesOf, trackCorridor, tunnelAllowance } from '../src/three/scenery/clearCheck';

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../src/game/physicsTracks');

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

function intrusions(slug, lite) {
  const track = physicsTrack(slug);
  const centerline = buildCenterline(track);
  const channel = channelOf(track, centerline);
  const scenery = buildScenery(themeFor(track.slug, track), centerline, track, { lite });
  const structures = buildStructures(centerline, channel, track.physics.kit, { lite });
  const boards = buildBillboards(centerline, channel, track.physics.kit, { lite });
  const drawn = [];
  for (const g of [scenery, structures?.group, boards?.group].filter(Boolean)) {
    g.updateMatrixWorld(true);
    g.traverse((o) => { if (o.isMesh && o.visible && !o.material?.transparent && !/^tunnel/.test(nameOf(o))) drawn.push(o); });
  }
  markStructures(structures?.group);
  return stretchesOf(corridorIntrusions(centerline, channel, drawn, { pieceAt: pieceFinder(scenery), allowed: tunnelAllowance(track.physics.kit) }), channel.arc);
}

describe('clear track: no scenery inside the track', () => {
  for (const slug of ['aturi-arcade', 'bullet-hell']) {
    for (const lite of [false, true]) {
      it(`${slug}, ${lite ? 'phone' : 'computer'}`, () => {
        expect(intrusions(slug, lite)).toEqual([]);
      }, 120_000);
    }
  }

  it('the track corridor: a point over the ice is inside, one well off to the side is not', () => {
    const track = physicsTrack('bullet-hell');
    const centerline = buildCenterline(track);
    const channel = channelOf(track, centerline);
    const corridor = trackCorridor(centerline, channel);
    const s = centerline.samples[Math.round(centerline.segments * 0.3)];
    expect(corridor.inside(s.pos.x, s.pos.y + 0.5, s.pos.z)).toBe(true);
    const away = s.pos.clone().addScaledVector(s.side ?? new Vector3(1, 0, 0), 300);
    expect(corridor.inside(away.x, away.y, away.z)).toBe(false);
  });
});
