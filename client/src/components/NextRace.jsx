import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import MarbleBall from './MarbleBall';

const clockText = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * The next race, at the foot of the results board: the rematch on the same
 * track that the group moves on to together. The first to press "Race again"
 * sets it up (it starts by itself shortly after); everyone else sees its
 * countdown and joins the same race. nextRaceId: the rematch if already known
 * (live, the server announces it); otherwise it is looked up once.
 */
export default function NextRace({ raceId, entries, nextRaceId = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mine = entries.find((e) => e.user?.id && e.user.id === user?.id);
  const [nextId, setNextId] = useState(nextRaceId);
  const [next, setNext] = useState(null); // { race, entries } of the rematch
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { if (nextRaceId) setNextId(nextRaceId); }, [nextRaceId]);
  useEffect(() => {
    if (nextRaceId || !raceId) return undefined;
    let stop = false;
    api.race(raceId).then((d) => !stop && d.race.next_race_id && setNextId(d.race.next_race_id)).catch(() => {});
    return () => { stop = true; };
  }, [raceId, nextRaceId]);
  // The rematch's details (who is in, when it starts), kept fresh while it waits.
  useEffect(() => {
    if (!nextId) return undefined;
    let stop = false;
    const load = () => api.race(nextId).then((d) => !stop && setNext(d)).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => { stop = true; clearInterval(id); };
  }, [nextId]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const open = next && ['lobby', 'countdown', 'running'].includes(next.race.status) ? next : null;
  const waiting = open?.race.status === 'lobby';
  const amIn = Boolean(open && user && open.entries.some((e) => e.user_id === user.id));
  const players = open ? open.entries.filter((e) => !e.is_bot).length : 0;
  const startsIn = waiting && open.race.scheduled_at ? Math.max(0, new Date(open.race.scheduled_at).getTime() - now) : null;

  const raceAgain = async (marbleId) => {
    setBusy(true);
    setError(null);
    try {
      const d = await api.nextRace(raceId, marbleId);
      navigate(`/race/${d.race.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  let action;
  if (open && (amIn || !waiting)) {
    action = <button type="button" className="btn btn--primary" onClick={() => navigate(`/race/${open.race.id}`)}>{waiting ? 'Go to next race' : 'Watch next race'}</button>;
  } else if (!user) {
    action = <Link to="/" className="btn btn--primary">Sign in to race again</Link>;
  } else if (mine) {
    action = (
      <button type="button" className="btn btn--primary" disabled={busy} onClick={() => raceAgain(mine.marble.id)}>
        <MarbleBall marble={mine.marble} size={18} /> Race again with {mine.marble.name}
      </button>
    );
  } else {
    action = <button type="button" className="btn btn--primary" disabled={busy} onClick={() => (open ? navigate(`/race/${open.race.id}`) : raceAgain(null))}>Join the next race</button>;
  }

  return (
    <div className="next-race">
      <p className="next-race__text" aria-live="polite">
        {!open && 'Race again on this track: the next race starts shortly after the first player joins.'}
        {waiting && (startsIn > 0
          ? <>Next race starts in <strong>{clockText(startsIn)}</strong> · {players} {players === 1 ? 'player' : 'players'} in</>
          : 'Next race is starting…')}
        {open && !waiting && 'The next race is under way.'}
      </p>
      <div className="next-race__actions">
        {action}
        <Link to="/dashboard" className="btn btn--ghost btn--sm">All races</Link>
      </div>
      {error && <p className="next-race__error">{error}</p>}
    </div>
  );
}
