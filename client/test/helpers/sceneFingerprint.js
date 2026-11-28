// Scene fingerprints: a hash of everything the 3D view builds for a track (the
// channel or road, the obstacles, boosts and bumps, and the scenery), on phones
// and on computers. The track kit is built around today's tracks; their
// fingerprints prove they still look exactly as before, down to every vertex
// and colour. Rounded to a millimetre so it never trips on floating-point dust.
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { Mesh } from 'three';
import { buildCenterline, buildTrackGeometry, TRACK_STYLE } from '../../src/three/trackModel';
import { buildIceChannelGeometry, channelOf } from '../../src/three/iceChannel';
import { buildTrackFeatures } from '../../src/three/trackFeatures';
import { buildScenery } from '../../src/three/scenery';
import { themeFor } from '../../src/three/themes';
import { realTracks } from './tracks';

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../../src/game/physicsTracks');

// The 3D view draws onto canvases; tests run without a browser.
const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

export const PHYSICS_SLUGS = ['bobsleigh-run', 'san-francisco', 'table-mountain-run'];
export const CLASSIC_SLUGS = ['meadow-loop', 'canyon-drop', 'volcano-run'];

const round = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : String(x));
const numbers = (arr) => (arr ? Array.from(arr, round) : null);

function materialKey(m) {
  if (!m) return null;
  if (Array.isArray(m)) return m.map(materialKey);
  return {
    type: m.type,
    color: m.color?.getHexString?.() ?? null,
    emissive: m.emissive?.getHexString?.() ?? null,
    opacity: round(m.opacity ?? 1),
    transparent: !!m.transparent,
    vertexColors: !!m.vertexColors,
    side: m.side ?? null,
    map: !!m.map,
  };
}

function geometryKey(g) {
  if (!g) return null;
  const attrs = {};
  for (const name of Object.keys(g.attributes).sort()) attrs[name] = numbers(g.attributes[name].array);
  return { attrs, index: numbers(g.index?.array), groups: g.groups?.map((x) => [x.start, x.count, x.materialIndex ?? 0]) ?? [] };
}

/** A hash of everything drawable in an object tree, in a fixed order. */
export function objectFingerprint(root) {
  if (!root) return 'none';
  root.updateMatrixWorld(true);
  const h = crypto.createHash('sha256');
  let n = 0;
  root.traverse((o) => {
    if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
    n += 1;
    h.update(JSON.stringify({
      kind: o.type,
      name: o.name || '',
      visible: o.visible,
      matrix: numbers(o.matrixWorld.elements),
      material: materialKey(o.material),
      geometry: geometryKey(o.geometry),
      instances: o.isInstancedMesh ? { count: o.count, matrices: numbers(o.instanceMatrix.array.slice(0, o.count * 16)), colors: numbers(o.instanceColor?.array) } : null,
    }));
  });
  return `${n}:${h.digest('hex').slice(0, 24)}`;
}

/** Everything the 3D view builds for one track, fingerprinted part by part. */
export function sceneFingerprints(track) {
  const centerline = buildCenterline(track);
  const theme = themeFor(track.slug);
  const channel = channelOf(track, centerline);
  const out = {};
  if (channel) {
    out.channel = objectFingerprint(new Mesh(buildIceChannelGeometry(centerline, channel)));
    if (channel.look === 'street') {
      out.channelPhone = objectFingerprint(new Mesh(buildIceChannelGeometry(centerline, channel, { segmentsAcross: 20 })));
    }
    out.features = objectFingerprint(buildTrackFeatures(centerline, channel, track.physics?.features, { lite: false })?.group);
    out.featuresPhone = objectFingerprint(buildTrackFeatures(centerline, channel, track.physics?.features, { lite: true })?.group);
  } else {
    const style = { ...TRACK_STYLE, colors: { ...TRACK_STYLE.colors, ...theme.track } };
    out.road = objectFingerprint(new Mesh(buildTrackGeometry(track, centerline, style)));
  }
  if (theme.scenery) {
    out.scenery = objectFingerprint(buildScenery(theme, centerline, track, { lite: false }));
    out.sceneryPhone = objectFingerprint(buildScenery(theme, centerline, track, { lite: true }));
  }
  out.theme = crypto.createHash('sha256').update(JSON.stringify(theme)).digest('hex').slice(0, 24);
  return out;
}

/** The tracks fingerprinted: today's physics tracks (from code) and the classic tracks (from the data updates). */
export function fingerprintedTracks() {
  const classic = realTracks().filter((t) => CLASSIC_SLUGS.includes(t.slug));
  return [...PHYSICS_SLUGS.map((s) => physicsTrack(s)), ...classic];
}
