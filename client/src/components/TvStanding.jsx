import { useEffect, useState } from 'react';

/**
 * During the TV pack shot, a small label for a few seconds with where the player's own marble stands
 * ("Leader +1.8 s", "7th, in the pack", "12th, 3.4 s behind"; Moses, 30 Oct 2026). From the scene
 * (TrackScene.tvNow); nothing with the TV moments off or no own marble in the race.
 */
export default function TvStanding({ sceneRef }) {
  const [label, setLabel] = useState(null);
  useEffect(() => {
    let last = null;
    const id = setInterval(() => {
      const shot = sceneRef.current?.tvNow?.();
      const next = shot?.label && shot.w > 0.6 ? shot.label : null;
      if (next !== last) { last = next; setLabel(next); }
    }, 100);
    return () => clearInterval(id);
  }, [sceneRef]);
  if (!label) return null;
  return <div className="replay3d__tvstanding" aria-live="polite">{label}</div>;
}
