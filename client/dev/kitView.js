// Kit view (development only, not part of the site): draws a track straight
// from its track file, with no server or database, so its costumes, scenery
// and billboards can be looked at and photographed.
//   node scripts/dump-kit-track.js <slug>        (writes client/dev/.tracks/<slug>.json)
//   npm run dev, then open /dev/kit-view.html?track=<slug>[&lite=1][&scenery=0]
// window.kitView.shot({ at, l, back, up, side }) puts the camera `back` metres
// up the track from a spot (`at`: share of the way down, `l`: share of the way
// up the wall), `up` metres above it, and draws one frame.
import { Vector3 } from 'three';
import { TrackScene } from '../src/three/TrackScene';

const params = new URLSearchParams(window.location.search);
const slug = params.get('track') || 'kit-proving-ground';
const track = await (await fetch(`./.tracks/${slug}.json`)).json();
const canvas = document.getElementById('view');
const scene = new TrackScene(canvas, { interactive: false, lite: params.get('lite') === '1', scenery: params.get('scenery') !== '0' });
scene.setSize(window.innerWidth, window.innerHeight);
scene.setTrack(track);

const at = (p) => {
  const { samples, segments } = scene.centerline;
  const f = Math.min(1, Math.max(0, p)) * segments;
  const i = Math.min(segments - 1, Math.floor(f));
  const a = samples[i];
  const b = samples[i + 1];
  return { pos: new Vector3().lerpVectors(a.pos, b.pos, f - i), side: new Vector3(a.side.x, 0, a.side.z).normalize() };
};

window.kitView = {
  track,
  ready: new Promise((resolve) => setTimeout(resolve, 400)), // the scenery is built a moment after the track
  /** Moves the camera to look at a spot on the track and draws one frame, at race time `t` ms. */
  shot({ at: p, l = 0, back = 12, up = 5, side = 0, t = 0 }) {
    const arc = scene.channel?.arc ?? scene.centerline.length ?? 1000;
    const target = at(p);
    const from = at(p - back / arc);
    const across = (scene.channel ? scene.channel.radius * scene.channel.maxAngle : 4) * l;
    const look = target.pos.clone().addScaledVector(target.side, across).add(new Vector3(0, 1, 0));
    scene.camera.position.copy(from.pos).addScaledVector(from.side, across + side).add(new Vector3(0, up, 0));
    scene.camera.near = 0.3;
    scene.camera.far = 3000;
    scene.camera.lookAt(look);
    scene.camera.updateProjectionMatrix();
    scene.features?.update(t);
    scene.renderer.info.reset();
    scene.renderer.render(scene.scene, scene.camera);
    return { calls: scene.renderer.info.render.calls, triangles: scene.renderer.info.render.triangles };
  },
};
