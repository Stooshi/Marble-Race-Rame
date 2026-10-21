import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import TrackBanner, { SERIES_PIC } from '../TrackBanner';
import { applyMeta, metaFor } from '../pageMeta';

export const SERIES_ORDER = ['World Tour', 'Grand Prix', 'Coasters', 'Canyons', 'Blocks', 'Track and Field', 'Rivers', 'Pinball', 'Arcade', 'Winter Wonders', 'Classic'];
const lengthOf = (m) => (Number(m) > 0 ? `${(Number(m) / 1000).toFixed(1)} km` : null);

/** The live track list (pre-rendered pages get it from the build: seed 'tracks'). */
function useTracks() {
  return useAsync(() => api.tracks(), [], 'tracks');
}

/** /tracks: every live track by series, each linking to its own page. */
export function TracksPage() {
  const { data, error } = useTracks();
  const bySeries = useMemo(() => {
    const tracks = data?.tracks ?? [];
    return SERIES_ORDER.map((s) => [s, tracks.filter((t) => t.series === s).sort((a, b) => a.name.localeCompare(b.name))]).filter(([, list]) => list.length);
  }, [data]);
  return (
    <div className="ms-page">
      <h1 className="ms-h1" style={{ marginBottom: 8 }}>All tracks</h1>
      <p className="ms-lede" style={{ marginTop: 0 }}>{data?.tracks?.length ? `${data.tracks.length} tracks` : 'Every track'}, every one with its own start, layout and surprises. Pick one and race it, free.</p>
      {error && <p className="ms-msg ms-msg--bad">The tracks couldn't be loaded. Try again in a moment.</p>}
      {bySeries.map(([series, list]) => (
        <section key={series} aria-labelledby={`series-${series}`} style={{ marginTop: 28 }}>
          <h2 id={`series-${series}`} className="ms-h2">{series}</h2>
          <div className="ms-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))' }}>
            {list.map((t) => (
              <Link key={t.slug} to={`/tracks/${t.slug}`} className="ms-trackcard">
                <div className="ms-trackcard__pic" style={{ background: SERIES_PIC[t.series] }}><TrackBanner slug={t.slug} /></div>
                <div className="ms-trackcard__body"><b>{t.name}</b><span>{t.series}</span></div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** /tracks/:slug: one live track's page (name, series, picture, description) and "Race it". */
export function TrackPage() {
  const { slug } = useParams();
  const { data, loading } = useTracks();
  const track = data?.tracks?.find((t) => t.slug === slug) ?? null;
  // Its own title, description and share picture once the track is known.
  useEffect(() => { if (track) applyMeta(metaFor(`/tracks/${slug}`, { track })); }, [track, slug]);
  if (!track) {
    if (loading) return <div className="ms-page"><p className="ms-note">Loading the track…</p></div>;
    return (
      <div className="ms-page">
        <h1 className="ms-h2">Track not found</h1>
        <p>This track isn't in the game right now. <Link to="/tracks">See all tracks</Link></p>
      </div>
    );
  }
  const km = lengthOf(track.length_m);
  return (
    <div className="ms-page ms-page--narrow" style={{ display: 'grid', gap: 18 }}>
      <nav aria-label="Breadcrumb" className="ms-note"><Link to="/tracks">All tracks</Link> · {track.series}</nav>
      <h1 className="ms-h1" style={{ margin: 0 }}>{track.name}</h1>
      <div className="ms-trackcard" style={{ cursor: 'default' }}>
        <div className="ms-trackcard__pic" style={{ background: SERIES_PIC[track.series] }}><TrackBanner slug={track.slug} /></div>
      </div>
      <p className="ms-lede" style={{ margin: 0 }}>{track.description}</p>
      <ul className="ms-note" style={{ margin: 0, paddingLeft: 18 }}>
        <li>Series: {track.series}</li>
        {km && <li>Length: {km}</li>}
        <li>20 marbles a race, about a minute; every race is free</li>
      </ul>
      {track.locked ? (
        <div className="ms-row">
          <span className="ms-msg" role="status">{track.season.state === 'before' ? `Opens with the ${track.season.name}.` : `In the ${track.season.name} pass.`} Watching its races is free.</span>
          <Link to={`/pass?season=${track.season.key}`} className="ms-btn ms-btn--primary ms-btn--lg">GET THE PASS</Link>
        </div>
      ) : (
      <div className="ms-row">
        <Link to={`/play/start?track=${encodeURIComponent(track.slug)}`} className="ms-btn ms-btn--primary ms-btn--lg">RACE IT</Link>
        <Link to={`/play/friends?track=${encodeURIComponent(track.slug)}`} className="ms-btn ms-btn--lg ms-btn--ghost">RACE IT WITH FRIENDS</Link>
      </div>
      )}
    </div>
  );
}
