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
  const tracks = useAsync(() => api.tracks(), []);
  const list = tracks.data?.tracks ?? [];
  const slug = params.get('track') || list.find((t) => t.slug === 'san-francisco')?.slug || list[0]?.slug;
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
          <button key={t.slug} type="button" role="tab" aria-selected={t.slug === slug} onClick={() => set({ track: t.slug })}>{t.name}</button>
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
              <div><dt>Wall hits</dt><dd>{stats.wallHits}</dd></div>
              {level === 3 && <div><dt>Jumps</dt><dd>{stats.jumps}</dd></div>}
              {level === 3 && <div><dt>Longest flight</dt><dd>{stats.longestAirSeconds} s</dd></div>}
              {level === 3 && <div><dt>Highest</dt><dd>{stats.highestAirMetres} m</dd></div>}
            </dl>
          )}
          <p className="muted small">
            A practice race with 20 house marbles on the new physics. Marbles pass through each other for now:
            real collisions and the starting gate are the next steps. Real races still use the current physics.
          </p>
        </RaceReplayViewer>
      )}
    </div>
  );
}
