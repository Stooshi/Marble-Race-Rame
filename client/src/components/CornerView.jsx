import { useLayoutEffect, useRef } from 'react';
import MarbleBall from './MarbleBall';

/**
 * The small corner view of a 3D race (picture in picture): a frame in the
 * bottom-left corner that the scene draws a second follow camera into. Tap it
 * to swap it with the big view. It reports its place to the scene whenever
 * the stage changes size, and takes itself away when hidden.
 */
export default function CornerView({ sceneRef, ready, visible, label, marble, onSwap }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const el = ref.current;
    if (!ready || !scene) return undefined;
    if (!visible || !el) {
      scene.setInset(null);
      return undefined;
    }
    const measure = () => scene.setInset({ x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.offsetParent) observer.observe(el.offsetParent); // the stage: its height moves the corner
    return () => {
      observer.disconnect();
      sceneRef.current?.setInset(null);
    };
  }, [visible, ready]);

  if (!visible) return null;
  return (
    <button ref={ref} type="button" className="cornerview" onClick={onSwap} title={`Swap views: show ${label} big`} aria-label={`Corner view: ${label}. Tap to swap with the big view`}>
      <span className="cornerview__label">
        {marble && <MarbleBall marble={marble} size={12} />}
        <span className="cornerview__name">{label}</span>
        <span className="cornerview__swap" aria-hidden="true">⇄</span>
      </span>
    </button>
  );
}

/**
 * Who the corner view follows, given who the big view follows: the leader
 * when the big view shows anyone else; otherwise the viewer's own marble, or
 * (with no marble in the race) whoever is in second place, chasing the leader.
 */
export function cornerFollow(follow, mine) {
  if (follow !== 'leader') return 'leader';
  return mine.length > 0 ? mine[0] : 'second';
}

/** The entry index a follow choice means right now ('leader', 'second' or an index). */
export function followedNow(follow, standings) {
  if (follow === 'leader') return standings[0];
  if (follow === 'second') return standings[1];
  return follow;
}

/** A short name for who a view follows. */
export function followLabel(follow, mine, entries) {
  if (follow === 'leader') return 'Leader';
  if (follow === 'second') return '2nd place';
  if (mine.includes(follow)) return 'My marble';
  return entries[follow]?.marble?.name ?? 'Marble';
}
