import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Vector3 } from 'three';
import { api } from '../../api/client';
import { useTrackScene } from '../../hooks/useTrackScene';
import { frameAtTime } from '../../utils/splits';

/**
 * Rolling check (a preview page, not linked): a finished race replayed frame
 * by frame with every marble in one look, the camera following one of them,
 * so screenshots can show how a look moves as the ball rolls.
 *   /preview/marbles/roll?race=<id>&look=cats-eye-classic&follow=<index>
 *   (plain=<primary>,<secondary>,<pattern> instead of look: a plain marble, e.g. plain=E4D00A,FF8C00,striped)
 * window.__roll.step(ms) draws the race at that moment and returns the
 * followed marble's box on screen and how far it turned since the last step.
 */
export default function MarbleRoll() {
  const [search] = useSearchParams();
  const raceId = search.get('race');
  const look = search.get('look') ?? 'cats-eye-classic';
  const follow = Number(search.get('follow') ?? 0);
  const plain = search.get('plain');
  const { wrapRef, canvasRef, sceneRef, status } = useTrackScene();
  const [note, setNote] = useState('loading');

  useEffect(() => {
    if (status !== 'ready') return;
    const scene = sceneRef.current;
    scene.keepPace = () => {}; // fixed resolution for the screenshots (no stepping down on a slow machine)
    (async () => {
      const data = await api.replay(raceId);
      scene.setTrack(data.track);
      const [a, b, pattern] = (plain ?? '').split(',');
      const dress = plain
        ? (m) => ({ name: m.name, color_primary: `#${a}`, color_secondary: b ? `#${b}` : null, pattern: pattern || 'solid' })
        : (m) => ({ ...m, look });
      scene.setRace(data.entries.map((e) => ({ ...e, marble: dress(e.marble) })), [], data.results ?? [], data.start ?? null);
      scene.setCameraMode('follow');
      const ball = scene.marbles.balls[follow].mesh;
      const prev = ball.quaternion.clone();
      const v = new Vector3(); const e = new Vector3();
      window.__roll = {
        durationMs: data.durationMs,
        finishMs: (data.results ?? []).find((r) => r.index === follow)?.finishTimeMs ?? null,
        step(t, dt = 1 / 60) {
          prev.copy(ball.quaternion);
          scene.updateRace(frameAtTime(data.frames, data.tickMs, t), follow, dt);
          const turned = 2 * Math.acos(Math.min(1, Math.abs(prev.dot(ball.quaternion)))); // radians since the last step
          const cam = scene.camera;
          cam.updateMatrixWorld();
          const rect = scene.renderer.domElement.getBoundingClientRect();
          v.copy(ball.getWorldPosition(new Vector3())).project(cam);
          e.copy(ball.getWorldPosition(new Vector3())).addScaledVector(new Vector3(1, 0, 0).applyQuaternion(cam.quaternion), 0.55 * ball.scale.x).project(cam);
          const cx = rect.left + ((v.x + 1) / 2) * rect.width; const cy = rect.top + ((1 - v.y) / 2) * rect.height;
          const r = Math.abs(((e.x - v.x) / 2) * rect.width);
          // The angle the old camera-facing pinwheel used: the ball's own x axis as seen on screen.
          const ax = new Vector3(1, 0, 0).applyQuaternion(ball.getWorldQuaternion(new (ball.quaternion.constructor)())).transformDirection(cam.matrixWorldInverse);
          return { cx, cy, r, turned, screenAngle: Math.atan2(ax.y, ax.x) };
        },
      };
      setNote(`${data.track.name} · following #${follow}`);
    })().catch((err) => { setNote(String(err)); window.__roll = { error: String(err) }; });
  }, [status, raceId, look, follow, plain]);

  return (
    <div style={{ background: '#0e1420', padding: 0 }}>
      <div ref={wrapRef} style={{ width: 640, height: 400, position: 'relative' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      <p style={{ color: '#9aa8c2', margin: 4, fontSize: 12 }}>{note}</p>
    </div>
  );
}
