import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import MarbleBall from './MarbleBall';
import { useSavePrompt } from '../site/account/SavePrompt';
import { PushAsk } from '../site/account/PushSettings';
import { lapTime } from '../site/leagues/status';

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
export default function NextRace({ raceId, entries, nextRaceId = null, roomCode = null, roomKind = null, leagueCode = null }) {
  // (In the apps, once switched on: after the first finished race, the notifications question.)
  return (
    <>
      {leagueCode ? <LeagueNext raceId={raceId} code={leagueCode} /> : roomKind === 'quick' ? <QuickNext /> : roomCode ? <RoomNext code={roomCode} /> : <PublicNext raceId={raceId} entries={entries} nextRaceId={nextRaceId} />}
      <PushAsk />
    </>
  );
}

/** A friend room's race: the room's next race is already set up with everyone in it; the host starts it. */
function RoomNext({ code }) {
  const navigate = useNavigate();
  return (
    <div className="next-race">
      <p className="next-race__text">Your room's next race is ready, with everyone who raced in it. The host starts it from the room.</p>
      <div className="next-race__actions">
        <button type="button" className="btn btn--primary" onClick={() => navigate(`/r/${code}`)}>Back to the room</button>
      </div>
    </div>
  );
}

/**
 * A league race (Leagues v1, 27 Oct 2026): the time, "New best!" when it beat the player's best on this
 * track in the league, the tries left, and the next try from the league (so it counts there).
 */
export function LeagueNext({ raceId, code }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [res, setRes] = useState(null); // the results' league block
  const [view, setView] = useState(null); // the league as its page shows it
  const [trackId, setTrackId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    let stop = false;
    // (Results come a moment after the last marble: asked again a few times.)
    const load = (n) => api.results(raceId)
      .then((d) => { if (!stop) { setRes(d.league ?? null); setTrackId(d.race?.track_id ?? null); } })
      .catch(() => { if (!stop && n > 0) setTimeout(() => load(n - 1), 1500); });
    load(6);
    api.league(code).then((v) => !stop && setView(v)).catch(() => {});
    return () => { stop = true; };
  }, [raceId, code]);
  const track = view?.tracks?.find((t) => t.id === trackId) ?? null;
  const open = view?.league?.status === 'open' && new Date(view.league.ends_at).getTime() > Date.now();
  const mine = res && res.user_id && res.user_id === user?.id;
  const left = track?.tries_left;
  const again = async () => {
    setBusy(true);
    setError(null);
    try {
      const { race } = await api.leagueRace(code, trackId);
      navigate(`/race/${race.id}?go=1`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="next-race next-race--league">
      {mine && res.time_ms && (res.new_best
        ? <p className="next-race__best" role="status"><strong>New best!</strong> {lapTime(res.time_ms)}{res.best_before_ms ? ` (was ${lapTime(res.best_before_ms)})` : ''} in {res.name}</p>
        : <p className="next-race__text">{lapTime(res.time_ms)} · your best here in {res.name}: {lapTime(track?.best_ms ?? res.best_before_ms)}</p>)}
      {!mine && <p className="next-race__text">A race in the league {res?.name ?? view?.league?.name ?? ''}.</p>}
      <div className="next-race__actions">
        {mine && open && trackId && left !== 0 && (
          <button type="button" className="btn btn--primary" disabled={busy || !track} onClick={again}>
            {busy ? 'Starting…' : `Race it again${left !== null && left !== undefined ? ` (${left} ${left === 1 ? 'try' : 'tries'} left)` : ''}`}
          </button>
        )}
        <Link to={`/l/${code}`} className={`btn ${mine && open && left !== 0 ? 'btn--ghost btn--sm' : 'btn--primary'}`}>Back to the league</Link>
      </div>
      {mine && open && left === 0 && <p className="next-race__text">No tries left on this track. The other tracks are on the league page.</p>}
      {view && !open && <p className="next-race__text">This league has ended: see the final standings.</p>}
      {error && <p className="next-race__error">{error}</p>}
    </div>
  );
}

/** A quick race is one race: the next one is another tap on Quick race (Moses, 25 Oct 2026). */
function QuickNext() {
  return (
    <div className="next-race">
      <p className="next-race__text">Race again: Quick race puts you in the next race starting, with whoever else is racing.</p>
      <div className="next-race__actions">
        <Link to="/play/quick" className="btn btn--primary">Quick race again</Link>
        <Link to="/home" className="btn btn--ghost btn--sm">Back to Race</Link>
      </div>
    </div>
  );
}

function PublicNext({ raceId, entries, nextRaceId = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mine = entries.find((e) => e.user?.id && e.user.id === user?.id);
  const [nextId, setNextId] = useState(nextRaceId);
  const [next, setNext] = useState(null); // { race, entries } of the rematch
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const { beforeNextRace } = useSavePrompt();
  const [error, setError] = useState(null);

  useEffect(() => { if (nextRaceId) setNextId(nextRaceId); }, [nextRaceId]);
  const [roomCode, setRoomCode] = useState(null); // (a friend room's race, found when looking it up)
  const [roomKind, setRoomKind] = useState(null);
  const [leagueCode, setLeagueCode] = useState(null);
  useEffect(() => {
    if (!raceId) return undefined;
    let stop = false;
    api.race(raceId).then((d) => {
      if (stop) return;
      if (d.race.league_code) setLeagueCode(d.race.league_code);
      else if (d.race.room_code) { setRoomCode(d.race.room_code); setRoomKind(d.race.room_kind ?? null); }
      else if (!nextRaceId && d.race.next_race_id) setNextId(d.race.next_race_id);
    }).catch(() => {});
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
      await beforeNextRace(); // (a guest after every 3rd race: "Save your marble" first; "Later" goes on)
      const d = await api.nextRace(raceId, marbleId);
      navigate(`/race/${d.race.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (leagueCode) return <LeagueNext raceId={raceId} code={leagueCode} />;
  if (roomKind === 'quick') return <QuickNext />;
  if (roomCode) return <RoomNext code={roomCode} />;

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
        <Link to="/home" className="btn btn--ghost btn--sm">Back to Race</Link>
      </div>
      {error && <p className="next-race__error">{error}</p>}
    </div>
  );
}
