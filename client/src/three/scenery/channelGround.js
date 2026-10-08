/**
 * Shared by the sceneries built around a racing channel (San Francisco's
 * street, Bobsleigh Run's ice): the ground that hugs the channel, and drawing
 * many copies of a thing in tiles so only those in view are drawn.
 */
import { Group, InstancedMesh, Vector3 } from 'three';
import { channelLipAt, channelOf, channelRadiusAt, forkAt, forkOffset, forkRadius } from '../iceChannel';
import { PEN_DROP } from '../marbles';

/**
 * How the ground meets a track's channel (null for a track without one):
 * `street` for makeHeightField (the channel's half-width with `rim` metres of
 * pavement or snow bank, and the height of its rim), and `groundLine`, the
 * centre line carried on through the catch area past the finish so the ground
 * never buries it. dip / under: see makeHeightField (coarse ground on phones).
 */
export function channelGround(centerline, track, { rim, dip = 0, under = 2 }) {
  const channel = channelOf(track, centerline);
  if (!channel) return null;
  const pen = channel.runout ?? null;
  const { segments } = centerline;
  const step = channel.arc / segments;
  const halfAt = (i) => {
    if (i > segments) return pen.halfWidth + 0.3 + rim;
    const s = i * step;
    // The splitter: two channels side by side.
    const fork = forkAt(channel, s);
    if (fork) return Math.abs(forkOffset(fork, s)) + forkRadius(fork, channel.radius, s) * Math.sin(channel.maxAngle) + rim;
    return channelRadiusAt(channel, s) * Math.sin(channelLipAt(channel, s)) + rim;
  };
  const liftAt = (i) => (i > segments ? 1.6 : channelRadiusAt(channel, i * step) * (1 - Math.cos(channelLipAt(channel, i * step))));
  let groundLine = centerline;
  if (pen) {
    const end = centerline.samples[segments];
    const forward = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
    const more = [];
    for (let d = step; d <= pen.length + 1; d += step) {
      const pos = end.pos.clone().addScaledVector(forward, d);
      pos.y -= d * PEN_DROP;
      more.push({ ...end, pos });
    }
    groundLine = { ...centerline, samples: [...centerline.samples, ...more] };
  }
  return { channel, pen, groundLine, street: { dip, under, halfAt, liftAt } };
}

const TILE = 180; // metres: copies are drawn in blocks this size, each skipped when out of view

/**
 * Instanced copies of each geometry in `geometries` (sharing the materials),
 * one set per TILE-sized block of ground, so blocks out of view aren't drawn.
 * `set(mesh, i, item, n)` places copy i of geometry n. Returns one Group per geometry.
 */
export function tiledInstances(items, geometries, materials, names, set) {
  const blocks = new Map();
  for (const h of items) {
    const k = `${Math.floor(h.x / TILE)},${Math.floor(h.z / TILE)}`;
    if (!blocks.has(k)) blocks.set(k, []);
    blocks.get(k).push(h);
  }
  const groups = names.map((name) => Object.assign(new Group(), { name }));
  for (const block of blocks.values()) {
    geometries.forEach((g, n) => {
      const mesh = new InstancedMesh(g, materials[n], block.length);
      block.forEach((h, i) => set(mesh, i, h, n));
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      groups[n].add(mesh);
    });
  }
  return groups;
}
