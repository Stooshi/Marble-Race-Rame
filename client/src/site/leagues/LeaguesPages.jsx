import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import QuickSignup from '../account/QuickSignup';
import { SITE_URL } from '../canonical';
import TrackBanner, { SERIES_PIC } from '../TrackBanner';
import { useTracks } from '../pages/RaceFlow';
import { GO_PRO, lapTime, timeLeft, triesText, useLeaguesOn } from './status';
import { NAME_NOT_ALLOWED, checkName } from '../../shared/nameFilter';

/**
 * Leagues, the website's side (Leagues v1 part 1, 27 Oct 2026; plan: project doc
 * claude/leagues-v1-build-plan.md). Behind the server's LEAGUES switch (useLeaguesOn): off, every page
 * here is the 404.
 *
 *   /leagues        Create a league, My leagues, a league's code
 *   /leagues/new    Create: the name, 5 tracks, 1–7 days, tries per track
 *   /l/:code        A league: join (its link), the tracks with my bests and tries, the scoreboard,
 *                   time left, sharing; the creator adds and removes players and can Run again
 *
 * Saved accounts only: a guest saves their marble first, a visitor saves or logs in. Pro Leagues and
 * what pays for them are part 2 (after 1 Nov): until then only the "Go pro" line mentions them.
 */

const TRACKS = 5;
const DAYS = [1, 2, 3, 4, 5, 6, 7];
const TRIES = [[null, 'Unlimited'], [3, '3'], [5, '5'], [10, '10']];
const h1 = { fontFamily: 'var(--ms-cond)', fontWeight: 800 };
const h2 = { fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.6rem' };

/**
 * The page itself while the switch is open to this player; while it is off (or admins only), the 404,
 * or `Closed` instead (an invite link: "Leagues are coming soon"); nothing while asking.
 */
function Gate({ NotFound, Closed = NotFound, children }) {
  const on = useLeaguesOn();
  if (on === null) return <div className="ms-page"><p className="ms-note">Loading…</p></div>;
  return on ? children : <Closed />;
}

/** An invite link while Leagues aren't open to everyone yet (Moses, 27 Oct 2026: not a 404). */
export function LeaguesSoon() {
  return (
    <div className="ms-page">
      <section className="ms-hero ms-notfound" aria-labelledby="soon-h">
        <div style={{ display: 'grid', gap: 12 }}>
          <span className="ms-eyebrow" style={{ color: 'var(--ms-orange)' }}>Leagues</span>
          <h1 id="soon-h" className="ms-h1" style={h1}>Leagues are coming soon</h1>
          <p style={{ color: 'var(--ms-soft)', margin: 0, maxWidth: '52ch' }}>A friend sent you a league: your own competition on the tracks you pick, best times count. It opens here soon, so keep the link. Until then, race now.</p>
          <div className="ms-row">
            <Link to="/race" className="ms-btn ms-btn--primary">RACE NOW</Link>
            <Link to="/" className="ms-btn">Back home</Link>
          </div>
        </div>
        <div className="ms-notfound__ball" aria-hidden="true" />
      </section>
    </div>
  );
}

/** Saved accounts only: a guest saves their marble, a visitor saves one or logs in (then back here). */
function SaveFirst({ next, why = 'Leagues are for saved accounts.', onSaved }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <section className="ms-card ms-league-save" aria-labelledby="save-h">
      <h2 id="save-h" className="ms-h3" style={h2}>Save your marble to race in leagues</h2>
      <p className="ms-note" style={{ margin: 0 }}>{why} It's free: a name, an email and a password{user?.is_guest ? ', and your coins and marbles stay yours' : ''}.</p>
      {open
        ? <QuickSignup heading="h3" onSaved={onSaved} onDone={() => setOpen(false)} onLater={() => setOpen(false)} />
        : (
          <div className="ms-row">
            <button type="button" className="ms-btn ms-btn--primary" onClick={() => setOpen(true)}>SAVE MY MARBLE</button>
            {!user?.is_guest && <Link to={`/signup?mode=login&next=${encodeURIComponent(next)}`} className="ms-btn">LOG IN</Link>}
          </div>
        )}
    </section>
  );
}

// ── /leagues ──────────────────────────────────────────────────────────────

export function LeaguesHome({ NotFound }) {
  return <Gate NotFound={NotFound}><LeaguesHomeIn /></Gate>;
}

function LeaguesHomeIn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const saved = Boolean(user && !user.is_guest);
  const { data, error } = useAsync(() => (saved ? api.myLeagues() : null), [saved, user?.id]);
  const [code, setCode] = useState('');
  const skew = data?.serverNow ? new Date(data.serverNow).getTime() - Date.now() : 0;
  const open = (data?.leagues ?? []).filter((l) => l.status === 'open');
  const ended = (data?.leagues ?? []).filter((l) => l.status !== 'open');
  return (
    <div className="ms-page">
      <h1 className="ms-h1" style={h1}>Leagues</h1>
      <p className="ms-note ms-league-lede">Your own competition with friends: pick 5 tracks and how long it runs, share the link, and everyone's best time on each track counts. The fastest total when it ends wins.</p>
      {!saved && <SaveFirst next="/leagues" />}
      <div className="ms-two" style={{ alignItems: 'start' }}>
        <section className="ms-card ms-league-col" aria-labelledby="create-h">
          <h2 id="create-h" className="ms-h3" style={h2}>Create a league</h2>
          <div className="ms-league-kind" aria-current="true">
            <b>League</b>
            <span>5 tracks · free · for fun</span>
          </div>
          <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={!saved} onClick={() => navigate('/leagues/new')}>CREATE A LEAGUE</button>
          <form className="ms-form ms-row" style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c) navigate(`/l/${c}`); }}>
            <input aria-label="League code" placeholder="Got a league code?" value={code} onChange={(e) => setCode(e.target.value)} maxLength={10} style={{ flex: '1 1 160px', textTransform: 'uppercase' }} />
            <button type="submit" className="ms-btn ms-btn--sm" disabled={!code.trim()}>Open</button>
          </form>
          <p className="ms-note ms-go-pro">{GO_PRO}</p>
        </section>
        <section className="ms-card ms-league-col" style={{ flex: '1 1 420px' }} aria-labelledby="mine-h">
          <h2 id="mine-h" className="ms-h3" style={h2}>My leagues</h2>
          {error && <div className="ms-msg ms-msg--bad">{error.message}</div>}
          {saved && !data && !error && <p className="ms-note">Loading…</p>}
          {saved && data && !data.leagues.length && <p className="ms-note">You're not in a league yet. Create one, or open a friend's league link.</p>}
          {!saved && <p className="ms-note">Leagues you create or join show up here.</p>}
          {open.length > 0 && <LeagueList leagues={open} skew={skew} />}
          {ended.length > 0 && (
            <>
              <h3 className="ms-eyebrow" style={{ color: 'var(--ms-muted)', margin: '6px 0 0' }}>Ended</h3>
              <LeagueList leagues={ended} skew={skew} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** My leagues as rows: name, time left, my place, tracks done. Also the /home card's list. */
export function LeagueList({ leagues, skew = 0, compact = false }) {
  return (
    <ul className={`ms-league-list${compact ? ' ms-league-list--compact' : ''}`}>
      {leagues.map((l) => (
        <li key={l.code}>
          <Link to={`/l/${l.code}`} className="ms-league-list__row">
            <span className="ms-league-list__what">
              <b>{l.name}</b>
              <span className="ms-note">
                {l.status === 'open' ? timeLeft(l.ends_at, Date.now(), skew) : 'Final standings'}
                {' · '}{l.players} {l.players === 1 ? 'player' : 'players'}
              </span>
              {l.night && <span className="ms-league-list__night">{nightLine(l.night, skew)}</span>}
            </span>
            <span className="ms-league-list__me">
              {l.place ? <b>{ordinal(l.place)}</b> : <b>{l.done} of {l.tracks}</b>}
              <span className="ms-note">{l.place ? (l.status === 'open' ? 'your place' : 'you finished') : 'tracks done'}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const ordinal = (n) => {
  const v = n % 100;
  return `${n}${v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
};

/** The My leagues card on /home: the open leagues (at most 3), or nothing when there are none. */
export function MyLeaguesCard() {
  const on = useLeaguesOn();
  const { user } = useAuth();
  const saved = Boolean(user && !user.is_guest);
  const { data } = useAsync(() => (on && saved ? api.myLeagues().catch(() => null) : null), [on, saved, user?.id]);
  const open = (data?.leagues ?? []).filter((l) => l.status === 'open');
  if (!on || !open.length) return null;
  const skew = data?.serverNow ? new Date(data.serverNow).getTime() - Date.now() : 0;
  return (
    <section className="ms-card" style={{ display: 'grid', gap: 8 }} aria-labelledby="my-leagues-h">
      <div className="ms-row" style={{ justifyContent: 'space-between' }}>
        <h2 id="my-leagues-h" style={{ margin: 0, fontSize: '1rem' }}>My leagues</h2>
        <Link to="/leagues" style={{ color: 'var(--ms-soft)' }}>All →</Link>
      </div>
      <LeagueList leagues={open.slice(0, 3)} skew={skew} compact />
    </section>
  );
}

// ── /leagues/new ──────────────────────────────────────────────────────────

export function CreateLeague({ NotFound }) {
  return <Gate NotFound={NotFound}><CreateLeagueIn /></Gate>;
}

function CreateLeagueIn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tracks = useTracks();
  const saved = Boolean(user && !user.is_guest);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState([]); // track ids, in order
  const [days, setDays] = useState(7);
  const [tries, setTries] = useState(null);
  const [q, setQ] = useState('');
  const [series, setSeries] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const seriesList = useMemo(() => [...new Set(tracks.map((t) => t.series).filter(Boolean))], [tracks]);
  const shown = tracks
    .filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()))
    .filter((t) => !series || t.series === series);
  const full = picked.length >= TRACKS;
  const toggle = (t) => setPicked((p) => (p.includes(t.id) ? p.filter((x) => x !== t.id) : p.length < TRACKS ? [...p, t.id] : p));
  const random = () => {
    const free = tracks.filter((t) => !t.locked).map((t) => t.id);
    const out = [];
    while (out.length < TRACKS && free.length) out.push(free.splice(Math.floor(Math.random() * free.length), 1)[0]);
    setPicked(out);
  };
  const nameOk = name.trim().length >= 2 && name.trim().length <= 40 && !checkName(name.trim());
  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const v = await api.createLeague({ name: name.trim(), track_ids: picked, days, attempts: tries });
      navigate(`/l/${v.league.code}?new=1`);
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  if (!saved) return <div className="ms-page"><h1 className="ms-h1" style={h1}>Create a league</h1><SaveFirst next="/leagues/new" /></div>;
  return (
    <div className="ms-page">
      <div className="ms-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 className="ms-h1" style={h1}>Create a league</h1>
        <Link to="/leagues" style={{ color: 'var(--ms-soft)' }}>← Leagues</Link>
      </div>
      <div className="ms-league-create">
        <section className="ms-card ms-league-col ms-league-create__set" aria-label="Settings">
          <div className="ms-league-kind" aria-current="true"><b>League</b><span>5 tracks · free · for fun</span></div>
          <label className="ms-form" style={{ display: 'grid', gap: 6 }}>
            <span className="ms-eyebrow" style={{ color: 'var(--ms-muted)' }}>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Office Cup" />
          </label>
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="ms-eyebrow" style={{ color: 'var(--ms-muted)' }}>Runs for</span>
            <div className="ms-chips" role="group" aria-label="How long it runs">
              {DAYS.map((d) => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>{d} {d === 1 ? 'day' : 'days'}</button>)}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="ms-eyebrow" style={{ color: 'var(--ms-muted)' }}>Tries per track</span>
            <div className="ms-chips" role="group" aria-label="Tries per track">
              {TRIES.map(([v, label]) => <button key={label} type="button" aria-pressed={tries === v} onClick={() => setTries(v)}>{label}</button>)}
            </div>
          </div>
        </section>
        <section className="ms-card ms-league-col ms-league-create__sum" aria-label="Your tracks">
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="ms-eyebrow" style={{ color: 'var(--ms-muted)' }}>Tracks ({picked.length} of {TRACKS})</span>
            <ol className="ms-league-picked">
              {Array.from({ length: TRACKS }, (_, k) => {
                const t = byId.get(picked[k]);
                return (
                  <li key={k}>
                    {t ? <><span>{t.name}</span><button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" aria-label={`Take out ${t.name}`} onClick={() => toggle(t)}>✕</button></> : <span className="ms-note">Pick a track</span>}
                  </li>
                );
              })}
            </ol>
          </div>
          <p className="ms-note ms-league-create__note" style={{ margin: 0 }}>{days} {days === 1 ? 'day' : 'days'} from now · {triesText(tries).toLowerCase()} · your best time on each track counts. League races pay coins like any race.</p>
          {error && <div className="ms-msg ms-msg--bad" role="alert">{error.message}</div>}
          <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={busy || !nameOk || picked.length !== TRACKS} onClick={create}>
            {busy ? 'CREATING…' : 'CREATE THE LEAGUE'}
          </button>
          {!nameOk && name.length > 0 && <span className="ms-note">{checkName(name.trim()) ? NAME_NOT_ALLOWED : 'A name of 2 to 40 characters.'}</span>}
        </section>
        <section className="ms-card ms-league-col ms-league-create__pick" aria-labelledby="pick-h">
          <div className="ms-row" style={{ justifyContent: 'space-between' }}>
            <h2 id="pick-h" className="ms-h3" style={h2}>Pick 5 tracks</h2>
            <button type="button" className="ms-btn ms-btn--sm" onClick={random} disabled={!tracks.length}>5 at random</button>
          </div>
          <div className="ms-row ms-form" style={{ display: 'flex', gap: 8 }}>
            <input type="search" placeholder={`Search ${tracks.length} tracks`} aria-label="Search tracks" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 200px' }} />
            <select aria-label="Series" value={series} onChange={(e) => setSeries(e.target.value)} className="ms-league-select">
              <option value="">All series</option>
              {seriesList.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="ms-league-tracks" role="group" aria-label="Tracks">
            {shown.map((t) => {
              const on = picked.includes(t.id);
              return (
                <button key={t.id} type="button" className="ms-league-track" aria-pressed={on} disabled={(t.locked && !on) || (full && !on)} onClick={() => toggle(t)}>
                  <span className="ms-league-track__pic" style={{ background: SERIES_PIC[t.series] }}><TrackBanner slug={t.slug} /></span>
                  <span className="ms-league-track__name">
                    <b>{t.name}</b>
                    <span>{t.locked ? 'Season pass holders only' : t.series}</span>
                  </span>
                  <span className="ms-league-track__mark" aria-hidden="true">{on ? `${picked.indexOf(t.id) + 1}` : '+'}</span>
                </button>
              );
            })}
            {tracks.length > 0 && !shown.length && <p className="ms-note">No track matches.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── /l/:code ──────────────────────────────────────────────────────────────

export function LeaguePage({ NotFound }) {
  return <Gate NotFound={NotFound} Closed={LeaguesSoon}><LeaguePageIn /></Gate>;
}

function LeaguePageIn() {
  const { code: raw } = useParams();
  const code = (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const saved = Boolean(user && !user.is_guest);
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [skew, setSkew] = useState(0);
  const isNew = search.get('new') === '1';
  // The invite's welcome (Moses, 27 Oct 2026): `?join=1` back from logging in joins by itself;
  // `?joined=1` is the "You're in" line with track 1's RACE.
  const wantsJoin = search.get('join') === '1';
  const joined = search.get('joined') === '1';
  const [peek, setPeek] = useState(false);
  const joining = useRef(false);

  const load = useCallback(async () => {
    try {
      const v = await api.league(code);
      if (v?.serverNow) setSkew(new Date(v.serverNow).getTime() - Date.now());
      if (joining.current) return; // (a view from before the join would show the welcome again)
      setView(v);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [code]);
  useEffect(() => { if (!authLoading) load(); }, [authLoading, load, user?.id]);

  /** Join, then the league page with "You're in" and track 1 ready to race. */
  const joinNow = useCallback(async () => {
    if (joining.current) return;
    joining.current = true;
    setBusy('join'); setError(null);
    try {
      setView(await api.joinLeague(code));
      setSearch({ joined: '1' }, { replace: true });
      if (typeof window !== 'undefined') window.scrollTo?.({ top: 0 });
    } catch (e) {
      setError(e);
      setSearch({}, { replace: true });
    } finally {
      joining.current = false;
      setBusy(null);
    }
  }, [code, setSearch]);
  // Back from logging in (or saving the marble elsewhere) with ?join=1: join by itself.
  useEffect(() => {
    if (!wantsJoin || !view || !user) return;
    if (view.member) setSearch({ joined: '1' }, { replace: true });
    else if (saved && view.league.status === 'open') joinNow();
  }, [wantsJoin, view, user, saved, joinNow, setSearch]);
  // Fresh while it runs (other players' times), and the clock.
  useEffect(() => {
    if (view?.league.status !== 'open') return undefined;
    const poll = setInterval(load, 20000);
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [view?.league.status, load]);

  const run = (key, fn) => async () => {
    setBusy(key);
    try {
      const v = await fn();
      if (v?.league) setView(v);
      setError(null);
      return v;
    } catch (e) {
      setError(e);
      return null;
    } finally {
      setBusy(null);
    }
  };
  const race = (trackId) => run(`race-${trackId}`, async () => {
    const { race: r } = await api.leagueRace(code, trackId);
    // Solo: the race page builds the track's 3D view first and then starts it (the start show).
    navigate(`/race/${r.id}?go=1`);
    return null;
  })();
  const again = run('again', async () => {
    const v = await api.leagueAgain(code);
    navigate(`/l/${v.league.code}?new=1`);
    return v;
  });

  if (error && !view) {
    return (
      <div className="ms-page" style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
        <h1 className="ms-h1" style={h1}>League {code}</h1>
        <div className="ms-msg ms-msg--bad">{error.status === 404 ? 'There is no league with that code. Check the link, or ask your friend for it again.' : error.message}</div>
        <Link to="/leagues" className="ms-btn ms-btn--primary">LEAGUES</Link>
      </div>
    );
  }
  if (!view) return <div className="ms-page"><p className="ms-note">Opening league {code}…</p></div>;

  const { league, tracks, scoreboard, member, me } = view;
  const isOpen = league.status === 'open' && new Date(league.ends_at).getTime() > now + skew;
  const mine = league.mine_to_run;
  const ends = new Date(league.ends_at);
  const winner = league.status === 'ended' ? scoreboard.find((r) => r.place === 1) : null;
  // Someone opening an invite: the welcome first (a member goes straight to the league page).
  if (!member && isOpen && !peek) {
    return <LeagueWelcome view={view} code={code} saved={saved} guest={Boolean(user?.is_guest)} busy={busy === 'join' || (wantsJoin && saved)} error={error} now={now} skew={skew} onJoin={joinNow} onPeek={() => setPeek(true)} />;
  }
  return (
    <div className="ms-page">
      <div className="ms-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span className="ms-eyebrow" style={{ color: 'var(--ms-orange)' }}>League{league.creator ? ` · by ${league.creator.name}` : ''}</span>
          {mine
            ? <LeagueName code={code} name={league.name} onView={setView} />
            : <h1 className="ms-h1" style={{ ...h1, overflowWrap: 'anywhere' }}>{league.name}</h1>}
        </div>
        <span className="ms-id ms-id--big" aria-label={`League code ${code.split('').join(' ')}`}>{code}</span>
      </div>
      <div className="ms-pills">
        <span className="ms-pill" style={{ color: isOpen ? 'var(--ms-yellow)' : 'var(--ms-soft)' }}>{isOpen ? timeLeft(league.ends_at, now, skew) : 'Ended: final standings'}</span>
        <span className="ms-pill">{tracks.length} tracks</span>
        <span className="ms-pill">{triesText(league.attempts)}</span>
        <span className="ms-pill">{isOpen ? 'Ends' : 'Ended'} {ends.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        <NightButton night={view.night} member={member} mine={mine} isOpen={isOpen} skew={skew} now={now} />
      </div>
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error.message}</div>}
      {isNew && member && isOpen && (
        <div className="ms-msg ms-league-new" role="status">
          <span>Your league is ready. Send the link to your friends: they join with a saved account, free.</span>
          <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" onClick={() => setSearch({}, { replace: true })}>OK</button>
        </div>
      )}
      {joined && member && isOpen && tracks[0] && (
        <div className="ms-msg ms-league-new ms-league-in" role="status">
          <span><b>You're in!</b> Race track 1, {tracks[0].name}, to get on the scoreboard: your best time on each track counts.</span>
          <span className="ms-row" style={{ gap: 8 }}>
            <button type="button" className="ms-btn ms-btn--primary" disabled={Boolean(busy) || tracks[0].tries_left === 0} onClick={() => race(tracks[0].id)}>{busy === `race-${tracks[0].id}` ? 'STARTING…' : 'RACE TRACK 1'}</button>
            <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" onClick={() => setSearch({}, { replace: true })}>Later</button>
          </span>
        </div>
      )}
      {winner && <div className="ms-msg" role="status"><b>{winner.name}</b> won with {lapTime(winner.total_ms)}{winner.user_id === user?.id ? '. Well raced!' : '.'}</div>}

      {!member && isOpen && (saved
        ? (
          <section className="ms-card ms-league-join" aria-label="Join">
            <span>{league.creator ? `${league.creator.name} invited you` : 'Join this league'}: race its {tracks.length} tracks, your best time on each counts.</span>
            <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={Boolean(busy)} onClick={joinNow}>{busy === 'join' ? 'JOINING…' : 'JOIN AND START RACING'}</button>
          </section>
        )
        : <SaveFirst next={`/l/${code}?join=1`} onSaved={joinNow} why="Leagues are for saved accounts, so your times keep your name." />)}

      <div className="ms-two" style={{ alignItems: 'start' }}>
        <section className="ms-card ms-league-col" style={{ flex: '1 1 440px' }} aria-labelledby="tracks-h">
          <h2 id="tracks-h" className="ms-h3" style={h2}>Tracks</h2>
          <ol className="ms-league-run">
            {tracks.map((t, k) => (
              <li key={t.id}>
                <span className="ms-league-run__n">{k + 1}</span>
                <span className="ms-league-run__what">
                  <b>{t.name}</b>
                  {member && (
                    <span className="ms-note">
                      {t.best_ms ? `Your best ${lapTime(t.best_ms)}` : 'Not raced yet'}
                      {t.tries_left === null || t.tries_left === undefined
                        ? (t.tries ? ` · ${t.tries} ${t.tries === 1 ? 'try' : 'tries'}` : '')
                        : ` · ${t.tries_left} of ${league.attempts} tries left`}
                    </span>
                  )}
                </span>
                {member && isOpen && (
                  <button type="button" className="ms-btn ms-btn--sm ms-btn--primary" disabled={Boolean(busy) || t.tries_left === 0} onClick={() => race(t.id)}>
                    {busy === `race-${t.id}` ? 'STARTING…' : t.tries_left === 0 ? 'NO TRIES' : 'RACE'}
                  </button>
                )}
              </li>
            ))}
          </ol>
          {member && isOpen && <p className="ms-note" style={{ margin: 0 }}>Each race is you and 19 computer players. A try counts from when it starts; a race made before the league ends counts even if it finishes just after.</p>}
          {member && me && <p style={{ margin: 0 }}>{me.place ? <>You're <b>{ordinal(me.place)}</b> with {lapTime(me.total_ms)}.</> : <>{me.done} of {tracks.length} tracks done: finish all {tracks.length} for a place.</>}</p>}
        </section>
        {member && isOpen && <ShareCard code={code} name={league.name} />}
      </div>

      <LeagueNight code={code} view={view} member={member} mine={mine} isOpen={isOpen} now={now} skew={skew} userId={user?.id} onView={setView} />

      <section className="ms-card" style={{ padding: 0, overflowX: 'auto' }} aria-labelledby="board-h">
        <h2 id="board-h" className="ms-h3" style={{ ...h2, padding: '16px 16px 0' }}>{isOpen ? 'Scoreboard' : 'Final standings'}</h2>
        <table className="ms-table ms-table--league">
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Player</th>
              <th scope="col" className="num">Total</th>
              {tracks.map((t, k) => <th key={t.id} scope="col" className="num ms-league-wide ms-league-th" title={`${k + 1}. ${t.name}`}><span>{t.name}</span></th>)}
              <th scope="col" className="num ms-league-narrow">Tracks</th>
              {mine && isOpen && <th scope="col"><span className="ms-visually-hidden">Remove</span></th>}
            </tr>
          </thead>
          <tbody>
            {scoreboard.map((r) => (
              <tr key={r.user_id} className={r.user_id === user?.id ? 'is-me' : undefined}>
                <td>{r.place ? ordinal(r.place) : '—'}</td>
                <td className="ms-league-player">{r.name}{r.user_id === user?.id ? ' (you)' : ''}{r.user_id === league.creator?.id ? <span className="ms-note"> · runs it</span> : null}</td>
                <td className="num">{r.total_ms ? <b>{lapTime(r.total_ms)}</b> : <span className="ms-note">{r.done} of {tracks.length}</span>}</td>
                {r.bests.map((b, k) => <td key={tracks[k]?.id ?? k} className="num ms-league-wide">{b ? lapTime(b) : '—'}</td>)}
                <td className="num ms-league-narrow">{r.done}/{tracks.length}</td>
                {mine && isOpen && (
                  <td>{r.user_id !== user?.id && <RemoveButton name={r.name} disabled={Boolean(busy)} onRemove={run(`rm-${r.user_id}`, () => api.leagueRemove(code, r.user_id))} />}</td>
                )}
              </tr>
            ))}
            {!scoreboard.length && <tr><td colSpan={4 + tracks.length}><span className="ms-note">Nobody has joined yet.</span></td></tr>}
          </tbody>
        </table>
        <p className="ms-note" style={{ padding: '0 16px 16px', margin: 0 }}>The total is each player's best times added together, once all {tracks.length} tracks are done. The fastest total wins; on the same total, whoever set it first is ahead.</p>
      </section>

      {mine && isOpen && <AddPlayer busy={busy} onAdd={(name) => run('add', () => api.leagueAdd(code, name))()} />}

      <div className="ms-row" style={{ gap: 14 }}>
        {mine && !isOpen && <button type="button" className="ms-btn ms-btn--primary" disabled={Boolean(busy)} onClick={again}>{busy === 'again' ? 'STARTING…' : 'RUN IT AGAIN'}</button>}
        {mine && !isOpen && <span className="ms-note">The same tracks, length and tries, with the same players.</span>}
        {member && !mine && isOpen && <LeaveButton disabled={Boolean(busy)} onLeave={run('leave', async () => { await api.leaveLeague(code); navigate('/leagues'); return null; })} />}
        <Link to="/leagues" style={{ color: 'var(--ms-soft)' }}>My leagues</Link>
      </div>
      <p className="ms-note ms-go-pro">{GO_PRO}</p>
    </div>
  );
}

/**
 * An invite link's welcome (Moses, 27 Oct 2026): who invited you to which league, its 5 tracks' pictures,
 * when it ends, how many have joined, the tries; one big JOIN AND START RACING. A saved player joins at
 * once; a guest or visitor is told leagues need a saved account (free) and saves one right here (or logs
 * in, then comes back with ?join=1): either way they land on the league page already in, track 1 ready.
 */
export function LeagueWelcome({ view, code, saved, guest, busy, error, now, skew, onJoin, onPeek }) {
  const { league, tracks, scoreboard } = view;
  const all = useTracks();
  const series = useMemo(() => new Map(all.map((t) => [t.slug, t.series])), [all]);
  const [signing, setSigning] = useState(false);
  const formRef = useRef(null);
  useEffect(() => { if (signing) formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); }, [signing]);
  const players = scoreboard.length;
  const ends = new Date(league.ends_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const back = `/l/${code}?join=1`;
  return (
    <div className="ms-page ms-league-welcome">
      <section className="ms-card ms-league-welcome__card" aria-labelledby="welcome-h">
        <span className="ms-eyebrow" style={{ color: 'var(--ms-orange)' }}>League invite · {code}</span>
        <h1 id="welcome-h" className="ms-h1" style={{ ...h1, overflowWrap: 'anywhere', textWrap: 'balance' }}>
          {league.creator ? <>{league.creator.name} has invited you to join <span className="ms-league-welcome__name">{league.name}</span></> : <>You're invited to join <span className="ms-league-welcome__name">{league.name}</span></>}
        </h1>
        <ol className="ms-league-welcome__tracks" aria-label={`The league's ${tracks.length} tracks`}>
          {tracks.map((t, k) => (
            <li key={t.id}>
              <span className="ms-league-welcome__pic" style={{ background: SERIES_PIC[series.get(t.slug)] ?? SERIES_PIC.Classic }}>
                <TrackBanner slug={t.slug} />
                <span className="ms-league-welcome__n">{k + 1}</span>
              </span>
              <span className="ms-league-welcome__tname">{t.name}</span>
            </li>
          ))}
        </ol>
        <ul className="ms-league-welcome__facts">
          <li><b>Ends {ends}</b><span>{timeLeft(league.ends_at, now, skew)}</span></li>
          <li><b>{players} {players === 1 ? 'player' : 'players'}</b><span>joined so far</span></li>
          <li><b>{triesText(league.attempts)}</b><span>your best time on each track counts</span></li>
        </ul>
        {error && <div className="ms-msg ms-msg--bad" role="alert">{error.message}</div>}
        {!signing && (
          <div className="ms-league-welcome__go">
            <button type="button" className="ms-btn ms-btn--primary ms-btn--lg ms-league-welcome__btn" disabled={busy} onClick={() => (saved ? onJoin() : setSigning(true))}>
              {busy ? 'JOINING…' : 'JOIN AND START RACING'}
            </button>
            {!saved && <span className="ms-note">Leagues need a saved account, so your times keep your name. It's free.</span>}
          </div>
        )}
      </section>
      {signing && !saved && (
        <section ref={formRef} className="ms-card ms-league-save" aria-label="Save your marble to join">
          <p style={{ margin: 0 }}><b>Leagues need a saved account (free).</b> Save yours and you're straight into {league.name}, ready to race track 1.</p>
          <QuickSignup heading="h2" title={guest ? 'Save your marble to join' : 'Make your free account to join'} sub={guest ? null : 'A player name, an email and a password: your times keep your name.'} onSaved={() => onJoin()} onDone={() => {}} onLater={() => setSigning(false)} />
          {!guest && <Link to={`/signup?mode=login&next=${encodeURIComponent(back)}`} className="ms-league-link">I already have an account: log in</Link>}
        </section>
      )}
      <button type="button" className="ms-league-link ms-league-welcome__peek" onClick={onPeek}>See the scoreboard first</button>
    </div>
  );
}

/** Two taps: "Remove" then "Remove <name>?" (no browser dialogs). */
function RemoveButton({ name, disabled, onRemove }) {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return undefined; const t = setTimeout(() => setSure(false), 4000); return () => clearTimeout(t); }, [sure]);
  return (
    <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" disabled={disabled} onClick={() => (sure ? onRemove() : setSure(true))} aria-label={sure ? `Remove ${name} for good` : `Remove ${name}`}>
      {sure ? 'Remove for good?' : 'Remove'}
    </button>
  );
}

function LeaveButton({ disabled, onLeave }) {
  const [sure, setSure] = useState(false);
  return sure
    ? <span className="ms-row" style={{ gap: 8 }}><span className="ms-note">Leave? Your times leave the scoreboard.</span><button type="button" className="ms-btn ms-btn--sm" disabled={disabled} onClick={onLeave}>Leave</button><button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" onClick={() => setSure(false)}>Stay</button></span>
    : <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" disabled={disabled} onClick={() => setSure(true)}>Leave the league</button>;
}

/** The creator adds a saved player by their name. */
function AddPlayer({ busy, onAdd }) {
  const [name, setName] = useState('');
  return (
    <section className="ms-card ms-league-col" aria-labelledby="add-h">
      <h2 id="add-h" style={{ margin: 0, fontSize: '1rem' }}>Add a player by name</h2>
      <form className="ms-form ms-row" style={{ display: 'flex', gap: 8 }} onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; const v = await onAdd(name.trim()); if (v) setName(''); }}>
        <input aria-label="Player name" placeholder="Their player name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} style={{ flex: '1 1 200px' }} />
        <button type="submit" className="ms-btn ms-btn--sm" disabled={!name.trim() || Boolean(busy)}>{busy === 'add' ? 'Adding…' : 'Add'}</button>
      </form>
      <span className="ms-note">Saved accounts only. A player you remove can't come back to this league.</span>
    </section>
  );
}

/** The league's link: copy, WhatsApp, the phone's Share, and a QR code. */
function ShareCard({ code, name }) {
  // (Always the website's own address, marblespins.com without www, Moses 27 Oct 2026: the one the
  // apps' app links are checked on; in the apps the page's own address is the app's inside one.)
  const link = `${SITE_URL}/l/${code}`;
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(null);
  useEffect(() => {
    let stop = false;
    QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: '#0B1020', light: '#FFFFFF' } }).then((u) => !stop && setQr(u)).catch(() => {});
    return () => { stop = true; };
  }, [link]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* (the link is on screen to copy by hand) */ }
  };
  const share = async () => {
    try { await navigator.share({ title: `${name} on Marble Spins`, text: `Join my marble league "${name}": race the tracks, best times count.`, url: link }); } catch { /* (closed) */ }
  };
  return (
    <section className="ms-card ms-league-col ms-league-share" aria-labelledby="share-h">
      <h2 id="share-h" className="ms-h3" style={h2}>Invite friends</h2>
      <div className="ms-league-share__link">
        <div className="ms-field-like" title={link}>{link.replace(/^https?:\/\//, '')}</div>
        <button type="button" className="ms-btn ms-btn--sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <div className="ms-row">
        <a className="ms-btn ms-btn--sm" href={`https://wa.me/?text=${encodeURIComponent(`Join my marble league "${name}"! ${link}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        {typeof navigator !== 'undefined' && navigator.share && <button type="button" className="ms-btn ms-btn--sm" onClick={share}>Share…</button>}
      </div>
      {qr && <img src={qr} alt={`QR code for league ${code}`} width={160} height={160} style={{ borderRadius: 12, background: '#fff' }} />}
      <p className="ms-note" style={{ margin: 0 }}>Friends open the link or scan the code, and join with a saved account (free).</p>
    </section>
  );
}

// ── League Night ──────────────────────────────────────────────────────────

/**
 * The League Night button by the league's header: "Join League Night" to its room while it's on, its
 * time while it's set (to the League Night card), "League Night" for the creator to set or start one.
 */
function NightButton({ night: n, member, mine, isOpen, now, skew }) {
  if (!member || !isOpen) return null;
  const live = n && ['scheduled', 'open'].includes(n.status);
  if (live && n.status === 'open' && n.room_code) {
    return <Link to={`/r/${n.room_code}`} className="ms-btn ms-btn--sm ms-btn--primary ms-league-nightbtn">JOIN LEAGUE NIGHT</Link>;
  }
  if (!live && !mine) return null;
  const go = () => document.getElementById('night-h')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <button type="button" className="ms-btn ms-btn--sm ms-league-nightbtn" onClick={go}>
      {live ? nightLine(n, skew, now).replace(': Join', '') : 'LEAGUE NIGHT'}
    </button>
  );
}

const NIGHT_RACES = [3, 4, 5];
const OPEN_BEFORE_MIN = 15; // (the league room opens this long before: src/leagues/night.js)
const RACE_ROOM_MIN = 4;
const NOW_LEAD_MIN = 2; // ("Start it now": race 1 this long after, NOW_LEAD_S in src/leagues/night.js)

/** "League Night in 2 h: Join", "League Night is on: Join", "League Night Thu 29 Oct, 20:00". */
export function nightLine(n, skew = 0, now = Date.now()) {
  if (n.status === 'open') return 'League Night is on: Join';
  const ms = new Date(n.starts_at).getTime() - (now + skew);
  if (ms <= 24 * 3600_000) {
    const min = Math.max(1, Math.round(ms / 60000));
    return `League Night in ${min < 60 ? `${min} min` : `${Math.round(min / 60)} h`}${ms <= OPEN_BEFORE_MIN * 60_000 ? ': Join' : ''}`;
  }
  return `League Night ${whenText(n.starts_at)}`;
}

const whenText = (iso) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** A date and time for <input type="datetime-local"> in this device's time ("2026-10-29T20:00"). */
const localInput = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * League Night on the league page (the slim version, Leagues v1): the creator sets a date, a time and
 * 3–5 races inside the league's days (or moves it, or calls it off); 15 minutes before, everyone gets
 * "Join the league room"; the night's own scoreboard, live and after: points for each place among the
 * league's players (10-8-6-5-4-3-2-1). It never uses tries.
 */
function LeagueNight({ code, view, member, mine, isOpen, now, skew, userId, onView }) {
  const n = view.night;
  const live = n && ['scheduled', 'open'].includes(n.status);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ends = new Date(view.league.ends_at);
  const soonest = new Date(now + skew + 10 * 60_000);
  const [races, setRaces] = useState(n?.races ?? 4);
  const [when, setWhen] = useState(() => {
    if (live) return localInput(new Date(n.starts_at));
    // (A first guess: tonight at 20:00, or tomorrow's, inside the league.)
    const d = new Date(now); d.setHours(20, 0, 0, 0);
    if (d < soonest) d.setDate(d.getDate() + 1);
    return localInput(d < ends ? d : soonest);
  });
  if (!member && !n) return null;
  if (!live && !mine && !n?.standings?.length) return null;
  const save = async () => {
    setBusy(true); setError(null);
    try { onView(await api.leagueNight(code, new Date(when).toISOString(), races)); setEditing(false); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const startNow = async () => {
    setBusy(true); setError(null);
    try { onView(await api.leagueNightNow(code, races)); setEditing(false); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const off = async () => {
    setBusy(true); setError(null);
    try { onView(await api.leagueNightOff(code)); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const latest = new Date(ends.getTime() - races * RACE_ROOM_MIN * 60_000);
  // ("Start it now" while there's time left in the league for the races.)
  const canNow = now + skew + NOW_LEAD_MIN * 60_000 <= latest.getTime();
  const trackName = (id) => view.tracks.find((t) => t.id === id)?.name ?? '';
  const startsIn = live ? new Date(n.starts_at).getTime() - (now + skew) : null;
  // (Under way once a race has started: the host may start the first one early.)
  const started = Boolean(n?.race_list?.some((r) => r.status !== 'lobby'));
  return (
    <section className="ms-card ms-league-col ms-league-night" aria-labelledby="night-h">
      <div className="ms-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 id="night-h" className="ms-h3" style={h2}>League Night</h2>
        {live && <span className="ms-pill" style={{ color: 'var(--ms-yellow)' }}>{n.status === 'open' ? 'On now' : whenText(n.starts_at)}</span>}
      </div>
      {!live && !editing && (
        <p className="ms-note" style={{ margin: 0 }}>Race live together: pick a time and 3 to 5 races. Everyone joins the league room and races the league's tracks in order, all in the same races. Points for each place go on the night's own scoreboard. It never uses your tries.</p>
      )}
      {live && n.status === 'scheduled' && (
        <p style={{ margin: 0 }}>{n.races} races on the league's tracks, starting {whenText(n.starts_at)} ({timeLeft(n.starts_at, now, skew).replace(' left', ' from now')}). The league room opens {OPEN_BEFORE_MIN} minutes before.</p>
      )}
      {live && n.status === 'open' && (
        <div className="ms-league-join">
          <span>{!started && startsIn > 0 ? `The league room is open: race 1 of ${n.races} starts ${timeLeft(n.starts_at, now, skew).replace(' left', '')} from now.` : `League Night is on: ${n.race_list.filter((r) => r.status === 'finished').length} of ${n.races} races run.`}</span>
          {member && n.room_code && <Link to={`/r/${n.room_code}`} className="ms-btn ms-btn--primary ms-btn--lg">JOIN THE LEAGUE ROOM</Link>}
        </div>
      )}
      {mine && isOpen && (!live || n.status === 'scheduled') && (editing || !live ? (
        <form className="ms-form ms-league-night__form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="ms-eyebrow" style={{ color: 'var(--ms-muted)' }}>Date and time</span>
            <input type="datetime-local" value={when} min={localInput(soonest)} max={localInput(latest)} onChange={(e) => setWhen(e.target.value)} required />
          </label>
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="ms-eyebrow" style={{ color: 'var(--ms-muted)' }}>Races</span>
            <div className="ms-chips" role="group" aria-label="Races">
              {NIGHT_RACES.map((k) => <button key={k} type="button" aria-pressed={races === k} onClick={() => setRaces(k)}>{k}</button>)}
            </div>
          </div>
          <div className="ms-row">
            <button type="submit" className="ms-btn ms-btn--primary" disabled={busy || !when}>{busy ? 'SAVING…' : live ? 'MOVE LEAGUE NIGHT' : 'SET LEAGUE NIGHT'}</button>
            {canNow && <button type="button" className="ms-btn" disabled={busy} onClick={startNow}>START IT NOW</button>}
            {live && <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" onClick={() => setEditing(false)}>Keep it</button>}
          </div>
          <span className="ms-note">Inside the league's days: it has to finish before the league ends ({whenText(view.league.ends_at)}).{canNow ? ` Start it now: the league room opens at once and race 1 starts in ${NOW_LEAD_MIN} minutes (or when you start it).` : ''}</span>
        </form>
      ) : (
        <div className="ms-row">
          <button type="button" className="ms-btn ms-btn--sm" disabled={busy} onClick={() => setEditing(true)}>Move it</button>
          {canNow && <button type="button" className="ms-btn ms-btn--sm" disabled={busy} onClick={startNow}>Start it now</button>}
          <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" disabled={busy} onClick={off}>Call it off</button>
        </div>
      ))}
      {mine && isOpen && n?.status === 'open' && !started && <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" style={{ justifySelf: 'start' }} disabled={busy} onClick={off}>Call it off</button>}
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
      {n?.standings?.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="ms-table ms-table--league" aria-label="League Night scoreboard">
            <thead>
              <tr>
                <th scope="col">Place</th>
                <th scope="col">Player</th>
                <th scope="col" className="num">Points</th>
                {n.race_list.map((r) => <th key={r.k} scope="col" className="num ms-league-wide ms-league-th" title={`Race ${r.k}: ${trackName(r.track_id)}`}><span>{trackName(r.track_id) || `Race ${r.k}`}</span></th>)}
                <th scope="col" className="num">Wins</th>
              </tr>
            </thead>
            <tbody>
              {n.standings.map((s) => (
                <tr key={s.user_id} className={s.user_id === userId ? 'is-me' : undefined}>
                  <td>{ordinal(s.place)}</td>
                  <td className="ms-league-player">{s.name}{s.user_id === userId ? ' (you)' : ''}</td>
                  <td className="num"><b>{s.points}</b></td>
                  {s.places.map((p, k) => <td key={k} className="num ms-league-wide">{p ? ordinal(p) : '—'}</td>)}
                  <td className="num">{s.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ms-note" style={{ margin: '8px 0 0' }}>{n.status === 'done' ? 'Final: ' : ''}10, 8, 6, 5, 4, 3, 2 and 1 points for the first eight of the league in each race. Same points: most race wins, then the better place in the last race.</p>
        </div>
      )}
      {n && !live && n.status === 'cancelled' && !n.standings?.length && <p className="ms-note" style={{ margin: 0 }}>The last League Night was called off.</p>}
    </section>
  );
}

/**
 * The league's name with a pencil for its creator (Moses, 27 Oct 2026): rename it in place. The same
 * filter as player names (client/src/shared/nameFilter.js; the server checks it again).
 */
function LeagueName({ code, name, onView }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { if (!editing) setText(name); }, [name, editing]);
  const tidy = text.trim().replace(/\s+/g, ' ');
  const problem = tidy.length < 2 || tidy.length > 40 ? 'A name of 2 to 40 characters.' : checkName(tidy) ? NAME_NOT_ALLOWED : null;
  const save = async (e) => {
    e.preventDefault();
    if (problem || tidy === name) { if (tidy === name) setEditing(false); return; }
    setBusy(true); setError(null);
    try { onView(await api.renameLeague(code, tidy)); setEditing(false); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  if (!editing) {
    return (
      <div className="ms-league-name">
        <h1 className="ms-h1" style={{ ...h1, overflowWrap: 'anywhere' }}>{name}</h1>
        <button type="button" className="ms-league-name__edit" aria-label="Rename the league" title="Rename the league" onClick={() => setEditing(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    );
  }
  return (
    <form className="ms-form ms-league-name__form" onSubmit={save}>
      <input aria-label="The league's name" value={text} maxLength={40} autoFocus onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }} />
      <div className="ms-row">
        <button type="submit" className="ms-btn ms-btn--sm ms-btn--primary" disabled={busy || Boolean(problem)}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" onClick={() => { setEditing(false); setError(null); }}>Cancel</button>
      </div>
      {(error || (problem && tidy !== name && tidy.length > 0)) && <span className="ms-note" role="alert" style={{ color: error ? 'var(--ms-red)' : undefined }}>{error ?? problem}</span>}
    </form>
  );
}
