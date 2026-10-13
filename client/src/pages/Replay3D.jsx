import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ITEMS, dressEntries } from '../shared/marbles';
import { BUILT_MATERIALS } from '../shared/marbles/materials';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import RaceReplayViewer from '../components/RaceReplayViewer';
import NextRace from '../components/NextRace';
import { ErrorMessage } from '../components/Status';

/**
 * Phase 2, step 2: a finished race replayed in 3D. The server regenerates the
 * race from its seed, so this is exactly the race that was run, frame for
 * frame. Reached at /preview/3d/race/:raceId; the 2D replay stays the default.
 */
export default function Replay3D() {
  const { raceId } = useParams();
  const { user } = useAuth();
  const { data: raw, error, loading, reload } = useAsync(() => api.replay(raceId), [raceId]);
  // ?looks=all dresses every marble in a collection look (to check 20 decorated marbles on a phone).
  const [search] = useSearchParams();
  const dressAll = search.get('looks') === 'all';
  const data = useMemo(() => {
    if (!raw || !dressAll) return raw;
    const slugs = ITEMS.filter((i) => BUILT_MATERIALS.includes(i.design.material)).map((i) => i.slug);
    return { ...raw, entries: dressEntries(raw.entries, raceId, slugs) };
  }, [raw, dressAll, raceId]);
  const mine = useMemo(
    () => (data?.entries ?? []).filter((e) => e.user?.id && e.user.id === user?.id).map((e) => e.index),
    [data, user?.id],
  );

  if (error) return <div className="page"><ErrorMessage error={error} onRetry={reload} /></div>;

  return (
    <div className="page preview3d">
      <header className="race-header">
        <div>
          <p className="eyebrow">3D replay · beta{data ? ` · ${data.track.name}` : ''}</p>
          <h1>{data ? (data.name || data.track.name) : 'Race'} in 3D</h1>
        </div>
        <Link to={`/results/${raceId}`} className="btn btn--ghost btn--sm">Results</Link>
      </header>
      <RaceReplayViewer data={data} loading={loading} mine={mine} raceId={raceId} next={data ? <NextRace raceId={raceId} entries={data.entries} /> : null}>
        <p className="muted small">
          Tap a name in the standings to follow that marble. In the whole-track view, drag to turn and pinch to zoom
          (marbles are drawn bigger there so you can spot the pack). This is the real race, replayed exactly as it ran.
        </p>
      </RaceReplayViewer>
    </div>
  );
}
