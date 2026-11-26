import { useEffect, useRef } from 'react';
import { piecesAt, quality } from '../utils/confetti';

/**
 * The confetti and gold glitter over the finish, on one canvas. `clock()`
 * gives the race time (ms) every animation frame; `shower` says when the
 * bursts fire and the steady fall runs (see utils/confetti.js). Nothing is
 * drawn while the clock stands still (a paused replay).
 */
export default function Confetti({ clock, shower }) {
  const ref = useRef(null);
  const showerRef = useRef(shower);
  showerRef.current = shower;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf;
    let width = 0;
    let height = 0;
    let lastT = null;
    let lastNow = performance.now();
    const fit = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, quality.value < 0.6 ? 1.5 : 2);
      if (Math.round(box.width * dpr) === canvas.width && Math.round(box.height * dpr) === canvas.height) return false;
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    };
    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      quality.note(now - lastNow);
      lastNow = now;
      const t = clock?.();
      const resized = fit();
      if (t === lastT && !resized) return;
      lastT = t;
      ctx.clearRect(0, 0, width, height);
      if (!width || !height) return;
      for (const p of piecesAt(t, showerRef.current, quality.value, width / height)) {
        const s = p.size * Math.min(height, width * 1.1); // sized to the narrower side, so phones aren't swamped
        const x = p.x * width;
        const y = p.y * height;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.fillStyle = p.color;
        if (p.glitter) {
          // A four-pointed twinkle.
          ctx.beginPath();
          ctx.moveTo(x, y - s * 1.6);
          ctx.lineTo(x + s * 0.35, y - s * 0.35);
          ctx.lineTo(x + s * 1.6, y);
          ctx.lineTo(x + s * 0.35, y + s * 0.35);
          ctx.lineTo(x, y + s * 1.6);
          ctx.lineTo(x - s * 0.35, y + s * 0.35);
          ctx.lineTo(x - s * 1.6, y);
          ctx.lineTo(x - s * 0.35, y - s * 0.35);
          ctx.fill();
        } else {
          // A strip of foil, tumbling: squashed as it turns edge-on, darker on its back.
          const c = Math.cos(p.rot);
          const sn = Math.sin(p.rot);
          const f = Math.max(0.12, Math.abs(p.flip));
          const dpr = canvas.width / width;
          ctx.setTransform(c * dpr, sn * dpr, -sn * f * dpr, c * f * dpr, x * dpr, y * dpr);
          ctx.fillRect(-s * 0.5, -s * 0.8, s, s * 1.6);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [clock]);
  return <canvas ref={ref} className="finish__confetti" aria-hidden="true" />;
}
