import { useEffect, useRef, useState } from 'react';

export const SKIP_AFTER_MS = 5000; // after the winner crosses, before the link appears
export const HOLD_MS = 1000;       // how long to press and hold to skip

/**
 * "Skip to results": deliberately low-key, so watching to the end stays the
 * habit. A small text link below the race view (never over the picture),
 * shown only SKIP_AFTER_MS after the winner crosses, and only where allowed
 * (a solo race, or a replay); it needs a press-and-hold of HOLD_MS, a ring
 * filling as you hold, to confirm. Letting go early cancels it.
 *
 * show: from useFinishShow; allowed: whether this race may be skipped; onSkip: what skipping does.
 */
export default function SkipToResults({ show, allowed, onSkip }) {
  const [progress, setProgress] = useState(0);
  const hold = useRef(null);
  const { t, plan, phase } = show;
  const visible = allowed && plan && t !== null && (phase === 'winner' || phase === 'field') && t - plan.winnerMs >= SKIP_AFTER_MS;

  const stop = () => {
    if (hold.current) cancelAnimationFrame(hold.current.frame);
    hold.current = null;
    setProgress(0);
  };
  const start = () => {
    if (hold.current) return;
    const began = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - began) / HOLD_MS);
      setProgress(k);
      if (k >= 1) {
        hold.current = null;
        setProgress(0);
        onSkip();
        return;
      }
      hold.current.frame = requestAnimationFrame(step);
    };
    hold.current = { frame: requestAnimationFrame(step) };
  };
  useEffect(() => () => hold.current && cancelAnimationFrame(hold.current.frame), []);
  useEffect(() => { if (!visible) stop(); }, [visible]);

  if (!visible) return null;
  const R = 7;
  const C = 2 * Math.PI * R;
  return (
    <div className="skip-results">
      <button
        type="button"
        className="skip-results__link"
        onPointerDown={(e) => { e.preventDefault(); start(); }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start(); } }}
        onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') stop(); }}
        onBlur={stop}
        aria-label="Skip to results (press and hold)"
        title="Press and hold to skip to the results"
      >
        <svg className="skip-results__ring" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="9" cy="9" r={R} className="skip-results__track" />
          <circle cx="9" cy="9" r={R} className="skip-results__fill" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
        </svg>
        {progress > 0 ? 'Keep holding…' : 'Skip to results'}
      </button>
    </div>
  );
}
