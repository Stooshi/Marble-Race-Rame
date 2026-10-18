import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { ITEM, previewShowcase } from '../../shared/marbles';
import MarbleBadge from '../marbles/MarbleBadge';
import TrackBanner, { SERIES_PIC } from '../TrackBanner';

/**
 * The race flow: 1 Friends → 2 Track → 3 Shooter → 4 Starting line.
 * The choices travel in the address (?track=…&with=friends), so any step can
 * be opened, shared or reloaded. Racing with friends goes through a friend room
 * (RoomPage, /r/CODE); the Friends step makes one or opens one by its code.
 */

const LANDSCAPE = {
  alpine: 'Snow and ice', arctic: 'Snow and ice', city: 'City', jungle: 'Jungle', desert: 'Desert', meadow: 'Countryside',
  playfield: 'Pinball table', 'circuit-board': 'Arcade', 'blacklight-carpet': 'Arcade',
};
const SERIES_ORDER = ['World Tour', 'Grand Prix', 'Coasters', 'Canyons', 'Blocks', 'Track and Field', 'Pinball', 'Arcade', 'Winter Wonders', 'Classic'];

function Steps({ at, track, shooter }) {
  const [search] = useSearchParams();
  const q = search.toString();
  const steps = [
    ['/play/friends', '1 · Friends'],
    ['/play/track', `2 · Track${track ? `: ${track}` : ''}`],
    ['/play/shooter', `3 · Shooter${shooter ? `: ${shooter}` : ''}`],
    ['/play/start', '4 · Starting line'],
  ];
  return (
    <ol aria-label="Steps" className="ms-steps">
      {steps.map(([to, label], k) => (
        <li key={to} aria-current={k === at ? 'step' : undefined}>
          {k < at ? <Link to={`${to}${q ? `?${q}` : ''}`}>{label}</Link> : label}
        </li>
      ))}
    </ol>
  );
}

/** Makes sure there's someone to race as: a guest account if nobody is signed in. */
export function useRacer() {
  const { isAuthenticated, loading, playAsGuest } = useAuth();
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!loading && !isAuthenticated) playAsGuest().catch((e) => setError(e.message));
  }, [loading, isAuthenticated, playAsGuest]);
  return { ready: isAuthenticated, error };
}

export function useTracks() {
  const { data } = useAsync(() => api.tracks(), []);
  return useMemo(() => (data?.tracks ?? []).filter((t) => t.is_active !== false), [data]);
}

/** The look a player races in, from their Marble Bag. */
function shooterOf(bag) {
  if (!bag) return null;
  if (bag.shooter?.item) {
    const item = ITEM[bag.shooter.item];
    return { slug: item.slug, name: item.design.shades.length > 1 ? `${item.design.name} · ${item.shade.name}` : item.design.name, rarity: item.rarity };
  }
  const original = bag.originals.find((m) => m.id === bag.shooter?.original) ?? bag.originals[0];
  return original ? { marble: original, name: original.name, rarity: original.rarity } : null;
}

// ── 1 · Friends ───────────────────────────────────────────────────────────

export function FriendsStep() {
  const [search] = useSearchParams();
  const { ready, error } = useRacer();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data } = useAsync(async () => {
    if (!ready) return null;
    const [board, open] = await Promise.all([api.scoreboard('friends').catch(() => null), api.races('lobby', 12).catch(() => ({ races: [] }))]);
    return { friends: (board?.rows ?? []).filter((r) => !r.me), open: open.races ?? [] };
  }, [ready]);
  const [joining, setJoining] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [making, setMaking] = useState(false);
  const [roomError, setRoomError] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const trackSlug = search.get('track');
  const tracks = useTracks();

  const makeRoom = async () => {
    setMaking(true);
    setRoomError(null);
    try {
      const t = tracks.find((x) => x.slug === trackSlug);
      const v = await api.createRoom(t?.id);
      navigate(`/r/${v.room.code}`);
    } catch (e) {
      setRoomError(e.message);
      setMaking(false);
    }
  };

  const join = async (race) => {
    setJoining(race.id);
    setJoinError(null);
    try {
      await api.joinRace(race.id);
      navigate(`/race/${race.id}`);
    } catch (e) {
      setJoinError(e.message);
      setJoining(null);
    }
  };

  return (
    <div className="ms-page">
      <Steps at={0} />
      <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Invite your friends</h1>
      {error && <div className="ms-msg ms-msg--bad">{error}</div>}
      <div className="ms-two">
        <section className="ms-card" style={{ display: 'grid', gap: 12 }} aria-labelledby="room-h">
          <h2 id="room-h" className="ms-h3" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.6rem' }}>Race with friends</h2>
          <p className="ms-note">Make a room and send its link: friends join from their phone or computer, no account needed. Up to 20 players; CPU players fill the empty places. You pick the track and start.</p>
          {roomError && <div className="ms-msg ms-msg--bad">{roomError}</div>}
          <button type="button" className="ms-btn ms-btn--primary" disabled={!ready || making} onClick={makeRoom}>{making ? 'MAKING YOUR ROOM…' : 'MAKE A ROOM'}</button>
          <form className="ms-form ms-row" style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (roomCode.trim()) navigate(`/r/${roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}`); }}>
            <input aria-label="Room code" placeholder="Got a code? e.g. K7QF2M" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} maxLength={10} style={{ flex: '1 1 160px', textTransform: 'uppercase' }} />
            <button type="submit" className="ms-btn ms-btn--sm" disabled={!roomCode.trim()}>Join</button>
          </form>
        </section>
        <section className="ms-card" style={{ display: 'grid', gap: 12 }} aria-labelledby="friends-h">
          <h2 id="friends-h" className="ms-h3" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.6rem' }}>Open races to join</h2>
          {joinError && <div className="ms-msg ms-msg--bad">{joinError}</div>}
          {data && data.open.length === 0 && <p className="ms-note">No open races right now. Start one: pick a track next.</p>}
          {data?.open.slice(0, 5).map((r) => (
            <div key={r.id} className="ms-row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <div style={{ display: 'grid', minWidth: 0 }}><b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || r.track_name}</b><span className="ms-note">{r.entry_count} of {r.max_marbles} in · {r.track_name}</span></div>
              <button type="button" className="ms-btn ms-btn--sm ms-btn--primary" disabled={joining === r.id || !ready} onClick={() => join(r)}>{joining === r.id ? '…' : 'Join'}</button>
            </div>
          ))}
          <h3 style={{ margin: '8px 0 0' }}>Raced with today</h3>
          {data && data.friends.length === 0 && <p className="ms-note">Players you race with show up here for a day.</p>}
          {data?.friends.slice(0, 6).map((f) => (
            <div key={f.userId} className="ms-row" style={{ justifyContent: 'space-between' }}>
              <span className="ms-row" style={{ flexWrap: 'nowrap', gap: 10 }}>
                {f.shooter?.item ? <MarbleBadge slug={f.shooter.item} size={34} still /> : <MarbleBadge marble={f.shooter?.original} size={34} still />}
                <span>@{f.username}</span>
              </span>

            </div>
          ))}
        </section>
      </div>
      <div className="ms-flowbar">
        <span className="ms-note">Or race on your own: CPU players fill every other place</span>
        <Link to={`/play/track?${search}`} className="ms-btn">RACE SOLO: PICK A TRACK</Link>
      </div>
    </div>
  );
}

// ── 2 · Track ─────────────────────────────────────────────────────────────

export function TrackStep() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tracks = useTracks();
  const { data: records } = useAsync(() => (user && !user.is_guest ? api.trackRecords(user.id).catch(() => null) : null), [user?.id]);
  const [q, setQ] = useState('');
  const [series, setSeries] = useState(() => new Set());
  const [land, setLand] = useState(() => new Set());
  const [sort, setSort] = useState('new');
  const best = useMemo(() => new Map((records?.records ?? []).map((r) => [r.slug, r])), [records]);

  const count = (key, val) => tracks.filter((t) => (key === 'series' ? t.series : LANDSCAPE[t.biome]) === val).length;
  const seriesList = SERIES_ORDER.filter((s) => count('series', s));
  const lands = [...new Set(tracks.map((t) => LANDSCAPE[t.biome]).filter(Boolean))];
  const toggle = (set, setter, v) => { const n = new Set(set); if (n.has(v)) n.delete(v); else n.add(v); setter(n); };
  const shown = tracks
    .filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()))
    .filter((t) => !series.size || series.has(t.series))
    .filter((t) => !land.size || land.has(LANDSCAPE[t.biome]))
    .sort((a, b) => (sort === 'new' ? new Date(b.created_at) - new Date(a.created_at) : a.name.localeCompare(b.name)));
  const newest = [...tracks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3).map((t) => t.id);
  const go = (slug) => { const n = new URLSearchParams(search); n.set('track', slug); navigate(`/play/shooter?${n}`); };
  // A season that is on, whose tracks this player may race: "Holiday races" (one of its tracks each race).
  const openSeason = tracks.find((t) => t.season?.state === 'on' && !t.locked)?.season ?? null;

  return (
    <div className="ms-page">
      <Steps at={1} />
      <div className="ms-row" style={{ justifyContent: 'space-between' }}>
        <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Pick a track</h1>
        <div className="ms-row ms-form" style={{ display: 'flex' }}>
          <input type="search" placeholder={`Search ${tracks.length} tracks`} aria-label="Search tracks" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 'min(100%, 260px)' }} />
          <button type="button" className="ms-btn ms-btn--sm" onClick={() => setSort((s) => (s === 'new' ? 'name' : 'new'))}>Sort: {sort === 'new' ? 'New' : 'A–Z'}</button>
          {openSeason && <button type="button" className="ms-btn ms-btn--sm" onClick={() => go(`season:${openSeason.key}`)}>{openSeason.name.replace(/ Season \d{4}$/, '')} races</button>}
          <button type="button" className="ms-btn ms-btn--sm ms-btn--primary" onClick={() => go('random')}>Random track</button>
        </div>
      </div>
      <div className="ms-two" style={{ alignItems: 'start' }}>
        <aside aria-label="Filters" className="ms-card ms-filters" style={{ flex: '0 1 230px' }}>
          <span className="ms-eyebrow" style={{ color: 'var(--ms-muted)' }}>Series</span>
          {seriesList.map((s) => <label key={s} className="ms-check"><input type="checkbox" checked={series.has(s)} onChange={() => toggle(series, setSeries, s)} /><span>{s}</span><span className="ms-grow" /><span>{count('series', s)}</span></label>)}
          <span className="ms-eyebrow" style={{ color: 'var(--ms-muted)', marginTop: 8 }}>Landscape</span>
          {lands.map((l) => <label key={l} className="ms-check"><input type="checkbox" checked={land.has(l)} onChange={() => toggle(land, setLand, l)} /><span>{l}</span><span className="ms-grow" /><span>{count('land', l)}</span></label>)}
        </aside>
        <section className="ms-cards" style={{ flex: '1 1 480px', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))' }} aria-label="Tracks">
          {shown.map((t) => {
            const r = best.get(t.slug);
            return (
              <button key={t.id} type="button" className="ms-trackcard" onClick={() => (t.locked ? navigate(`/pass?season=${t.season.key}`) : go(t.slug))}>
                <div className="ms-trackcard__pic" style={{ background: SERIES_PIC[t.series] }}>
                  <TrackBanner slug={t.slug} />
                  {t.locked
                    ? <span className="ms-badge-label" aria-label="Locked: in the season pass">🔒 {t.season.state === 'before' ? 'SOON' : 'GET THE PASS'}</span>
                    : t.season?.featured ? <span className="ms-badge-label" style={{ background: 'var(--ms-green)' }}>TRACK OF THE DAY</span>
                    : newest.includes(t.id) && <span className="ms-badge-label" style={{ background: 'var(--ms-green)' }}>NEW</span>}
                </div>
                <div className="ms-trackcard__body">
                  <b>{t.name}</b>
                  <span>{t.series}{LANDSCAPE[t.biome] ? ` · ${LANDSCAPE[t.biome]}` : ''}</span>
                  <span style={{ color: r ? 'var(--ms-soft)' : 'var(--ms-muted)' }}>
                    {r ? `Your best: ${r.best_position}${['th', 'st', 'nd', 'rd'][r.best_position % 10 > 3 || Math.floor(r.best_position / 10) === 1 ? 0 : r.best_position % 10]}${r.best_time_ms ? ` · ${(r.best_time_ms / 1000).toFixed(1)} s` : ''}` : 'Not raced yet'}
                  </span>
                </div>
              </button>
            );
          })}
          {tracks.length > 0 && shown.length === 0 && <p className="ms-note">No track matches. Clear a filter.</p>}
        </section>
      </div>
    </div>
  );
}

// ── 3 · Shooter ───────────────────────────────────────────────────────────

export function ShooterStep() {
  const [search] = useSearchParams();
  const { ready, error } = useRacer();
  const { user } = useAuth();
  const bag = useAsync(() => (ready ? api.bag() : null), [ready]);
  const tracks = useTracks();
  const trackSlug = search.get('track');
  const track = tracks.find((t) => t.slug === trackSlug);
  const [busy, setBusy] = useState(false);
  const shooter = shooterOf(bag.data);
  const options = useMemo(() => {
    if (!bag.data) return [];
    return [
      ...bag.data.copies.map((c) => ({ key: c.slug, item: c.slug, name: ITEM[c.slug]?.design.name ?? c.slug })),
      ...bag.data.originals.map((m) => ({ key: m.id, original: m.id, marble: m, name: m.name })),
    ];
  }, [bag.data]);
  const isShooter = (o) => (o.item ? bag.data?.shooter?.item === o.item : bag.data?.shooter?.original === o.original || (!bag.data?.shooter && o.marble === bag.data?.originals[0]));
  const choose = async (o) => {
    setBusy(true);
    try { await api.setShooter(o.item ? { item: o.item } : { original: o.original }); await bag.reload(); } finally { setBusy(false); }
  };

  return (
    <div className="ms-page">
      <Steps at={2} track={trackSlug === 'random' ? 'Random' : track?.name} />
      <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Pick your Shooter</h1>
      {error && <div className="ms-msg ms-msg--bad">{error}</div>}
      <div className="ms-two" style={{ alignItems: 'start' }}>
        <section className="ms-card" style={{ display: 'grid', gap: 10, justifyItems: 'center', textAlign: 'center', flex: '0 1 320px' }}>
          {shooter && (shooter.slug ? <MarbleBadge slug={shooter.slug} size={150} label={shooter.name} /> : <MarbleBadge marble={shooter.marble} size={150} label={shooter.name} />)}
          <h2 className="ms-h2" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>{shooter?.name ?? '…'}</h2>
          {shooter?.slug && <span className="ms-note">{ITEM[shooter.slug].design.inRaces}</span>}
          <span className="ms-pill">Looks only: <b style={{ color: 'var(--ms-yellow)' }}>every player races at the same level</b></span>
        </section>
        <section className="ms-card" style={{ display: 'grid', gap: 14, flex: '1 1 420px' }}>
          <div className="ms-row" style={{ justifyContent: 'space-between' }}>
            <h2 className="ms-h3" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.6rem' }}>Your Marble Bag</h2>
            <Link to="/shop" style={{ color: 'var(--ms-yellow)', fontWeight: 700 }}>Get more in the Shop →</Link>
          </div>
          <div className="ms-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10 }}>
            {options.map((o) => (
              <button key={o.key} type="button" className="ms-shade" aria-pressed={isShooter(o)} disabled={busy} onClick={() => choose(o)}>
                {o.item ? <MarbleBadge slug={o.item} size={60} /> : <MarbleBadge marble={o.marble} size={60} />}
                <small style={{ color: 'var(--ms-text)', fontWeight: 600 }}>{o.name}</small>
              </button>
            ))}
          </div>
          <div className="ms-flowbar" style={{ border: 0, padding: 0 }}>
            <span />
            {search.get('room')
              ? <Link to={`/r/${search.get('room')}?rejoin=1`} className="ms-btn ms-btn--primary">BACK TO THE ROOM</Link>
              : <Link to={`/play/start?${search}`} className="ms-btn ms-btn--primary">TO THE STARTING LINE</Link>}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── 4 · Starting line ─────────────────────────────────────────────────────

export function StartStep() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { ready, error } = useRacer();
  const { user } = useAuth();
  const quick = search.get('quick') === '1';
  const tracks = useTracks();
  const bag = useAsync(() => (ready ? api.bag() : null), [ready]);
  const trackSlug = quick ? 'random' : search.get('track') ?? 'random';
  const track = tracks.find((t) => t.slug === trackSlug);
  const seasonKey = trackSlug.startsWith('season:') ? trackSlug.slice(7) : null; // ("Holiday races")
  const shooter = shooterOf(bag.data);
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState(null);
  const grid = useMemo(() => previewShowcase(19, `${trackSlug}-${user?.id}`), [trackSlug, user?.id]);

  const start = async () => {
    setBusy(true);
    setStartError(null);
    try {
      const { race } = await api.createRace({
        ...(track ? { track_id: track.id } : seasonKey ? { season: seasonKey } : { random_track: true }),
        enter: true,
        min_marbles: 20,
        max_marbles: 20,
      });
      // Solo for now (friend rooms come next): house marbles fill the field and it starts at once.
      await api.startRace(race.id).catch(() => {});
      navigate(`/race/${race.id}`);
    } catch (e) {
      setStartError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="ms-page">
      <Steps at={3} track={track?.name ?? 'Random'} shooter={shooter?.name} />
      {error && <div className="ms-msg ms-msg--bad">{error}</div>}
      <div className="ms-two" style={{ alignItems: 'stretch' }}>
        <section className="ms-hero ms-hero--col" style={{ flexBasis: 520, background: track ? `${SERIES_PIC[track.series]}` : SERIES_PIC.Classic }} aria-label="The grid">
          <div style={{ display: 'grid', gap: 4 }}>
            <b style={{ fontFamily: 'var(--ms-cond)', fontSize: '2rem' }}>{track?.name ?? 'Random track'}</b>
            <span style={{ color: 'var(--ms-text)', opacity: 0.85 }}>{track ? `${track.series}${LANDSCAPE[track.biome] ? ` · ${LANDSCAPE[track.biome]}` : ''}` : 'Picked at random when you start'}</span>
          </div>
          <div className="ms-gate" aria-hidden="true">
            <span className="ms-gate__you">{shooter && (shooter.slug ? <MarbleBadge slug={shooter.slug} size={40} /> : <MarbleBadge marble={shooter.marble} size={40} />)}<small>YOU</small></span>
            {grid.map((slug, k) => (slug ? <MarbleBadge key={k} slug={slug} size={30} still /> : <MarbleBadge key={k} marble={{ color_primary: '#8A93A6' }} size={30} still />))}
          </div>
          <div className="ms-row" style={{ justifyContent: 'space-between' }}>
            <span>20 marbles · you and 19 CPU players</span>
            <span style={{ opacity: 0.8 }}>In your first races the CPU players show off marbles from the shop. Places at the gate are drawn at random.</span>
          </div>
        </section>
        <aside className="ms-card" style={{ display: 'grid', gap: 14, alignContent: 'start', flexBasis: 300 }}>
          <h1 className="ms-h2" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>The starting line</h1>
          <div className="ms-row" style={{ flexWrap: 'nowrap' }}>
            {shooter && (shooter.slug ? <MarbleBadge slug={shooter.slug} size={44} /> : <MarbleBadge marble={shooter.marble} size={44} />)}
            <div style={{ display: 'grid', flex: 1, minWidth: 0 }}><b>@{user?.username ?? '…'} (host)</b><span className="ms-note">{shooter?.name ?? 'Picking a Shooter…'}</span></div>
            <span style={{ color: 'var(--ms-green)', fontWeight: 700 }}>✓ Ready</span>
          </div>
          <span className="ms-note">CPU players fill every other place. Racing with friends? <Link to={`/play/friends${track?.slug ? `?track=${encodeURIComponent(track.slug)}` : ''}`}>Make a friend room</Link> and send them the link.</span>
          {startError && <div className="ms-msg ms-msg--bad" role="alert">{startError}</div>}
          <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" onClick={start} disabled={busy || !ready || !tracks.length}>{busy ? 'STARTING…' : 'START THE RACE'}</button>
          {!quick && <Link to={`/play/shooter?${search}`} style={{ color: 'var(--ms-soft)', textAlign: 'center' }}>Change Shooter</Link>}
          {quick && <Link to="/play/track" style={{ color: 'var(--ms-soft)', textAlign: 'center' }}>Pick the track yourself</Link>}
        </aside>
      </div>
    </div>
  );
}
