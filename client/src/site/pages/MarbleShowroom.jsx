import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AmbientLight, CircleGeometry, Color, DirectionalLight, Fog, HemisphereLight, Mesh, MeshPhongMaterial,
  PerspectiveCamera, Quaternion, RingGeometry, Scene, SphereGeometry, Vector3, WebGLRenderer,
} from 'three';
import { DESIGN, ITEMS, priceLabel, rarityInfo } from '../../shared/marbles';
import { BUILT_MATERIALS, createMarbleLook } from '../../shared/marbles/materials';

/**
 * The marble showroom (/preview/marbles): the collection looks in real 3D, for
 * reviewing them. "Look" shows one design's five shades rolling on a turntable;
 * "Race of 20" sends 20 decorated marbles round an oval and measures the frame
 * time, to check a phone keeps up. Day and night lighting.
 */
const RADIUS = 0.55;
const UP = new Vector3(0, 1, 0);
const BUILT = [...new Set(ITEMS.filter((i) => BUILT_MATERIALS.includes(i.design.material)).map((i) => i.design.key))];
// The race of 20: every finished look (each shade), round again until there are 20.
const RACE_LOOKS = ITEMS.filter((i) => BUILT_MATERIALS.includes(i.design.material) && !i.design.limited).map((i) => i.slug);

function useShowroom(canvasRef, { mode, design, night, plain }) {
  const [fps, setFps] = useState(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const renderer = new WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2 });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new Scene();
    const sky = new Color(night ? '#070b1a' : '#9cc6ec');
    scene.background = sky;
    scene.fog = new Fog(sky, 30, 90);
    scene.add(new HemisphereLight(night ? '#5f7fbf' : '#ffffff', night ? '#141c30' : '#6b7a5a', night ? 0.6 : 1.4));
    scene.add(new AmbientLight('#ffffff', night ? 0.15 : 0.3));
    const sun = new DirectionalLight(night ? '#bcd0ff' : '#fff4e0', night ? 0.6 : 2.2);
    sun.position.set(-4, 8, 6);
    scene.add(sun);

    const race = mode === 'race';
    const floor = new Mesh(race ? new RingGeometry(9, 15, 96) : new CircleGeometry(6, 64), new MeshPhongMaterial({ color: night ? '#1b2235' : '#d9dee8', shininess: 8 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const camera = new PerspectiveCamera(race ? 50 : 32, 1, 0.1, 200);
    if (race) camera.position.set(0, 16, 20); else camera.position.set(0, 2.4, 7.2);
    camera.lookAt(0, race ? 0 : 0.5, 0);

    const geometry = new SphereGeometry(RADIUS, 24, 16);
    const slugs = race
      ? Array.from({ length: 20 }, (_, k) => RACE_LOOKS[k % RACE_LOOKS.length])
      : ITEMS.filter((i) => i.design.key === design).map((i) => i.slug);
    const plainMat = new MeshPhongMaterial({ color: '#e0115f', shininess: 90 });
    const looks = slugs.map((slug) => {
      // ?plain: the old one-colour marbles, as a baseline for the frame-time check.
      const look = plain
        ? { object: new Mesh(geometry, plainMat), update() {}, setNight() {}, dispose() {}, trail: null }
        : createMarbleLook(slug, { radius: RADIUS, geometry });
      look.setNight(night);
      scene.add(look.object);
      if (look.trail) scene.add(look.trail);
      return { look, angle: 0, last: null };
    });

    const resize = () => {
      const w = canvas.clientWidth; const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const q = new Quaternion(); const axis = new Vector3(); const move = new Vector3();
    let raf = 0; let frames = 0; let since = performance.now(); let worst = 0; let prev = since;
    const start = since;
    const tick = (now) => {
      const t = (now - start) / 1000;
      worst = Math.max(worst, now - prev);
      prev = now;
      looks.forEach((m, i) => {
        const p = m.look.object.position;
        if (race) {
          // An oval pack: each marble at its own pace, weaving across the lanes.
          const a = t * (0.32 + 0.03 * Math.sin(i * 1.7)) + i * 0.21;
          const r = 12 + Math.sin(t * 0.9 + i) * 2.2;
          p.set(Math.cos(a) * r, RADIUS, Math.sin(a) * r);
        } else {
          const n = looks.length;
          const a = t * 0.35 + (i / n) * Math.PI * 2;
          p.set(Math.cos(a) * 2.2, RADIUS, Math.sin(a) * 2.2);
        }
        if (m.last) {
          move.subVectors(p, m.last);
          const d = move.length();
          if (d > 1e-5) {
            axis.crossVectors(UP, move).normalize();
            q.setFromAxisAngle(axis, d / RADIUS);
            m.look.object.quaternion.premultiply(q);
          }
        } else {
          m.last = new Vector3();
        }
        m.last.copy(p);
        m.look.update(t, p);
      });
      renderer.render(scene, camera);
      frames += 1;
      if (now - since > 1000) {
        setFps({ fps: Math.round((frames * 1000) / (now - since)), worstMs: Math.round(worst), calls: renderer.info.render.calls });
        frames = 0; since = now; worst = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      for (const { look } of looks) look.dispose();
      geometry.dispose();
      plainMat.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      renderer.dispose();
    };
  }, [canvasRef, mode, design, night, plain]);
  return fps;
}

export default function MarbleShowroom() {
  const canvasRef = useRef(null);
  const [search] = useSearchParams();
  const plain = search.has('plain');
  const [mode, setMode] = useState(search.get('mode') === 'race' ? 'race' : 'look');
  const [design, setDesign] = useState(BUILT.includes(search.get('design')) ? search.get('design') : BUILT[0]);
  const [night, setNight] = useState(search.has('night'));
  const fps = useShowroom(canvasRef, { mode, design, night, plain });
  const d = DESIGN[design];

  return (
    <div className="ms-page">
      <div style={{ display: 'grid', gap: 8 }}>
        <div className="ms-eyebrow">Preview · marble looks</div>
        <h1 className="ms-h1">Marble showroom</h1>
        <p className="ms-lede">Every collection look in real 3D, as it races. Looks only: every marble races exactly the same.</p>
      </div>
      <div className="ms-row" role="group" aria-label="Showroom">
        <button type="button" className={`ms-btn ms-btn--sm ${mode === 'look' ? 'ms-btn--primary' : ''}`} onClick={() => setMode('look')}>Look</button>
        <button type="button" className={`ms-btn ms-btn--sm ${mode === 'race' ? 'ms-btn--primary' : ''}`} onClick={() => setMode('race')}>Race of 20</button>
        <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" onClick={() => setNight((n) => !n)}>{night ? 'Day' : 'Night'}</button>
      </div>
      {mode === 'look' && (
        <div className="ms-row" role="group" aria-label="Design">
          {BUILT.map((k) => (
            <button key={k} type="button" className={`ms-btn ms-btn--sm ${k === design ? 'ms-btn--primary' : ''}`} onClick={() => setDesign(k)}>{DESIGN[k].name}</button>
          ))}
        </div>
      )}
      <canvas ref={canvasRef} style={{ width: '100%', height: 'min(62vh, 520px)', borderRadius: 20, display: 'block', touchAction: 'none' }} />
      <p className="ms-placeholder" style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
        {fps ? `${fps.fps} fps · slowest frame ${fps.worstMs} ms · ${fps.calls} draw calls` : 'Measuring…'}
      </p>
      {mode === 'look' && d && (
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <div className="ms-row"><span className="ms-tag" style={{ color: rarityInfo(d.rarity).colour }}>{rarityInfo(d.rarity).label}</span><span className="ms-coins">{priceLabel(rarityInfo(d.rarity).price)}</span></div>
          <h2 className="ms-h2">{d.name}</h2>
          <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--ms-soft)' }}>{d.story}</p>
          <p style={{ margin: 0, color: 'var(--ms-muted)' }}><b>In races:</b> {d.inRaces}</p>
          <div className="ms-grid">
            {d.shades.map((s) => (
              <div key={s.key} style={{ display: 'grid', gap: 4 }}>
                <b>{s.name}{s.original ? ' (original)' : ''}</b>
                <span style={{ color: 'var(--ms-soft)' }}>{s.description}</span>
                <span style={{ color: 'var(--ms-muted)', fontSize: '0.85rem' }}>{s.colours.map((c) => c.name).join(' · ')}</span>
                {s.text === 'review' && <span className="ms-tag" style={{ justifySelf: 'start' }}>Text for review</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
