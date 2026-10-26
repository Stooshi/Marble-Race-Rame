import { BANNERS, SERIES_PIC, bannerSrc } from '../site/TrackBanner';

/**
 * The start show's screens over the 3D view (Moses, 26 Oct 2026: an unhurried start):
 *   TrackCard: while everything loads, the track's picture, name, series and difficulty;
 *   FlyoverTitle: during the flyover, the name and series small at the top, and "Tap to skip" (the
 *     whole picture skips).
 * Looks only.
 */
export const seriesOf = (slug) => BANNERS[slug]?.series ?? null;

export function TrackCard({ track }) {
  const series = seriesOf(track?.slug);
  const pic = track?.slug ? bannerSrc(track.slug) : null;
  return (
    <div className="startshow__card" role="status" aria-live="polite" style={{ background: SERIES_PIC[series] ?? SERIES_PIC.Classic }}>
      {pic && <img className="startshow__pic" src={pic.src} srcSet={pic.srcSet} alt="" decoding="async" onError={(e) => { e.currentTarget.hidden = true; }} />}
      <div className="startshow__cardtext">
        {series && <span className="startshow__series">{series}{track?.difficulty ? ` · ${track.difficulty}` : ''}</span>}
        <strong className="startshow__name">{track?.name ?? 'The next race'}</strong>
        <span className="startshow__loading">Loading the track…<i aria-hidden="true" /></span>
      </div>
    </div>
  );
}

export function FlyoverTitle({ track, onSkip }) {
  const series = seriesOf(track?.slug);
  return (
    <button type="button" className="startshow__fly" onClick={onSkip} aria-label="Skip the flyover">
      <span className="startshow__flytitle">
        <strong>{track?.name}</strong>
        {series && <span>{series}</span>}
      </span>
      <span className="startshow__skip">Tap to skip</span>
    </button>
  );
}

/** "Your gate: 7", big, while the camera settles on the field at the gate. */
export function GateMoment({ gate }) {
  if (gate === null || gate === undefined) return null;
  return <div className="startshow__gate" aria-live="polite">Your gate <strong>{gate}</strong></div>;
}
