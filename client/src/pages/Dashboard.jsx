import { useCallback, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useLobby } from '../hooks/useLobby';
import Leaderboard from '../components/Leaderboard';
import MarbleBall from '../components/MarbleBall';
import MarbleSelector from '../components/MarbleSelector';
import RaceList from '../components/RaceList';
import StatsDisplay from '../components/StatsDisplay';
import TrackSelector from '../components/TrackSelector';
import { Empty, ErrorMessage, Spinner } from '../components/Status';
import { formatNumber, formatTime, ordinal, timeAgo } from '../utils/format';

/**
 * The signed-in player's home base (/dashboard) and public player profiles
 * (/profile/:userId): all-time stats, track records, recent races and — for
 * your own dashboard — race creation.
 */
export default function Dashboard() {
  const { userId } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const id = userId ?? user?.id;
  const isSelf = Boolean(user && id === user.id);

  const profile = useAsync(async () => {
    if (!id) return null;
    const [p, records, history] = await Promise.all([
      isSelf ? api.myProfile() : api.user(id),
      api.trackRecords(id),
      api.userRaces(id, 10),
    ]);
    return { user: p.user, stats: p.stats, records: records.records, races: history.races };
  }, [id, isSelf]);

  if (!userId && !authLoading && !isAuthenticated) return <Navigate to="/" replace />;
  if (profile.error) return <div className="page"><ErrorMessage error={profile.error} onRetry={profile.reload} /></div>;
  // Data may be missing or still belong to a previous profile until the reload lands.
  if (!id || profile.data?.user.id !== id) return <div className="page"><Spinner /></div>;

  const { user: who, stats, records, races } = profile.data;

  return (
    <div className="page dashboard">
      <header className="profile-header card">
        <div className="avatar" aria-hidden="true">{(who.display_name || who.username).slice(0, 1).toUpperCase()}</div>
        <div className="profile-header__text">
          <h1>{who.display_name || who.username}</h1>
          <p className="muted">@{who.username} · racing since {new Date(who.created_at).toLocaleDateString()}</p>
          {who.skill && (
            <p className="skill-chip" title="Skill belongs to the player: every marble in the Marble Bag races at this level">
              <span className="muted">Skill</span> <strong>{who.skill}</strong>
              {isSelf && <span className="muted">· every marble in your Marble Bag races at this level</span>}
            </p>
          )}
        </div>
        {isSelf && (
          <div className="profile-header__coins">
            <span className="coins coins--lg">{formatNumber(user.coins)}</span>
            <small className="muted">coins</small>
          </div>
        )}
      </header>

      {isSelf && user.skill_refund_coins > 0 && <RefundNote coins={user.skill_refund_coins} />}

      <div className="grid grid--main">
        <div className="stack">
          {isSelf && <NewRace records={records} />}
          <StatsDisplay stats={stats} records={records} />
          <RecentRaces races={races} />
        </div>
        <div className="stack">
          {isSelf && <OpenRaces />}
          <Leaderboard limit={10} />
        </div>
      </div>
    </div>
  );
}

/** Shown once: marbles stopped carrying strength, and the coins spent on them came back. */
function RefundNote({ coins }) {
  const { refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  async function seen() {
    setBusy(true);
    try {
      await api.refundNoteSeen();
      await refreshUser();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card refund-note" role="status">
      <div>
        <strong>Skill now belongs to you, not your marbles</strong>
        <p>
          Every marble in your Marble Bag now races at your own skill, so marbles are about looks only.
          You keep every marble you bought, and the {formatNumber(coins)} coins you spent on them are back in your balance.
        </p>
      </div>
      <button type="button" className="btn btn--sm" onClick={seen} disabled={busy}>Got it</button>
    </section>
  );
}

function NewRace({ records }) {
  const navigate = useNavigate();
  const [track, setTrack] = useState({ mode: 'manual', trackId: null });
  const [marble, setMarble] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function create(e) {
    e.preventDefault();
    if (track.mode === 'manual' && !track.trackId) {
      setError('Pick a track or switch to a random track.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { race } = await api.createRace({
        ...(track.mode === 'random' ? { random_track: true } : { track_id: track.trackId }),
        ...(marble && { marble_id: marble.id }),
        ...(name.trim() && { name: name.trim() }),
        min_marbles: 20,
        max_marbles: 20,
      });
      navigate(`/race/${race.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="card new-race" onSubmit={create}>
      <div className="card__header">
        <h2>New race</h2>
        <small className="muted">20 marbles · up to 90 seconds · empty slots filled by house marbles</small>
      </div>

      <h3 className="step-title"><span>1</span> Track</h3>
      <TrackSelector value={track} onChange={setTrack} records={records} />

      <h3 className="step-title"><span>2</span> Your Shooter</h3>
      <MarbleSelector value={marble?.id} onChange={setMarble} />

      <div className="new-race__footer">
        <label className="field field--inline">
          <span>Race name (optional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Friday night derby" />
        </label>
        <div className="new-race__summary">
          {marble && <MarbleBall marble={marble} size={26} />}
          <span>{marble ? `${marble.name} is your Shooter` : 'Pick your Shooter from your Marble Bag'}</span>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn--primary btn--lg" disabled={busy}>
          {busy ? 'Creating…' : 'Create race'}
        </button>
      </div>
    </form>
  );
}

function OpenRaces() {
  const races = useAsync(async () => (await api.races('lobby', 10)).races, []);
  const { reload } = races;
  useLobby(useCallback(() => reload(), [reload]));
  return (
    <section className="card">
      <div className="card__header"><h2>Open lobbies</h2></div>
      {races.error && <ErrorMessage error={races.error} onRetry={reload} />}
      {races.data && <RaceList races={races.data} empty="No open lobbies — create one!" />}
    </section>
  );
}

function RecentRaces({ races }) {
  return (
    <section className="card">
      <div className="card__header"><h2>Recent races</h2></div>
      {!races.length ? <Empty>No finished races yet.</Empty> : (
        <table className="table table--stack">
          <thead>
            <tr>
              <th>Race</th>
              <th>Marble</th>
              <th className="num">Pos.</th>
              <th className="num">Halfway</th>
              <th className="num">Finish</th>
              <th className="num">Coins</th>
            </tr>
          </thead>
          <tbody>
            {races.map((r) => (
              <tr key={r.race_id}>
                <td data-label="Race" className="stack-head">
                  <Link to={`/results/${r.race_id}`}><strong>{r.name || r.track_name}</strong></Link>
                  <small className="muted block">{r.track_name} · {timeAgo(r.finished_at)}</small>
                </td>
                <td data-label="Marble">
                  <span className="inline-marble"><MarbleBall marble={r} size={16} /> {r.marble_name}</span>
                </td>
                <td data-label="Pos." className="num"><span className={`pos pos--${r.finish_position}`}>{ordinal(r.finish_position)}</span><small className="muted"> /{r.marble_count}</small></td>
                <td data-label="Halfway" className="num">{formatTime(r.split_time_ms)}</td>
                <td data-label="Finish" className="num">{formatTime(r.finish_time_ms)}</td>
                <td data-label="Coins" className="num">+{r.coins_awarded}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
