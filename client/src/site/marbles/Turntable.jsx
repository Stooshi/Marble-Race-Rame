import { useEffect, useRef } from 'react';
import {
  AmbientLight, CircleGeometry, Color, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera,
  Quaternion, Scene, Vector3, WebGLRenderer,
} from 'three';
import { createMarbleLook, createPlainLook, glows } from '../../shared/marbles/materials';

const RADIUS = 1;
const UP = new Vector3(0, 1, 0);

/**
 * One marble in real 3D, slowly rolling on the spot, exactly as it looks in
 * races (the shared materials). Drag sideways to spin it by hand.
 * Loaded on demand, so the shop's first paint stays light.
 */
export default function Turntable({ slug, marble = null, night = false, label }) {
  const plainKey = marble ? `${marble.color_primary}|${marble.color_secondary ?? ''}|${marble.pattern ?? ''}` : '';
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || (!slug && !marble)) return undefined;
    let renderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return undefined; // no WebGL: the flat badge next to it still shows the marble
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const dark = night || (slug ? glows(slug) : false);
    const scene = new Scene();
    scene.add(new HemisphereLight('#ffffff', dark ? '#1b2235' : '#55607a', dark ? 0.7 : 1.3));
    scene.add(new AmbientLight('#ffffff', 0.25));
    const sun = new DirectionalLight('#fff4e0', dark ? 0.9 : 2);
    sun.position.set(-3, 5, 4);
    scene.add(sun);
    const shadow = new Mesh(new CircleGeometry(RADIUS * 1.2, 32), new MeshBasicMaterial({ color: new Color('#000000'), transparent: true, opacity: 0.35 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -RADIUS + 0.01;
    scene.add(shadow);
    const look = slug ? createMarbleLook(slug, { radius: RADIUS }) : createPlainLook(marble, { radius: RADIUS });
    look.setNight(dark);
    scene.add(look.object);
    const camera = new PerspectiveCamera(30, 4 / 3, 0.1, 50);
    camera.position.set(0, 1.6, 6.6);
    camera.lookAt(0, 0, 0);

    const resize = () => {
      const w = canvas.clientWidth; const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const q = new Quaternion();
    const axis = new Vector3(1, 0, 0);
    let drag = null;
    let push = 0;
    const down = (e) => { drag = e.clientX; };
    const move = (e) => { if (drag !== null) { push += (e.clientX - drag) * 0.01; drag = e.clientX; } };
    const up = () => { drag = null; };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);

    let raf = 0;
    const start = performance.now();
    let prev = start;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const roll = (still ? 0 : 0.6) * dt;
      look.object.quaternion.premultiply(q.setFromAxisAngle(axis, roll));
      if (push) { look.object.quaternion.premultiply(q.setFromAxisAngle(UP, push)); push = 0; }
      look.update((now - start) / 1000, null);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      look.dispose();
      shadow.geometry.dispose();
      shadow.material.dispose();
      renderer.dispose();
    };
  }, [slug, plainKey, night]);
  return <canvas ref={ref} className="ms-turntable" role="img" aria-label={label} />;
}
