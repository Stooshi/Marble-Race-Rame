import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { adminApi, getSession, setSession, whenExpired } from './adminApi';
import { ITEMS } from '../shared/marbles';
import './admin.css';

/**
 * The back office (/admin). Not linked from the site and kept out of search
 * engines (noindex). What it shows and does comes from the server's /api/admin,
 * which checks every request: an admin account, the 2-step login, and a session
 * used in the last 30 minutes. Closing the tab logs out.
 */
export default function AdminApp() {
  const [session, setS] = useState(getSession);
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const title = document.title;
    document.title = 'Marble Spins · back office';
    return () => { meta.remove(); document.title = title; };
  }, []);
  useEffect(() => {
    whenExpired(() => { setS(null); setNotice('Your session ended after 30 minutes without use. Log in again.'); navigate('/admin'); });
  }, [navigate]);
  const signedIn = (s) => { setSession(s); setS(s); setNotice(null); };
  const logout = async () => { await adminApi.end().catch(() => {}); setSession(null); setS(null); navigate('/admin'); };

  if (!session) return <Login onDone={signedIn} notice={notice} />;
  return (
    <div className="adm">
      <header className="adm-top">
        <b className="adm-brand">Marble Spins · back office</b>
        <nav className="adm-nav" aria-label="Back office">
          <NavLink to="/admin/players">Players</NavLink>
          <NavLink to="/admin/economy">Economy</NavLink>
          <NavLink to="/admin/emails">Email list</NavLink>
          <NavLink to="/admin/audit">Audit log</NavLink>
        </nav>
        <span className="adm-grow" />
        <span className="adm-muted">@{session.user?.username}</span>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={logout}>Log out</button>
      </header>
      <main className="adm-main">
        <Routes>
          <Route path="/admin" element={<Navigate to="/admin/players" replace />} />
          <Route path="/admin/players" element={<Players />} />
          <Route path="/admin/players/:id" element={<Player />} />
          <Route path="/admin/economy" element={<Economy />} />
          <Route path="/admin/emails" element={<Emails />} />
          <Route path="/admin/audit" element={<Audit />} />
          <Route path="*" element={<Navigate to="/admin/players" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ── Login: password, then the 2-step code ────────────────────────────────

function Login({ onDone, notice }) {
  const [step, setStep] = useState('password');
  const [f, setF] = useState({ login: '', password: '', code: '' });
  const [player, setPlayer] = useState(null);
  const [setup, setSetup] = useState(null);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const go = (fn) => async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const password = go(async () => {
    const { token, user } = await adminApi.login(f.login, f.password);
    if (user.role !== 'admin') throw new Error('This account has no back-office access.');
    const s = await adminApi.start(token);
    setPlayer({ token, user });
    if (s.setup) {
      setSetup(s.setup);
      setQr(await QRCode.toDataURL(s.setup.otpauth, { margin: 1, width: 200 }));
    }
    setStep('code');
  });
  const code = go(async () => {
    const r = await adminApi.verify(player.token, f.code);
    onDone({ token: r.token, user: r.user, idleMinutes: r.idleMinutes });
  });
  return (
    <div className="adm adm-login">
      <form className="adm-card" onSubmit={step === 'password' ? password : code}>
        <h1 className="adm-h1">Back office</h1>
        {notice && <p className="adm-msg">{notice}</p>}
        {step === 'password' ? (
          <>
            <label>Admin name or email<input autoComplete="username" value={f.login} onChange={set('login')} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={f.password} onChange={set('password')} required /></label>
          </>
        ) : (
          <>
            {setup ? (
              <div className="adm-setup">
                <p><b>Set up the 2-step login (once).</b> Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…), then type the 6-digit code it shows.</p>
                {qr && <img src={qr} alt="QR code for the authenticator app" width="200" height="200" />}
                <p className="adm-muted">Can't scan? Enter this key by hand: <code>{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</code></p>
              </div>
            ) : <p>Type the 6-digit code from your authenticator app.</p>}
            <label>Code<input inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={f.code} onChange={set('code')} required autoFocus /></label>
          </>
        )}
        {error && <p className="adm-msg adm-msg--bad" role="alert">{error}</p>}
        <button type="submit" className="adm-btn adm-btn--primary" disabled={busy}>{busy ? '…' : step === 'password' ? 'Next' : 'Log in'}</button>
        <p className="adm-muted">Sessions end after 30 minutes without use, and when you close this tab.</p>
      </form>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try { setState({ data: await fn(), error: null, loading: false }); } catch (error) { setState({ data: null, error, loading: false }); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

const n = (v) => (v === null || v === undefined ? '–' : Number(v).toLocaleString('en-US'));
const when = (t) => (t ? new Date(t).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '–');
const Err = ({ error }) => (error ? <p className="adm-msg adm-msg--bad">{error.message}</p> : null);

/** An action form: its fields, a required reason, and a confirm. */
function Action({ title, children, onSubmit, submit = 'Do it', danger = false }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const run = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 5) { setMsg({ bad: true, text: 'Write a reason (at least 5 characters): it goes in the audit log.' }); return; }
    setBusy(true); setMsg(null);
    try { const text = await onSubmit(reason.trim()); setMsg({ bad: false, text: text || 'Done.' }); setReason(''); } catch (err) { setMsg({ bad: true, text: err.message }); } finally { setBusy(false); }
  };
  return (
    <form className="adm-action" onSubmit={run}>
      <b>{title}</b>
      {children}
      <label>Reason (in the audit log)<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Support ticket 123: lost coins after a crash" maxLength={500} /></label>
      <button type="submit" className={`adm-btn ${danger ? 'adm-btn--danger' : 'adm-btn--primary'}`} disabled={busy}>{busy ? '…' : submit}</button>
      {msg && <p className={`adm-msg ${msg.bad ? 'adm-msg--bad' : ''}`}>{msg.text}</p>}
    </form>
  );
}

// ── Players ───────────────────────────────────────────────────────────────

function Players() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const list = useLoad(() => adminApi.players(query), [query]);
  return (
    <section className="adm-stack">
      <h1 className="adm-h1">Players</h1>
      <form className="adm-row" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
        <input className="adm-search" placeholder="Name, email, player id or Marble ID (SC105-000012)" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="adm-btn adm-btn--primary">Search</button>
      </form>
      <Err error={list.error} />
      <div className="adm-scroll">
        <table className="adm-table">
          <thead><tr><th>Player</th><th>Email</th><th>Kind</th><th>Age</th><th className="num">Coins</th><th className="num">Races</th><th>Last login</th><th>Joined</th></tr></thead>
          <tbody>
            {list.data?.players.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/admin/players/${p.id}`}>{p.display_name || p.username}</Link>{p.display_name ? <span className="adm-muted"> @{p.username}</span> : null}{p.suspended_at && <span className="adm-tag adm-tag--bad">suspended</span>}{p.role === 'admin' && <span className="adm-tag">admin</span>}</td>
                <td>{p.is_guest ? '–' : p.email}</td>
                <td>{p.is_guest ? 'guest' : 'saved'}</td>
                <td>{p.age_group ?? '–'}</td>
                <td className="num">{n(p.coins)}</td>
                <td className="num">{n(p.races)}</td>
                <td>{when(p.last_login_at)}</td>
                <td>{when(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.data && list.data.players.length === 0 && <p className="adm-muted">No players match.</p>}
    </section>
  );
}

const TABS = ['Coins', 'Races', 'Marbles', 'Payments', 'Security', 'Emails', 'Audit'];

function Player() {
  const { id } = useParams();
  const d = useLoad(() => adminApi.player(id), [id]);
  const [tab, setTab] = useState('Coins');
  const [amount, setAmount] = useState('');
  const [item, setItem] = useState('');
  const [itemAction, setItemAction] = useState('grant');
  const [name, setName] = useState('');
  const itemOptions = useMemo(() => ITEMS.map((i) => [i.slug, `${i.design.name} · ${i.shade.name} (${i.id})`]), []);
  if (d.error) return <Err error={d.error} />;
  if (!d.data) return <p className="adm-muted">Loading…</p>;
  const { player: p, coins, races, marbles, security, consents, payments, audit } = d.data;
  const after = (text) => async (fn) => { const r = await fn(); await d.reload(); return typeof text === 'function' ? text(r) : text; };
  return (
    <section className="adm-stack">
      <Link to="/admin/players" className="adm-muted">← Players</Link>
      <div className="adm-row adm-row--top">
        <div className="adm-stack" style={{ flex: '1 1 420px', minWidth: 0 }}>
          <h1 className="adm-h1">{p.display_name || p.username} {p.suspended_at && <span className="adm-tag adm-tag--bad">suspended {when(p.suspended_at)}</span>}</h1>
          <dl className="adm-facts">
            <div><dt>Player name</dt><dd>@{p.username}</dd></div>
            <div><dt>Email</dt><dd>{p.is_guest ? 'guest (no email)' : p.email}</dd></div>
            <div><dt>Age group</dt><dd>{p.age_group ?? 'not asked (older account)'}</dd></div>
            <div><dt>News by email</dt><dd>{p.marketing_opt_in ? 'yes' : 'no'}</dd></div>
            <div><dt>Coins</dt><dd>{n(p.coins)} <span className="adm-muted">(earned {n(p.coins_earned)}, bought {n(p.coins_bought)})</span></dd></div>
            <div><dt>Races</dt><dd>{n(races.recent.length)}{races.recent.length === 50 ? '+' : ''} <span className="adm-muted">({races.last24h} in the last 24 h)</span></dd></div>
            <div><dt>Skill · streak</dt><dd>{p.skill} · {p.streak_days} days</dd></div>
            <div><dt>Joined · last login</dt><dd>{when(p.created_at)} · {when(p.last_login_at)}</dd></div>
            <div><dt>Player id</dt><dd><code>{p.id}</code></dd></div>
          </dl>
        </div>
        <div className="adm-actions" style={{ flex: '0 1 340px' }}>
          <Action title="Coins: add or take" submit="Change coins" onSubmit={(reason) => after((r) => `New balance: ${n(r.balance)}`)(() => adminApi.coins(p.id, Number(amount), reason))}>
            <label>Amount (minus to take)<input type="number" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500 or -200" /></label>
          </Action>
          <Action title="Marble: give or take away" submit={itemAction === 'grant' ? 'Give marble' : 'Take marble'} onSubmit={(reason) => after(itemAction === 'grant' ? 'Given (a gift copy).' : 'Taken away.')(() => adminApi.item(p.id, item, itemAction, reason))}>
            <div className="adm-row">
              <select value={itemAction} onChange={(e) => setItemAction(e.target.value)}><option value="grant">Give</option><option value="remove">Take away</option></select>
              <select value={item} onChange={(e) => setItem(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
                <option value="">Pick a marble…</option>
                {itemOptions.map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
              </select>
            </div>
          </Action>
          <Action title="Shown name" submit="Change name" onSubmit={(reason) => after('Name changed.')(() => adminApi.name(p.id, name, reason))}>
            <label>New shown name (empty: their player name)<input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></label>
          </Action>
          {p.marketing_opt_in && <Action title="Stop news emails (the player asked)" submit="Stop emails" onSubmit={(reason) => after('Emails stopped.')(() => adminApi.consentOff(p.id, reason))} />}
          {p.role !== 'admin' && (
            <Action title={p.suspended_at ? 'Lift the suspension' : 'Suspend (no login, no racing)'} submit={p.suspended_at ? 'Lift suspension' : 'Suspend'} danger={!p.suspended_at}
              onSubmit={(reason) => after(p.suspended_at ? 'Suspension lifted.' : 'Suspended.')(() => adminApi.suspend(p.id, !p.suspended_at, reason))} />
          )}
        </div>
      </div>

      <div className="adm-tabs" role="tablist">
        {TABS.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'Coins' && (
        <div className="adm-stack">
          <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Kind</th><th className="num">Lines</th><th className="num">Coins</th></tr></thead>
            <tbody>{coins.byKind.map((k) => <tr key={k.kind}><td>{k.kind}</td><td className="num">{n(k.lines)}</td><td className="num">{n(k.coins)}</td></tr>)}</tbody></table></div>
          <div className="adm-scroll"><table className="adm-table"><thead><tr><th>When</th><th>Kind</th><th className="num">Coins</th><th className="num">Balance after</th><th>Note</th></tr></thead>
            <tbody>{coins.ledger.map((l) => <tr key={l.id}><td>{when(l.created_at)}</td><td>{l.kind}</td><td className={`num ${l.amount < 0 ? 'adm-neg' : ''}`}>{n(l.amount)}</td><td className="num">{n(l.balance_after)}</td><td>{l.note ?? l.item_slug ?? ''}</td></tr>)}</tbody></table></div>
        </div>
      )}
      {tab === 'Races' && (
        <div className="adm-scroll"><table className="adm-table"><thead><tr><th>When</th><th>Track</th><th className="num">Place</th><th className="num">Coins</th><th>Kind</th></tr></thead>
          <tbody>{races.recent.map((r) => <tr key={r.id}><td>{when(r.finished_at)}</td><td>{r.track}</td><td className="num">{r.finish_position ?? r.status}</td><td className="num">{n(r.coins_awarded)}</td><td>{r.room ? 'friend room' : 'public'}</td></tr>)}</tbody></table></div>
      )}
      {tab === 'Marbles' && (
        <div className="adm-stack">
          <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Marble</th><th>Marble ID</th><th>How</th><th className="num">Paid</th><th>When</th></tr></thead>
            <tbody>{marbles.collection.map((c) => <tr key={c.marble_code}><td>{c.item_slug}</td><td><code>{c.marble_code}</code></td><td>{c.source}</td><td className="num">{n(c.price_paid)}</td><td>{when(c.acquired_at)}</td></tr>)}</tbody></table></div>
          <p className="adm-muted">Plain marbles: {marbles.plain.map((m) => m.name).join(', ')}</p>
        </div>
      )}
      {tab === 'Payments' && (
        <div className="adm-scroll"><table className="adm-table"><thead><tr><th>When</th><th>Pack</th><th>Provider</th><th className="num">Coins</th><th className="num">Amount</th><th>Status</th></tr></thead>
          <tbody>{payments.map((x) => <tr key={x.id}><td>{when(x.created_at)}</td><td>{x.product_id}</td><td>{x.provider}</td><td className="num">{n(x.coins)}</td><td className="num">{(x.amount_cents / 100).toFixed(2)} {x.currency}</td><td>{x.status}</td></tr>)}</tbody></table>
          {payments.length === 0 && <p className="adm-muted">No coin packs bought.</p>}</div>
      )}
      {tab === 'Security' && (
        <div className="adm-stack">
          <p className="adm-muted">IP addresses are kept {security.ipDays} days for security and fraud checks; after that only the country.</p>
          <div className="adm-scroll"><table className="adm-table"><thead><tr><th>When</th><th>What</th><th>IP</th><th>Country</th></tr></thead>
            <tbody>{security.events.map((e, i) => <tr key={i}><td>{when(e.created_at)}</td><td>{e.kind}</td><td>{e.ip ?? <span className="adm-muted">(removed)</span>}</td><td>{e.country ?? '–'}</td></tr>)}</tbody></table></div>
          <b>Other accounts from the same addresses</b>
          {security.sameAddress.length === 0 ? <p className="adm-muted">None.</p> : (
            <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Player</th><th>Kind</th><th>Joined</th><th className="num">Shared events</th></tr></thead>
              <tbody>{security.sameAddress.map((u) => <tr key={u.id}><td><Link to={`/admin/players/${u.id}`}>@{u.username}</Link></td><td>{u.is_guest ? 'guest' : 'saved'}</td><td>{when(u.created_at)}</td><td className="num">{u.shared}</td></tr>)}</tbody></table></div>
          )}
        </div>
      )}
      {tab === 'Emails' && (
        <div className="adm-scroll"><table className="adm-table"><thead><tr><th>When</th><th>Answer</th><th>Where</th></tr></thead>
          <tbody>{consents.map((c, i) => <tr key={i}><td>{when(c.created_at)}</td><td>{c.consent ? 'yes' : 'no'}</td><td>{c.source}</td></tr>)}</tbody></table>
          {consents.length === 0 && <p className="adm-muted">Never asked (an older account or a guest).</p>}</div>
      )}
      {tab === 'Audit' && <AuditTable rows={audit} showPlayer={false} />}
    </section>
  );
}

// ── Economy ───────────────────────────────────────────────────────────────

function Bars({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.earned, r.bought, r.spent]));
  const w = 760; const h = 180; const bw = w / Math.max(1, rows.length);
  const y = (v) => h - (v / max) * (h - 10);
  return (
    <div className="adm-scroll">
      <svg viewBox={`0 0 ${w} ${h + 22}`} className="adm-chart" role="img" aria-label="Coins earned, bought and spent per day">
        {rows.map((r, i) => {
          const x = i * bw;
          const third = Math.max(1, bw / 3 - 1);
          return (
            <g key={r.day}>
              <rect x={x} y={y(r.earned)} width={third} height={h - y(r.earned)} className="adm-bar-earned"><title>{`${r.day}: earned ${n(r.earned)}`}</title></rect>
              <rect x={x + third} y={y(r.bought)} width={third} height={h - y(r.bought)} className="adm-bar-bought"><title>{`${r.day}: bought ${n(r.bought)}`}</title></rect>
              <rect x={x + 2 * third} y={y(r.spent)} width={third} height={h - y(r.spent)} className="adm-bar-spent"><title>{`${r.day}: spent ${n(r.spent)}`}</title></rect>
              {(i % Math.ceil(rows.length / 8) === 0) && <text x={x} y={h + 16} className="adm-axis">{String(r.day).slice(5, 10)}</text>}
            </g>
          );
        })}
      </svg>
      <div className="adm-legend"><span className="adm-key adm-bar-earned" />earned racing <span className="adm-key adm-bar-bought" />bought <span className="adm-key adm-bar-spent" />spent in the shop</div>
    </div>
  );
}

function Economy() {
  const [days, setDays] = useState(30);
  const d = useLoad(() => adminApi.economy(days), [days]);
  if (d.error) return <Err error={d.error} />;
  const e = d.data;
  const sum = (k) => (e ? e.daily.reduce((s, r) => s + Number(r[k] || 0), 0) : 0);
  return (
    <section className="adm-stack">
      <div className="adm-row"><h1 className="adm-h1">Economy</h1><span className="adm-grow" />
        <select value={days} onChange={(ev) => setDays(Number(ev.target.value))}>{[7, 30, 90, 365].map((v) => <option key={v} value={v}>Last {v} days</option>)}</select>
      </div>
      {!e ? <p className="adm-muted">Loading…</p> : (
        <>
          <div className="adm-tiles">
            <div><span>Coins in players' bags</span><b>{n(e.totals.in_circulation)}</b></div>
            <div><span>Earned racing ({days} d)</span><b>{n(sum('earned'))}</b></div>
            <div><span>Bought ({days} d)</span><b>{n(sum('bought'))}</b></div>
            <div><span>Spent in the shop ({days} d)</span><b>{n(sum('spent'))}</b></div>
            <div><span>Given by support ({days} d)</span><b>{n(sum('support'))}</b></div>
            <div><span>Races ({days} d)</span><b>{n(sum('races'))}</b></div>
            <div><span>Accounts</span><b>{n(e.players.accounts)}</b><small>{n(e.players.saved)} saved · {n(e.players.guests)} guests</small></div>
            <div><span>Age groups</span><b>{n(e.players.adults)}</b><small>18+ · {n(e.players.age_13_17)} 13–17 · {n(e.players.under_13)} under 13</small></div>
            <div><span>News by email</span><b>{n(e.players.email_ok)}</b><small>{n(e.players.suspended)} suspended accounts</small></div>
          </div>
          <Bars rows={e.daily} />
          <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Day</th><th className="num">Players</th><th className="num">New accounts</th><th className="num">Races</th><th className="num">Earned</th><th className="num">Bought</th><th className="num">Spent</th><th className="num">Support</th></tr></thead>
            <tbody>{[...e.daily].reverse().map((r) => <tr key={r.day}><td>{String(r.day).slice(0, 10)}</td><td className="num">{n(r.players)}</td><td className="num">{n(r.new_accounts)}</td><td className="num">{n(r.races)}</td><td className="num">{n(r.earned)}</td><td className="num">{n(r.bought)}</td><td className="num">{n(r.spent)}</td><td className="num">{n(r.support)}</td></tr>)}</tbody></table></div>
          <div className="adm-row adm-row--top">
            <div className="adm-stack" style={{ flex: '1 1 380px', minWidth: 0 }}>
              <b>Marbles sold ({days} d)</b>
              <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Marble</th><th>Rarity</th><th className="num">Copies</th><th className="num">Coins</th></tr></thead>
                <tbody>{e.sales.map((s) => <tr key={s.item_slug}><td>{s.name}</td><td>{s.rarity ?? '–'}</td><td className="num">{n(s.copies)}</td><td className="num">{n(s.coins)}</td></tr>)}</tbody></table>
                {e.sales.length === 0 && <p className="adm-muted">None.</p>}</div>
              <b>Coin packs paid ({days} d)</b>
              <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Pack</th><th>Provider</th><th className="num">Paid</th><th className="num">Amount</th></tr></thead>
                <tbody>{e.coinPacks.map((p) => <tr key={`${p.product_id}${p.provider}${p.currency}`}><td>{p.product_id}</td><td>{p.provider}</td><td className="num">{n(p.paid)}</td><td className="num">{(p.cents / 100).toFixed(2)} {p.currency}</td></tr>)}</tbody></table>
                {e.coinPacks.length === 0 && <p className="adm-muted">None yet (payments are switched off).</p>}</div>
            </div>
            <div className="adm-stack" style={{ flex: '1 1 320px', minWidth: 0 }}>
              <b>Possible coin farming (last 7 days)</b>
              <p className="adm-muted">One address with 3 or more accounts. Check before acting: a family or a school shares one address.</p>
              <div className="adm-scroll"><table className="adm-table"><thead><tr><th>IP</th><th>Country</th><th className="num">Accounts</th><th>Last seen</th></tr></thead>
                <tbody>{e.possibleFarming.map((f) => <tr key={f.ip}><td><code>{f.ip}</code></td><td>{f.country ?? '–'}</td><td className="num">{f.accounts}</td><td>{when(f.last_seen)}</td></tr>)}</tbody></table>
                {e.possibleFarming.length === 0 && <p className="adm-muted">None.</p>}</div>
              <b>Top earners (last 7 days)</b>
              <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Player</th><th className="num">Earned</th></tr></thead>
                <tbody>{e.topEarners7d.map((t) => <tr key={t.id}><td><Link to={`/admin/players/${t.id}`}>@{t.username}</Link>{t.is_guest ? <span className="adm-muted"> (guest)</span> : null}</td><td className="num">{n(t.earned)}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// ── Email list, audit log ─────────────────────────────────────────────────

function Emails() {
  const d = useLoad(() => adminApi.consents(), []);
  const exportCsv = async (reason) => {
    const res = await adminApi.consentsCsv(reason);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-consents-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'Downloaded. The export is in the audit log.';
  };
  return (
    <section className="adm-stack">
      <h1 className="adm-h1">Email list</h1>
      <p className="adm-muted">Saved players who said yes to news by email (not suspended, not under 13). Each player can say no at any time; send only to this list.</p>
      <Err error={d.error} />
      {d.data && <p><b>{n(d.data.count)}</b> players.</p>}
      <div style={{ maxWidth: 420 }}><Action title="Export the list (CSV)" submit="Export" onSubmit={exportCsv} /></div>
      {d.data && (
        <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Email</th><th>Player</th><th>Age</th><th>Since</th></tr></thead>
          <tbody>{d.data.players.map((p) => <tr key={p.email}><td>{p.email}</td><td>@{p.username}</td><td>{p.age_group ?? '–'}</td><td>{when(p.since)}</td></tr>)}</tbody></table></div>
      )}
    </section>
  );
}

function AuditTable({ rows, showPlayer = true }) {
  if (!rows.length) return <p className="adm-muted">Nothing yet.</p>;
  return (
    <div className="adm-scroll"><table className="adm-table"><thead><tr><th>When</th><th>Admin</th><th>Action</th>{showPlayer && <th>Player</th>}<th>Reason</th><th>Details</th></tr></thead>
      <tbody>{rows.map((a) => (
        <tr key={a.id}><td>{when(a.created_at)}</td><td>@{a.admin ?? '–'}</td><td>{a.action}</td>
          {showPlayer && <td>{a.player_id ? <Link to={`/admin/players/${a.player_id}`}>@{a.player}</Link> : '–'}</td>}
          <td>{a.reason}</td><td><code className="adm-details">{Object.keys(a.details ?? {}).length ? JSON.stringify(a.details) : ''}</code></td></tr>
      ))}</tbody></table></div>
  );
}

function Audit() {
  const d = useLoad(() => adminApi.audit(), []);
  return (
    <section className="adm-stack">
      <h1 className="adm-h1">Audit log</h1>
      <p className="adm-muted">Every back-office action, with who did it and why. It can't be edited.</p>
      <Err error={d.error} />
      {d.data && <AuditTable rows={d.data.entries} />}
    </section>
  );
}
