// The clear-track check's "inside the track" part alone, for many tracks at once (no races needed):
//   REPORT_TRACKS=<a.json,b.json,…> REPORT_OUT=<out.json> npx vitest run --config report/vitest.config.js report/corridor.report.js
// (scripts/clear-check.js and the full report run it with the camera checks, through report/viewChecks.report.js.)
import fs from 'node:fs';
import { it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { buildScenery } from '../src/three/scenery';
import { buildStructures } from '../src/three/structures';
import { buildBillboards } from '../src/three/billboards';
import { themeFor } from '../src/three/themes';
import { corridorIntrusions, markStructures, nameOf, pieceFinder, stretchesOf, tunnelAllowance } from '../src/three/scenery/clearCheck';

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

it.skipIf(!process.env.REPORT_TRACKS)('clear track: nothing inside the track', () => {
  const out = fs.existsSync(process.env.REPORT_OUT) ? JSON.parse(fs.readFileSync(process.env.REPORT_OUT, 'utf8')) : {};
  for (const file of process.env.REPORT_TRACKS.split(',')) {
    const track = JSON.parse(fs.readFileSync(file, 'utf8'));
    const centerline = buildCenterline(track);
    const channel = channelOf(track, centerline);
    const res = {};
    for (const lite of [false, true]) {
      const scenery = buildScenery(themeFor(track.slug, track), centerline, track, { lite });
      const structures = channel && track.physics?.kit ? buildStructures(centerline, channel, track.physics.kit, { lite }) : null;
      const boards = channel && track.physics?.kit ? buildBillboards(centerline, channel, track.physics.kit, { lite }) : null;
      const drawn = [];
      for (const g of [scenery, structures?.group, boards?.group].filter(Boolean)) {
        g.updateMatrixWorld(true);
        g.traverse((o) => { if (o.isMesh && o.visible && !o.material?.transparent && !/^tunnel/.test(nameOf(o))) drawn.push(o); });
      }
      markStructures(structures?.group);
      const hits = corridorIntrusions(centerline, channel, drawn, { pieceAt: pieceFinder(scenery), allowed: tunnelAllowance(track.physics?.kit) });
      let triangles = 0;
      scenery?.traverse((o) => { if (o.isMesh) triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.getAttribute('position').count) / 3; });
      res[lite ? 'phone' : 'computer'] = { stretches: stretchesOf(hits, channel.arc), samples: hits.length, hits: hits.slice(0, 40), triangles: Math.round(triangles) };
    }
    out[track.slug] = res;
    fs.writeFileSync(process.env.REPORT_OUT, JSON.stringify(out, null, 1));
  }
});
