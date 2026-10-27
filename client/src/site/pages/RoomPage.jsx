import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import MarbleBadge from '../marbles/MarbleBadge';
import { SITE_URL } from '../canonical';
import { RoomPrivacy, useRacer, useTracks } from './RaceFlow';
import pushSwitch from '../../shared/push.json';
import { NAME_NOT_ALLOWED, checkName } from '../../shared/nameFilter';
import { preloadScene } from '../../three/scenePool';

/**
 * The host invites friends with a notification on their phone (once push is switched on,
 * src/shared/push.json): players who raced in a friend room with them in the last 30 days.
 * Whether a phone gets it is up to the friend's own switches; the host only sees "Invited".
 */
function PushInvites({ code }) {
  const [friends, setFriends] = useState(null);
  const [done, setDone] = useState({});
  useEffect(() => {
    if (!pushSwitch.enabled) return;
    api.roomInvitable(code).then((r) => setFriends(r.pushOn ? r.friends : null)).catch(() => {});
  }, [code]);
  if (!friends?.length) return null;
  const invite = async (f) => {
    setDone((d) => ({ ...d, [f.userId]: 'busy' }));
    try { await api.roomInvite(code, f.userId); setDone((d) => ({ ...d, [f.userId]: 'sent' })); } catch { setDone((d) => ({ ...d, [f.userId]: 'failed' })); }
  };
  return (
    <div style={{ display: 'grid', gap: 6, width: '100%' }}>
      <b>Raced with you before</b>
      {friends.map((f) => (
        <div key={f.userId} className="ms-row" style={{ justifyContent: 'space-between' }}>
          <span>{f.name}</span>
          <button type="button" className="ms-btn ms-btn--sm" disabled={Boolean(done[f.userId])} onClick={() => invite(f)}>
            {done[f.userId] === 'sent' ? 'Invited' : done[f.userId] === 'failed' ? 'Try later' : 'Invite'}
          </button>
        </div>
      ))}
      <p className="ms-note">They get a notification in the Marble Spins app, if they have it switched on.</p>
    </div>
  );
}

/**
 * A friend room (/r/CODE): anyone with the link is in. A friend without an
 * account races as a guest straight away. Everyone sees who is in with which
 * marble; the host picks the track and starts the race (computer players fill the
 * empty places). When the race starts, everyone in it goes to the race; after
 * the finish the room's next race is ready with the same players.
 */
const START_IN = [[30, '30 s'], [60, '1 min'], [120, '2 min']];

/** "1:05", "0:09". */
export function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The host's start timer, as everyone in the room sees it (Moses, 24 Oct 2026): the time left by the
 * server's clock (`skew`: how far this device's clock is from the server's). At zero the server starts
 * the race; `onZero` looks again a moment later in case the room's message was missed.
 */
function StartCountdown({ startsAt, skew, onZero }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = new Date(startsAt).getTime() - (now + skew);
  const zero = left <= 0;
  useEffect(() => {
    if (!zero) return undefined;
    const t = setTimeout(onZero, 1500);
    return () => clearTimeout(t);
  }, [zero, onZero]);
  return (
    <div className="ms-msg ms-room-timer" role="timer" aria-label={zero ? 'The race is starting' : `The race starts in ${clock(left)}`}>
      <span>{zero ? 'Starting…' : 'The race starts in'}</span>
      {!zero && <b className="ms-room-timer__clock">{clock(left)}</b>}
    </div>
  );
}

export default function RoomPage() {
  const { code: rawCode } = useParams();
  const code = (rawCode ?? '').toUpperCase();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const { ready, error: racerError } = useRacer();
  const { user, socket, refreshUser } = useAuth();
  const tracks = useTracks();
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [left, setLeft] = useState(false); // (left by hand: don't join again by itself)
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(null);
  const [name, setName] = useState('');
  const sentTo = useRef(null); // the race we already went to
  const joinTried = useRef(null);

  // (In the apps the page's own address is the app's inside one, so share the website's.)
  const link = `${window.Capacitor?.isNativePlatform?.() ? SITE_URL : window.location.origin}/r/${code}`;

  const [skew, setSkew] = useState(0); // (the server's clock minus this device's, for the start timer)
  const load = useCallback(async () => {
    try {
      const v = await api.room(code);
      if (v?.race?.serverNow) setSkew(new Date(v.race.serverNow).getTime() - Date.now());
      setView(v);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [code]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  // Live: the room's channel, and a slow poll in case the connection drops.
  useEffect(() => {
    if (!ready || !socket) return undefined;
    const onUpdate = (p) => { if (p?.code === code) load(); };
    const watch = () => socket.emit('room:watch', { code });
    watch();
    socket.on('connect', watch);
    socket.on('room:updated', onUpdate);
    const poll = setInterval(load, 6000);
    return () => {
      socket.emit('room:unwatch', { code });
      socket.off('connect', watch);
      socket.off('room:updated', onUpdate);
      clearInterval(poll);
    };
  }, [ready, socket, code, load]);

  const run = (key, fn) => async () => {
    setBusy(key);
    try {
      const v = await fn();
      if (v?.room) setView(v);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const race = view?.race;
  const me = view?.me;
  const open = view?.room.status === 'open';
  const waiting = race?.status === 'lobby';
  const full = (view?.players.length ?? 0) >= (view?.room.size ?? 20);

  // In by opening the link (once per race, unless you left).
  useEffect(() => {
    if (!view || !open || !waiting || me?.inRace || me?.removed || left || full) return;
    if (joinTried.current === race.id) return;
    joinTried.current = race.id;
    run('join', () => api.joinRoom(code))();
  }, [view, open, waiting, me?.inRace, me?.removed, left, full, race?.id, code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Back from changing the Shooter: race with the new one.
  useEffect(() => {
    if (!view || search.get('rejoin') !== '1' || !waiting || !open) return;
    setSearch({}, { replace: true });
    run('join', () => api.joinRoom(code))();
  }, [view, search, waiting, open, code, setSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // The 3D scene built during the wait (Moses, 26 Oct 2026), so after the timer the race page goes
  // straight into the start show: the flyover, the gate, the 3-2-1. (The track is known by now; the
  // race page takes the scene over, see three/scenePool.js.)
  const preloaded = useRef(null);
  useEffect(() => {
    if (!race || !me?.inRace || !['lobby', 'countdown'].includes(race.status) || !race.track?.id) return;
    const key = `${race.id}:${race.track?.id}`; // (again if the host picks another track)
    if (preloaded.current === key) return;
    preloaded.current = key;
    api.track(race.track?.id).then((d) => {
      const t = d?.track;
      if (!t?.physics) return;
      preloadScene({
        raceId: race.id,
        track: { id: t.id, slug: t.slug, name: t.name, length_m: Number(t.length_m), lane_count: t.lane_count, waypoints: t.waypoints, obstacles: t.obstacles, physics: t.physics },
      });
    }).catch(() => {});
  }, [race?.id, race?.track?.id, race?.status, me?.inRace]); // eslint-disable-line react-hooks/exhaustive-deps

  // The race is on: to the race.
  useEffect(() => {
    if (!race || !me?.inRace || !['countdown', 'running'].includes(race.status)) return;
    if (sentTo.current === race.id) return;
    sentTo.current = race.id;
    // (Once per race: back in the room during the race, you stay here.)
    const key = `marble-room-sent:${race.id}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { /* (no storage) */ }
    navigate(`/race/${race.id}`);
  }, [race, me?.inRace, navigate]);

  useEffect(() => {
    let stop = false;
    QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: '#0B1020', light: '#FFFFFF' } }).then((u) => !stop && setQr(u)).catch(() => {});
    return () => { stop = true; };
  }, [link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt?.('Copy the room link', link);
    }
  };
  const share = async () => {
    try { await navigator.share({ title: 'Race me on Marble Spins', text: `Join my marble race: room ${code}`, url: link }); } catch { /* (closed) */ }
  };
  const saveName = run('name', async () => {
    if (checkName(name.trim())) throw new Error(NAME_NOT_ALLOWED);
    await api.setName(name.trim().slice(0, 40));
    await refreshUser?.();
    setName('');
    return api.room(code);
  });

  const myPlayer = useMemo(() => view?.players.find((p) => p.userId === user?.id), [view, user?.id]);
  const isGuestName = user?.is_guest && !user?.display_name;

  if (racerError) return <div className="ms-page"><div className="ms-msg ms-msg--bad">{racerError}</div></div>;
  if (error && !view) {
    return (
      <div className="ms-page" style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
        <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Room {code}</h1>
        <div className="ms-msg ms-msg--bad">{error.status === 404 ? 'There is no room with that code. Check the link, or ask your friend for a new one.' : error.message}</div>
        <Link to="/play/friends" className="ms-btn ms-btn--primary">MAKE YOUR OWN ROOM</Link>
      </div>
    );
  }
  if (!view) return <div className="ms-page"><p className="ms-note">Opening room {code}…</p></div>;

  const host = view.room.host;
  const quick = view.room.kind === 'quick';
  // A League Night room (Leagues v1): the league's players only; its races run by themselves, in order.
  const night = view.night ?? null;
  return (
    <div className="ms-page">
      <div className="ms-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>{night ? 'League Night' : quick ? 'Quick race' : me?.isHost ? 'Your room' : `${host?.name ?? 'A friend'}'s room`}</h1>
        <span className="ms-id ms-id--big" aria-label={`Room code ${code.split('').join(' ')}`}>{code}</span>
      </div>
      {night && (
        <div className="ms-msg ms-room-night" role="note">
          <span><b>{night.league.name}</b>{night.race ? ` · race ${night.race} of ${night.races}` : ''}: the league's players race together; each race starts by itself.</span>
          <Link to={`/l/${night.league.code}`} className="ms-btn ms-btn--sm">THE LEAGUE</Link>
        </div>
      )}
      {!open && night && <div className="ms-msg">League Night is over. <Link to={`/l/${night.league.code}`}>See the night's scoreboard</Link></div>}
      {!open && !night && (quick
        ? <div className="ms-msg">This quick race is over. <Link to="/play/quick">Quick race again</Link></div>
        : <div className="ms-msg ms-msg--bad">This room has closed. <Link to="/play/friends">Make a new room</Link></div>)}
      {me?.removed && <div className="ms-msg ms-msg--bad">The host took you out of this room. <Link to="/play/quick">Quick race</Link></div>}
      {error && !(me?.removed && error.details?.code === 'removed') && (
        <div className="ms-msg ms-msg--bad" role="alert">
          {error.message}
          {error.details?.code === 'no_free_marble' && <> <Link to="/play/quick">Quick race instead</Link> · <Link to="/shop">Shop</Link></>}
          {error.details?.code === 'quick_starting' && <> <Link to="/play/quick">Quick race</Link></>}
          {error.details?.code === 'league_only' && night && <> <Link to={`/l/${night.league.code}`}>Open the league</Link></>}
        </div>
      )}

      <div className="ms-two" style={{ alignItems: 'start' }}>
        <section className="ms-card" style={{ display: 'grid', gap: 14, flex: '1 1 420px' }} aria-labelledby="players-h">
          <div className="ms-row" style={{ justifyContent: 'space-between' }}>
            <h2 id="players-h" className="ms-h3" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.6rem' }}>
              {race ? `${race.track.name}` : 'The next race'}
            </h2>
            <span className="ms-note">{view.players.length} of {view.room.size} · computer players fill the rest</span>
          </div>
          {race?.track.hostedSeason && <span className="ms-note" role="note">{race.track.hostedSeason.name.replace(/ \d{4}$/, '')} track: hosted by a pass holder, so everyone here races it.</span>}
          {isGuestName && (
            <form className="ms-form ms-row" style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) saveName(); }}>
              <input aria-label="Your name in the room" placeholder="Type your player name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} style={{ flex: '1 1 200px' }} />
              <button type="submit" className="ms-btn ms-btn--sm" disabled={!name.trim() || Boolean(busy)}>Save</button>
            </form>
          )}
          {race && !waiting && race.status !== 'finished' && (
            <div className="ms-msg" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>A race is on. {me?.inRace ? '' : 'You join the next one as soon as it finishes.'}</span>
              <Link to={`/race/${race.id}`} className="ms-btn ms-btn--sm">{me?.inRace ? 'GO TO THE RACE' : 'WATCH'}</Link>
            </div>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {view.players.map((p) => (
              <li key={p.userId} className="ms-row" style={{ flexWrap: 'nowrap', gap: 12 }}>
                {p.marble.look ? <MarbleBadge slug={p.marble.look} size={40} still /> : <MarbleBadge marble={p.marble} size={40} still />}
                <span style={{ display: 'grid', flex: 1, minWidth: 0 }}>
                  <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}{p.userId === user?.id ? ' (you)' : ''}</b>
                  <span className="ms-note">{p.host ? 'Host · ' : ''}{p.marble.name}</span>
                </span>
                {me?.isHost && !p.host && waiting && (
                  <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" disabled={Boolean(busy)} onClick={run(`rm-${p.userId}`, () => api.roomRemove(code, p.userId))}>Remove</button>
                )}
              </li>
            ))}
            {view.players.length === 0 && <li className="ms-note">Nobody is in yet.</li>}
          </ul>

          {open && waiting && race.startsAt && <StartCountdown key={race.startsAt} startsAt={race.startsAt} skew={skew} onZero={load} />}
          {quick && open && waiting && me?.inRace && view.players.length === 1 && (
            <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={Boolean(busy)} onClick={run('start-now', () => api.roomStartNow(code))}>
              {busy === 'start-now' ? 'STARTING…' : 'START NOW'}
            </button>
          )}
          {quick && open && waiting && <p className="ms-note">A quick race starts by itself: anyone tapping Quick race joins until then. Computer players fill the empty places.</p>}
          {open && me?.isHost && !night && (
            <div style={{ display: 'grid', gap: 6 }}>
              <span className="ms-eyebrow" style={{ color: 'var(--ms-muted)' }}>Who can join</span>
              <RoomPrivacy value={view.room.public} disabled={Boolean(busy)} onChange={(v) => { if (v !== view.room.public) run('visibility', () => api.roomVisibility(code, v))(); }} />
              <span className="ms-note">{view.room.public ? 'Public: listed under "Join a race", anyone can join.' : 'Private: only people with the link or code.'}</span>
            </div>
          )}
          {open && waiting && me?.isHost && night && race.startsAt && me.inRace && (
            <button type="button" className="ms-btn ms-btn--primary" disabled={Boolean(busy)} onClick={run('start', () => api.roomStart(code))}>
              {busy === 'start' ? 'STARTING…' : 'EVERYONE\'S HERE: START NOW'}
            </button>
          )}
          {open && waiting && me?.isHost && !night && (
            <div style={{ display: 'grid', gap: 10 }}>
              <label className="ms-form" style={{ display: 'grid', gap: 6 }}>
                <span className="ms-eyebrow" style={{ color: 'var(--ms-muted)' }}>Track</span>
                <select
                  value={view.room.randomTrack ? 'random' : race.track.id}
                  disabled={Boolean(busy) || !tracks.length}
                  onChange={(e) => run('track', () => api.roomTrack(code, e.target.value === 'random' ? null : e.target.value))()}
                  style={{ minHeight: 44, borderRadius: 12, padding: '0 12px', background: 'var(--ms-bg)', color: 'var(--ms-text)', border: '1px solid var(--ms-border)' }}
                >
                  <option value="random">Random track each race</option>
                  {tracks.map((t) => <option key={t.id} value={t.id} disabled={t.locked}>{t.name}{t.locked ? ' (in the season pass)' : ''}</option>)}
                </select>
              </label>
              <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={Boolean(busy) || !me.inRace} onClick={run('start', () => api.roomStart(code))}>
                {busy === 'start' ? 'STARTING…' : race.startsAt ? 'START NOW' : `START THE RACE (${view.players.length} ${view.players.length === 1 ? 'player' : 'players'})`}
              </button>
              {race.startsAt ? (
                <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" style={{ justifySelf: 'start' }} disabled={Boolean(busy)} onClick={run('cancel-timer', () => api.roomStartInCancel(code))}>
                  Cancel the countdown
                </button>
              ) : (
                <div className="ms-chips" role="group" aria-label="Start in…">
                  <span className="ms-chips__label">Start in…</span>
                  {START_IN.map(([s, label]) => (
                    <button key={s} type="button" disabled={Boolean(busy) || !me.inRace} onClick={run(`timer-${s}`, () => api.roomStartIn(code, s))}>{label}</button>
                  ))}
                </div>
              )}
              <span className="ms-note">The race starts by itself when the countdown ends, even if you close the app. Empty places fill with computer players.</span>
            </div>
          )}
          {open && waiting && !me?.isHost && me?.inRace && !race.startsAt && !night && <p className="ms-note" aria-live="polite">You're in. Waiting for {host?.name ?? 'the host'} to start the race…</p>}
          {open && waiting && !me?.inRace && !me?.removed && (
            <button type="button" className="ms-btn ms-btn--primary" disabled={Boolean(busy) || full} onClick={() => { setLeft(false); run('join', () => api.joinRoom(code))(); }}>
              {full ? 'THE ROOM IS FULL' : 'JOIN THE RACE'}
            </button>
          )}

          <div className="ms-row" style={{ gap: 14 }}>
            {open && waiting && me?.inRace && (
              <Link to={`/play/shooter?room=${code}`} style={{ color: 'var(--ms-soft)' }}>Change my marble{myPlayer ? ` (${myPlayer.marble.name})` : ''}</Link>
            )}
            {view.room.lastRaceId && <Link to={`/results/${view.room.lastRaceId}`} style={{ color: 'var(--ms-soft)' }}>Last race's results</Link>}
            {open && !me?.isHost && me?.inRace && waiting && (
              <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" disabled={Boolean(busy)} onClick={() => { setLeft(true); run('leave', () => api.leaveRoom(code))(); }}>Leave</button>
            )}
            {open && me?.isHost && (
              <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" disabled={Boolean(busy)} onClick={run('close', () => api.roomClose(code))}>Close the room</button>
            )}
          </div>

        </section>

        <section className="ms-card" style={{ display: 'grid', gap: 12, flex: '0 1 320px', justifyItems: 'start' }} aria-labelledby="invite-h">
          <h2 id="invite-h" className="ms-h3" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.6rem' }}>{night ? 'The league room' : quick ? 'Bring a friend' : 'Invite friends'}</h2>
          {night && <p className="ms-note" style={{ margin: 0 }}>Only the league's players can join. Send them the link if they can't find it: it's on the league's page too.</p>}
          <div className="ms-row" style={{ width: '100%', flexWrap: 'nowrap' }}>
            <div className="ms-field-like" title={link}>{link.replace(/^https?:\/\//, '')}</div>
            <button type="button" className="ms-btn ms-btn--sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <div className="ms-row">
            <a className="ms-btn ms-btn--sm" href={`https://wa.me/?text=${encodeURIComponent(`Race me on Marble Spins! ${link}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            {typeof navigator !== 'undefined' && navigator.share && <button type="button" className="ms-btn ms-btn--sm" onClick={share}>Share…</button>}
          </div>
          {qr && <img src={qr} alt={`QR code for room ${code}`} width={180} height={180} style={{ borderRadius: 12, background: '#fff' }} />}
          {!night && <p className="ms-note">{quick
            ? `Friends open the link or scan the code before it starts: no account needed, up to ${view.room.size} players.`
            : `Friends open the link or scan the code: no account needed, up to ${view.room.size} players. The room stays open for two hours after the last race.`}</p>}
          {me?.isHost && open && <PushInvites code={code} />}
        </section>
      </div>
    </div>
  );
}
