import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import RaceReplayViewer from '../components/RaceReplayViewer';
import { ErrorMessage, Spinner } from '../components/Status';
import { formatTime } from '../utils/format';

const LEVELS = [
  { level: 2, label: 'Step 2: rolling' },
  { level: 3, label: 'Step 3: + air & bounce' },
];

/**
 * Physics preview (beta): a race on the new physics for any track, to judge
 * how it feels before real races switch over. Nothing is saved; real races
 * still use the classic simulator.
 */
export default function PhysicsPreview() {
  const [params, setParams] = useSearchParams();
  // The real tracks plus the preview-only ones (the bobsleigh run), which come first.
  const tracks = useAsync(async () => {
    const [real, preview] = await Promise.all([api.tracks(), api.physicsTracks().catch(() => ({ tracks: [] }))]);
    return { tracks: [...preview.tracks, ...real.tracks] };
  }, []);
  const list = tracks.data?.tracks ?? [];
  const slug = params.get('track') || list[0]?.slug;
  const seed = Math.max(0, Number.parseInt(params.get('seed'), 10) || 1);
  const level = params.get('level') === '2' ? 2 : 3;
  const race = useAsync(() => (slug ? api.physicsPreview(slug, seed, level) : Promise.resolve(null)), [slug, seed, level]);
  const set = (changes) => setParams((p) => { for (const [k, v] of Object.entries(changes)) p.set(k, String(v)); return p; }, { replace: true });
  const stats = race.data?.stats;

  if (tracks.error) return <div className="page"><ErrorMessage error={tracks.error} onRetry={tracks.reload} /></div>;

  return (
    <div className="page preview3d">
      <header className="race-header">
        <div>
          <p className="eyebrow">Physics preview · beta</p>
          <h1>{race.data ? race.data.track.name : 'New physics'}</h1>
        </div>
        <Link to="/preview/3d" className="btn btn--ghost btn--sm">3D tracks</Link>
      </header>

      <div className="segmented" role="tablist" aria-label="Track">
        {list.map((t) => (
          <button key={t.slug} type="button" role="tab" aria-selected={t.slug === slug} onClick={() => set({ track: t.slug })}>
            {t.name}{t.preview ? ' (preview)' : ''}
          </button>
        ))}
      </div>
      <div className="physics__bar">
        <div className="segmented segmented--sm" role="group" aria-label="Physics step">
          {LEVELS.map((l) => (
            <button key={l.level} type="button" aria-pressed={level === l.level} onClick={() => set({ level: l.level })}>{l.label}</button>
          ))}
        </div>
        <button type="button" className="btn btn--sm" onClick={() => set({ seed: 1 + Math.floor(Math.random() * 1_000_000) })}>Another race</button>
        <span className="muted small">race #{seed}</span>
      </div>

      {race.error && <ErrorMessage error={race.error} onRetry={race.reload} />}
      {!race.data && !race.error && <div className="preview3d__stage preview3d__stage--empty"><Spinner label="Running the physics…" /></div>}
      {race.data && (
        <RaceReplayViewer key={`${race.data.track.slug}:${race.data.seed}:${race.data.level}`} data={race.data} loading={race.loading}>
          {stats && (
            <dl className="physics__stats">
              <div><dt>Winner</dt><dd>{formatTime(stats.winnerMs)}</dd></div>
              <div><dt>Last home</dt><dd>{stats.lastMs ? formatTime(stats.lastMs) : `${stats.unfinished} not home by 1:30`}</dd></div>
              <div><dt>Top speed</dt><dd>{Math.round(stats.topSpeed * 3.6)} km/h</dd></div>
              {stats.averageSpeed && <div><dt>Winner's average</dt><dd>{Math.round(stats.averageSpeed * 3.6)} km/h</dd></div>}
              {stats.splitter && (
                <div><dt>Splitter: inside / outside</dt><dd>{stats.splitter.inside.marbles} / {stats.splitter.outside.marbles}</dd></div>
              )}
              {stats.splitter && (
                <div>
                  <dt>Time through: inside / outside</dt>
                  <dd>{stats.splitter.inside.seconds ?? '–'} s / {stats.splitter.outside.seconds ?? '–'} s</dd>
                </div>
              )}
              {stats.bumps !== undefined && <div><dt>Bumps (hard ones)</dt><dd>{stats.bumps} ({stats.bigBumps})</dd></div>}
              <div><dt>Wall hits</dt><dd>{stats.wallHits}</dd></div>
              {level === 3 && <div><dt>Jumps</dt><dd>{stats.jumps}</dd></div>}
              {level === 3 && <div><dt>Longest flight</dt><dd>{stats.longestAirSeconds} s</dd></div>}
              {level === 3 && <div><dt>Highest</dt><dd>{stats.highestAirMetres} m</dd></div>}
            </dl>
          )}
          {race.data.track.physics && (
            <p className="muted small">
              Bobsleigh Olympics (working name) is a preview-only track: an ice channel built for speed. The whole field
              starts side by side in a wide funnel, and marbles bump, shove and slipstream each other all the way down.
              At the splitter each marble's line decides its channel: the tight inside or the long outside, balanced so
              neither wins more often. Past the line they roll into a catch area.
            </p>
          )}
          <p className="muted small">
            A practice race with 20 house marbles on the new physics.
            {race.data.track.physics?.collisions
              ? ' Real races still use the current physics.'
              : ' On this track marbles pass through each other for now (collisions are on for Bobsleigh Olympics only). Real races still use the current physics.'}
          </p>
        </RaceReplayViewer>
      )}
    </div>
  );
}
