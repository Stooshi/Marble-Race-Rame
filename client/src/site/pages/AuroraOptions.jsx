import { useEffect, useRef } from 'react';
import {
  AmbientLight, CircleGeometry, Color, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer,
} from 'three';
import { GLOSS, badgeOf } from '../../shared/marbles/badge';
import { toCss, cssDrawable } from '../../shared/marbles/paint';
import { createCustomLook, createMarbleLook } from '../../shared/marbles/materials';
import { pictureBackground } from '../marbles/picture';
import { AURORA_OPTIONS } from '../marbles/auroraOptions';

/**
 * Northern Lights design options (a preview page, not linked, not indexed):
 *   /preview/marbles/northern-lights
 * The current limited edition and four new options, each as the shop picture (large, and at the
 * shop card's size) and as the 3D marble rolling, on a light and a dark background. Nothing here
 * changes the shop or the catalogue.
 */
const CURRENT = 'aurora-aurora';
const UP = new Vector3(0, 1, 0);

/** The flat shop picture of a look, drawn exactly as the shop draws its badges (MarbleBadge). */
function Picture({ entry, size }) {
  const b = entry.slug ? badgeOf(entry.slug) : {
    background: cssDrawable(entry.look.layers) ? toCss(entry.look.layers) : null,
    layers: entry.look.layers,
    spin: entry.look.spin ?? null,
    glow: entry.look.glow ? `${entry.look.glow}80` : null,
  };
  const shadow = b.glow ? `0 0 ${Math.round(size / 4)}px ${b.glow}, 0 10px 20px rgba(0,0,0,0.45)` : '0 10px 20px rgba(0,0,0,0.45)';
  return (
    <span className="ms-m" style={{ width: size, height: size, boxShadow: shadow }} role="img" aria-label={`${entry.name}, shop picture`}>
      <i className={b.spin ? `ms-spin-${b.spin}` : undefined} style={{ background: pictureBackground(b, `aurora-option:${entry.key}`) }} />
      <i style={{ background: GLOSS }} />
    </span>
  );
}

/** The 3D marble rolling on the spot, as in races (the shared materials, unlit), its shadow under it. */
function Rolling({ entry, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    let renderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new Scene();
    scene.add(new AmbientLight('#ffffff', 1));
    const shadow = new Mesh(new CircleGeometry(1.15, 32), new MeshBasicMaterial({ color: new Color('#000000'), transparent: true, opacity: 0.3 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.99;
    scene.add(shadow);
    const look = entry.slug ? createMarbleLook(entry.slug, { radius: 1 }) : createCustomLook(`aurora-option:${entry.key}`, entry.look, { radius: 1 });
    scene.add(look.object);
    const camera = new PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 1.4, 6.2);
    camera.lookAt(0, -0.1, 0);
    const resize = () => {
      const w = canvas.clientWidth; const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const q = new Quaternion();
    const axis = new Vector3(1, 0, 0.25).normalize();
    let raf = 0;
    const start = performance.now();
    let prev = start;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      look.object.quaternion.premultiply(q.setFromAxisAngle(axis, (still ? 0 : 1.1) * dt));
      look.object.quaternion.premultiply(q.setFromAxisAngle(UP, (still ? 0 : 0.15) * dt));
      look.update((now - start) / 1000);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); look.dispose(); renderer.dispose(); };
  }, [entry]);
  return <canvas ref={ref} className="nl-roll" role="img" aria-label={label} />;
}

function Panel({ entry, theme }) {
  return (
    <div className={`nl-panel nl-panel--${theme}`}>
      <span className="nl-panel__label">{theme === 'light' ? 'Light' : 'Dark'}</span>
      <div className="nl-panel__pics">
        <Picture entry={entry} size={132} />
        <Picture entry={entry} size={64} />
      </div>
      <Rolling entry={entry} label={`${entry.name}, 3D marble rolling, ${theme} background`} />
    </div>
  );
}

const ENTRIES = [
  { key: 'current', letter: 'Now', name: 'Northern Lights (current)', idea: 'The October limited edition as it is today: a night sky with three soft aurora bands and a few stars.', slug: CURRENT },
  ...AURORA_OPTIONS,
];

export default function AuroraOptions() {
  // (Preview pages are kept out of search engines by pageMeta.js; this one only names its tab.)
  useEffect(() => { document.title = 'Northern Lights design options · Marble Spins'; }, []);
  return (
    <div className="nl-page">
      <style>{CSS}</style>
      <header className="nl-head">
        <span className="nl-eyebrow">Design review · not in the shop</span>
        <h1>Northern Lights: four new designs</h1>
        <p>The current limited edition, then options A to D. Each shows the shop picture (large, and at the shop card&apos;s size) and the 3D marble rolling as it does in races, on a light and a dark background. The shop picture and the 3D marble are painted from the same colours.</p>
      </header>
      {ENTRIES.map((e) => (
        <section key={e.key} className={`nl-row${e.slug ? ' nl-row--current' : ''}`} aria-labelledby={`nl-${e.key}`}>
          <div className="nl-row__text">
            <span className="nl-letter">{e.letter}</span>
            <h2 id={`nl-${e.key}`}>{e.name}</h2>
            <p>{e.idea}</p>
          </div>
          <div className="nl-row__panels">
            <Panel entry={e} theme="light" />
            <Panel entry={e} theme="dark" />
          </div>
        </section>
      ))}
      <p className="nl-foot">Pick one (or ask for changes) and it replaces the current design in the catalogue: the name, its story text and the edition stay as decided.</p>
    </div>
  );
}

const CSS = `
.nl-page { max-width: 1120px; margin: 0 auto; padding: 32px 16px 64px; color: var(--ms-text, #e8ecf4); display: grid; gap: 24px; }
.nl-head h1 { font-family: var(--ms-cond, inherit); font-size: clamp(1.8rem, 4vw, 2.6rem); margin: 4px 0 8px; text-wrap: balance; }
.nl-head p { max-width: 68ch; margin: 0; color: var(--ms-muted, #a9b1c3); line-height: 1.55; }
.nl-eyebrow { font-size: .78rem; letter-spacing: .12em; text-transform: uppercase; color: #3DDC97; font-weight: 700; }
.nl-row { display: grid; grid-template-columns: minmax(0, 260px) minmax(0, 1fr); gap: 20px; align-items: center; padding: 20px; border-radius: 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); }
.nl-row--current { border-style: dashed; }
.nl-row__text h2 { margin: 6px 0; font-size: 1.3rem; }
.nl-row__text p { margin: 0; color: var(--ms-muted, #a9b1c3); line-height: 1.5; font-size: .95rem; }
.nl-letter { display: inline-grid; place-items: center; min-width: 34px; height: 34px; padding: 0 8px; border-radius: 10px; background: #3DDC97; color: #0B1430; font-weight: 800; }
.nl-row--current .nl-letter { background: #6b7590; color: #fff; }
.nl-row__panels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.nl-panel { position: relative; border-radius: 14px; padding: 16px; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: center; min-height: 190px; }
.nl-panel--light { background: #f2f4f8; }
.nl-panel--dark { background: #0b1020; }
.nl-panel__label { position: absolute; top: 8px; right: 12px; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: #8a93a8; }
.nl-panel__pics { display: grid; gap: 14px; justify-items: center; }
.nl-roll { width: 100%; height: 170px; display: block; }
.nl-foot { color: var(--ms-muted, #a9b1c3); }
@media (max-width: 820px) {
  .nl-row { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .nl-row__panels { grid-template-columns: minmax(0, 1fr); }
}
`;
