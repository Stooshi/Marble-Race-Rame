import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import MarbleBadge from '../marbles/MarbleBadge';
import { SITE_URL } from '../canonical';
import { useRacer, useTracks } from './RaceFlow';

/**
 * A friend room (/r/CODE): anyone with the link is in. A friend without an
 * account races as a guest straight away. Everyone sees who is in with which
 * marble; the host picks the track and starts the race (CPU players fill the
 * empty places). When the race starts, everyone in it goes to the race; after
 * the finish the room's next race is ready with the same players.
 */
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

  const load = useCallback(async () => {
    try {
      setView(await api.room(code));
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
    if (!view || !open || !waiting || me?.inRace || left || full) return;
    if (joinTried.current === race.id) return;
    joinTried.current = race.id;
    run('join', () => api.joinRoom(code))();
  }, [view, open, waiting, me?.inRace, left, full, race?.id, code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Back from changing the Shooter: race with the new one.
  useEffect(() => {
    if (!view || search.get('rejoin') !== '1' || !waiting || !open) return;
    setSearch({}, { replace: true });
    run('join', () => api.joinRoom(code))();
  }, [view, search, waiting, open, code, setSearch]); // eslint-disable-line react-hooks/exhaustive-deps

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
  return (
    <div className="ms-page">
      <div className="ms-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>{me?.isHost ? 'Your room' : `${host?.name ?? 'A friend'}'s room`}</h1>
        <span className="ms-id ms-id--big" aria-label={`Room code ${code.split('').join(' ')}`}>{code}</span>
      </div>
      {!open && <div className="ms-msg ms-msg--bad">This room has closed. <Link to="/play/friends">Make a new room</Link></div>}
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error.message}</div>}

      <div className="ms-two" style={{ alignItems: 'start' }}>
        <section className="ms-card" style={{ display: 'grid', gap: 14, flex: '1 1 420px' }} aria-labelledby="players-h">
          <div className="ms-row" style={{ justifyContent: 'space-between' }}>
            <h2 id="players-h" className="ms-h3" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.6rem' }}>
              {race ? `${race.track.name}` : 'The next race'}
            </h2>
            <span className="ms-note">{view.players.length} of {view.room.size} · CPU players fill the rest</span>
          </div>
          {isGuestName && (
            <form className="ms-form ms-row" style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) saveName(); }}>
              <input aria-label="Your name in the room" placeholder="Your name, so friends know it's you" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} style={{ flex: '1 1 200px' }} />
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

          {open && waiting && me?.isHost && (
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
                  {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={Boolean(busy) || !me.inRace} onClick={run('start', () => api.roomStart(code))}>
                {busy === 'start' ? 'STARTING…' : `START THE RACE (${view.players.length} ${view.players.length === 1 ? 'player' : 'players'})`}
              </button>
            </div>
          )}
          {open && waiting && !me?.isHost && me?.inRace && <p className="ms-note" aria-live="polite">You're in. Waiting for {host?.name ?? 'the host'} to start the race…</p>}
          {open && waiting && !me?.inRace && (
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
          <h2 id="invite-h" className="ms-h3" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.6rem' }}>Invite friends</h2>
          <div className="ms-row" style={{ width: '100%', flexWrap: 'nowrap' }}>
            <div className="ms-field-like" title={link}>{link.replace(/^https?:\/\//, '')}</div>
            <button type="button" className="ms-btn ms-btn--sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <div className="ms-row">
            <a className="ms-btn ms-btn--sm" href={`https://wa.me/?text=${encodeURIComponent(`Race me on Marble Spins! ${link}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            {typeof navigator !== 'undefined' && navigator.share && <button type="button" className="ms-btn ms-btn--sm" onClick={share}>Share…</button>}
          </div>
          {qr && <img src={qr} alt={`QR code for room ${code}`} width={180} height={180} style={{ borderRadius: 12, background: '#fff' }} />}
          <p className="ms-note">Friends open the link or scan the code: no account needed, up to {view.room.size} players. The room stays open for two hours after the last race.</p>
        </section>
      </div>
    </div>
  );
}
