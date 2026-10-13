import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AmbientLight, CircleGeometry, Color, DirectionalLight, HemisphereLight, Mesh, MeshPhongMaterial, PerspectiveCamera, Scene,
  SphereGeometry, Vector3, WebGLRenderer,
} from 'three';
import { api } from '../../api/client';
import { useTrackScene } from '../../hooks/useTrackScene';
import { ITEMS } from '../../shared/marbles';
import { createMarbleLook } from '../../shared/marbles/materials';
import MarbleBadge from '../marbles/MarbleBadge';

/**
 * Colour check (a preview page, not linked): one design's five shades as the
 * flat shop picture (the master) above the 3D marble, in the showroom or on a
 * real track, by day or by night.
 *   /preview/marbles/compare?design=steelie&where=room|track&night&track=<slug>
 * Screenshots crop each marble using window.__compare (pixel boxes per shade).
 */
const SIZE = 120;

/** Where each marble's ball lands on the canvas: [{ x, y, w, h }] in CSS pixels. */
function boxesOf(positions, radius, camera, canvas) {
  const rect = canvas.getBoundingClientRect();
  const up = new Vector3();
  return positions.map((p) => {
    const c = p.clone().project(camera);
    up.copy(camera.up).applyQuaternion(camera.quaternion).normalize();
    const e = p.clone().addScaledVector(new Vector3(1, 0, 0).applyQuaternion(camera.quaternion), radius).project(camera);
    const cx = rect.left + ((c.x + 1) / 2) * rect.width; const cy = rect.top + ((1 - c.y) / 2) * rect.height;
    const r = Math.abs(((e.x - c.x) / 2) * rect.width);
    return { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r };
  });
}

function useRoom(canvasRef, slugs, night, on) {
  useEffect(() => {
    if (!on) return undefined;
    const canvas = canvasRef.current;
    const renderer = new WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(1);
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    // The showroom's own scene (MarbleShowroom): its sky, floor and lights.
    const scene = new Scene();
    scene.background = new Color(night ? '#070b1a' : '#9cc6ec');
    scene.add(new HemisphereLight(night ? '#5f7fbf' : '#ffffff', night ? '#141c30' : '#6b7a5a', night ? 0.6 : 1.4));
    scene.add(new AmbientLight('#ffffff', night ? 0.15 : 0.3));
    const sun = new DirectionalLight(night ? '#bcd0ff' : '#fff4e0', night ? 0.6 : 2.2);
    sun.position.set(-4, 8, 6);
    scene.add(sun);
    const floor = new Mesh(new CircleGeometry(12, 64), new MeshPhongMaterial({ color: night ? '#1b2235' : '#d9dee8', shininess: 8 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const camera = new PerspectiveCamera(20, w / h, 0.1, 200);
    camera.position.set(0, 3, 22);
    camera.lookAt(0, 1, 0);
    const geometry = new SphereGeometry(1, 48, 32);
    const looks = slugs.map((slug, k) => {
      const look = createMarbleLook(slug, { radius: 1, geometry });
      look.setNight(night);
      look.object.position.set((k - 2) * 2.6, 1, 0);
      // As the shop picture shows it (a cat's-eye vane seen down its axis); on the track they land as they roll.
      look.object.rotation.set(Math.PI / 2, 0, 0);
      look.update(0.3);
      scene.add(look.object);
      return look;
    });
    renderer.render(scene, camera);
    window.__compare = { boxes: boxesOf(looks.map((l) => l.object.position), 1, camera, canvas), ready: true };
    return () => { looks.forEach((l) => l.dispose()); renderer.dispose(); window.__compare = null; };
  }, [canvasRef, slugs.join(), night, on]);
}

function useTrack(sceneRef, status, slugs, trackSlug, night, on) {
  useEffect(() => {
    if (!on || status !== 'ready') return;
    const scene = sceneRef.current;
    (async () => {
      const { track } = await api.track(trackSlug);
      // The same track by day or under the night preset (floodlights), whatever the track allows.
      const kit = track.physics?.kit;
      const lit = kit ? { ...track, physics: { ...track.physics, kit: { ...kit, lighting: night ? 'night' : 'day', variants: [] } } } : track;
      scene.setTrack(lit);
      scene.setRace(slugs.map((slug, k) => ({ index: k, marble: { look: slug, name: slug } })));
      const frame = { t: 4000, p: slugs.map(() => 0.035), l: [-0.32, -0.16, 0, 0.16, 0.32], h: slugs.map(() => 0) };
      scene.updateRace(frame, 'leader');
      scene.marbles.setScale(1);
      scene.marbles.update(scene.centerline, frame);
      const pos = slugs.map((_, k) => scene.marbles.positionOf(k).clone());
      for (const l of scene.marbles.looks) l.update(0.3);
      const mid = pos.reduce((a, p) => a.add(p), new Vector3()).multiplyScalar(1 / pos.length);
      const across = pos[pos.length - 1].clone().sub(pos[0]);
      const width = across.length() + 2;
      across.normalize();
      const forward = new Vector3(0, 1, 0).cross(across).normalize();
      const cam = scene.camera;
      cam.fov = 24;
      cam.near = 0.1;
      cam.updateProjectionMatrix();
      cam.position.copy(mid).addScaledVector(forward, (width / (2 * Math.tan((12 * Math.PI) / 180))) * 1.05).add(new Vector3(0, 1.2, 0));
      cam.lookAt(mid);
      scene.render();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.__compare = { boxes: boxesOf(pos, 0.55, cam, scene.renderer.domElement), ready: true, track: track.name };
      }));
    })().catch((err) => { window.__compare = { error: String(err) }; });
  }, [status, slugs.join(), trackSlug, night, on]);
}

export default function MarbleCompare() {
  const [search] = useSearchParams();
  const design = search.get('design') ?? 'steelie';
  const night = search.has('night');
  const where = search.get('where') ?? 'room';
  const trackSlug = search.get('track') ?? 'stockholm-marble-grand-prix';
  const [slugs] = useState(() => ITEMS.filter((i) => i.design.key === design).map((i) => i.slug));
  const roomRef = useRef(null);
  const { wrapRef, canvasRef, sceneRef, status } = useTrackScene();
  useRoom(roomRef, slugs, night, where === 'room');
  useTrack(sceneRef, status, slugs, trackSlug, night, where === 'track');

  return (
    <div style={{ background: night ? '#070b1a' : '#0e1420', padding: 16, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 36, justifyContent: 'center' }}>
        {slugs.map((s) => <span key={s} data-badge={s}><MarbleBadge slug={s} size={SIZE} still /></span>)}
      </div>
      {where === 'room'
        ? <canvas ref={roomRef} style={{ width: 960, height: 360, display: 'block', margin: '0 auto' }} />
        : (
          <div ref={wrapRef} style={{ width: 960, height: 420, margin: '0 auto', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
        )}
    </div>
  );
}
