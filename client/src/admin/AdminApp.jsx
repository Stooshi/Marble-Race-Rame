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
          <NavLink to="/admin/payments">Payments</NavLink>
          <NavLink to="/admin/support">Support messages</NavLink>
          <NavLink to="/admin/name-reports">Name reports</NavLink>
          <NavLink to="/admin/gift-codes">Gift codes</NavLink>
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
          <Route path="/admin/payments" element={<Payments />} />
          <Route path="/admin/support" element={<SupportInbox />} />
          <Route path="/admin/support/:id" element={<SupportMessage />} />
          <Route path="/admin/name-reports" element={<NameReports />} />
          <Route path="/admin/gift-codes" element={<GiftCodes />} />
          <Route path="/admin/gift-codes/:id" element={<GiftCode />} />
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

// ── Payments ──────────────────────────────────────────────────────────────

/** An amount in its currency ("10.99 EUR"); `cents` are the currency's smallest unit. */
const digitsOf = (cur) => { try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur }).resolvedOptions().maximumFractionDigits; } catch { return 2; } };
const money = (cents, cur) => (cents == null || !cur ? '–' : `${(cents / 10 ** digitsOf(cur)).toFixed(digitsOf(cur))} ${cur.toUpperCase()}`);

/** Coin-pack orders, each with a refund action (Stripe refunds the money; the coins go when Stripe confirms). */
function PaymentTable({ rows, showPlayer = false, onChanged }) {
  const [open, setOpen] = useState(null);
  const [amount, setAmount] = useState('');
  const pay = rows.find((x) => x.id === open);
  const cur = pay ? (pay.charged_currency ?? pay.currency) : null;
  const left = pay ? (pay.charged_cents ?? pay.amount_cents) - pay.refunded_cents : 0;
  return (
    <div className="adm-stack">
      <div className="adm-scroll"><table className="adm-table">
        <thead><tr><th>Order</th><th>When</th>{showPlayer && <th>Player</th>}<th>Provider</th><th className="num">Coins</th><th className="num">Charged (incl. VAT)</th><th className="num">VAT</th><th className="num">Refunded</th><th>Status</th><th>Receipt</th><th /></tr></thead>
        <tbody>{rows.map((x) => (
          <tr key={x.id}>
            <td><b>{x.order_no ?? '–'}</b></td>
            <td>{when(x.paid_at ?? x.created_at)}</td>
            {showPlayer && <td><Link to={`/admin/players/${x.player_id}`}>@{x.player}</Link></td>}
            <td>{x.provider}</td>
            <td className="num">{n(x.coins)}</td>
            <td className="num">{x.charged_cents != null ? money(x.charged_cents, x.charged_currency) : money(x.amount_cents, x.currency)}</td>
            <td className="num">{x.tax_cents != null ? money(x.tax_cents, x.charged_currency) : '–'}</td>
            <td className="num">{x.refunded_cents ? money(x.refunded_cents, x.charged_currency ?? x.currency) : '–'}{x.coins_short > 0 && <span className="adm-tag adm-tag--bad" title="Coins already spent when refunded">{n(x.coins_short)} short</span>}</td>
            <td>{x.status === 'paid' && x.refunded_cents > 0 ? 'part-refunded' : x.status}</td>
            <td>{x.receipt_url ? <a href={x.receipt_url} target="_blank" rel="noreferrer">receipt</a> : '–'}</td>
            <td>{x.status === 'paid' && (x.provider === 'stripe' || x.provider === 'test' || x.provider === 'google') && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setOpen(open === x.id ? null : x.id); setAmount(''); }}>{open === x.id ? 'Close' : 'Refund'}</button>}</td>
          </tr>
        ))}</tbody>
      </table></div>
      {rows.length === 0 && <p className="adm-muted">No coin packs bought.</p>}
      {pay && (
        <Action key={pay.id} title={`Refund ${pay.order_no}`} submit="Refund" danger
          onSubmit={async (reason) => {
            const cents = amount.trim() ? Math.round(Number(amount) * 10 ** digitsOf(cur)) : undefined;
            const r = await adminApi.refund(pay.id, reason, cents);
            await onChanged?.();
            if (pay.provider === 'google') return 'Google Play is refunding the order. The coins are removed when Google lists it as refunded (usually within minutes, at the latest at the next 6-hourly check); reload to see.';
            return r.waiting ? `Stripe refund ${r.refund.status}. The coins are removed when Stripe confirms it (usually seconds); reload to see.` : `Refunded: ${n(r.removed)} coins removed${r.short ? `, ${n(r.short)} already spent` : ''}.`;
          }}>
          {pay.provider === 'google'
            ? <p className="adm-muted">Google Play refunds the whole order ({pay.order_no}, Google order {pay.provider_ref ?? '–'}) and takes the item back. The coins are then removed (only as many as the player still has) and logged in the coin ledger and the audit log. Google emails the player.</p>
            : <>
              <label>Amount in {cur} (empty = all that's left: {money(left, cur)})<input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <p className="adm-muted">The coins from the refunded share are removed (only as many as the player still has) and logged in the coin ledger and the audit log. Stripe emails the player a refund receipt.</p>
            </>}
        </Action>
      )}
    </div>
  );
}

function Payments() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const list = useLoad(() => adminApi.payments(query), [query]);
  return (
    <section className="adm-stack">
      <h1 className="adm-h1">Payments</h1>
      <form className="adm-row" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
        <input className="adm-search" placeholder="Order number (MS-1001), player name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="adm-btn adm-btn--primary">Search</button>
      </form>
      <Err error={list.error} />
      {list.data && <PaymentTable rows={list.data.payments} showPlayer onChanged={list.reload} />}
    </section>
  );
}

// ── Name reports ──────────────────────────────────────────────────────────

/** One player's reported or flagged name: rename (to PlayerNNNN) or dismiss, with a reason. */
function NameAction({ row, onDone, flagged = false }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const go = async (action) => {
    setBusy(true); setError(null);
    try { await adminApi.resolveName(row.player_id, action, reason.trim()); await onDone(); } catch (err) { setError(err); } finally { setBusy(false); }
  };
  return (
    <div className="adm-row" style={{ gap: 6 }}>
      <input placeholder="Reason (audit log)" value={reason} onChange={(e) => setReason(e.target.value)} style={{ minWidth: 180 }} />
      <button type="button" className="adm-btn adm-btn--danger" disabled={busy || reason.trim().length < 5} onClick={() => go('rename')}>{row.is_guest ? 'Clear the name' : 'Rename'}</button>
      {!flagged && row.hidden && <button type="button" className="adm-btn" disabled={busy || reason.trim().length < 5} onClick={() => go('keep-hidden')}>Keep hidden</button>}
      {!flagged && <button type="button" className="adm-btn" disabled={busy || reason.trim().length < 5} onClick={() => go('restore')}>{row.hidden ? 'Restore the name' : 'Dismiss'}</button>}
      <Err error={error} />
    </div>
  );
}

function NameReports() {
  const list = useLoad(() => adminApi.nameReports(), []);
  const d = list.data;
  const shown = (r) => (r.display_name ? <>{r.display_name} <span className="adm-muted">@{r.username}</span></> : <>@{r.username}</>);
  return (
    <section className="adm-stack">
      <h1 className="adm-h1">Name reports</h1>
      <p className="adm-muted">Players report names from the scoreboards, race results and rooms. A name reported by 3 different players (on 3 different connections) is <b>hidden</b> at once: other players see guest_12345 or Player_12345, and the player is asked to choose a new name. Hidden names are listed first. <b>Restore the name</b> brings it back and dismisses the reports (3 new reports hide it again); <b>Keep hidden</b> closes the reports and leaves it hidden until the player chooses a new name; <b>Rename</b> gives the account a neutral name (PlayerNNNN) and clears its shown name (a guest's shown name is cleared). <b>Dismiss</b> closes the reports and keeps the name. New names are already checked by the filter (client/src/shared/nameFilter.js); add words there.</p>
      <Err error={list.error} />
      {d && (
        <>
          <h2 className="adm-h1" style={{ fontSize: 18 }}>Open reports ({d.open.length})</h2>
          {d.open.length === 0 ? <p className="adm-muted">None.</p> : (
            <div className="adm-scroll"><table className="adm-table">
              <thead><tr><th>Player</th><th>Reported name</th><th className="num">Reporters</th><th>Where</th><th>Last report</th><th>Action</th></tr></thead>
              <tbody>{d.open.map((r) => (
                <tr key={r.player_id}><td><Link to={`/admin/players/${r.player_id}`}>{shown(r)}</Link>{r.is_guest && <span className="adm-tag">guest</span>}{r.hidden && <span className="adm-tag adm-tag--warn">hidden {when(r.hidden_at)}</span>}{r.changed && <span className="adm-tag">new name chosen</span>}</td>
                  <td>{r.hidden_name ?? r.names_shown.join(', ')}</td><td className="num">{n(r.reporters)}{r.addresses < r.reporters && <span className="adm-muted"> ({n(r.addresses)} connections)</span>}</td><td>{r.places.join(', ')}</td><td>{when(r.last_at)}</td><td><NameAction row={r} onDone={list.reload} /></td></tr>
              ))}</tbody>
            </table></div>
          )}
          <h2 className="adm-h1" style={{ fontSize: 18 }}>Names the filter would block ({d.flagged.length})</h2>
          <p className="adm-muted">Names chosen before the filter (or set by an admin) that it would refuse today.</p>
          {d.flagged.length === 0 ? <p className="adm-muted">None.</p> : (
            <div className="adm-scroll"><table className="adm-table">
              <thead><tr><th>Player</th><th>Matched</th><th>Action</th></tr></thead>
              <tbody>{d.flagged.map((r) => (
                <tr key={r.player_id}><td><Link to={`/admin/players/${r.player_id}`}>{shown(r)}</Link></td><td>{r.word} <span className="adm-muted">({r.lang})</span></td><td><NameAction row={r} onDone={list.reload} flagged /></td></tr>
              ))}</tbody>
            </table></div>
          )}
          {d.resolved.length > 0 && (
            <>
              <h2 className="adm-h1" style={{ fontSize: 18 }}>Resolved, last 30 days</h2>
              <div className="adm-scroll"><table className="adm-table">
                <thead><tr><th>Player (now)</th><th>Outcome</th><th className="num">Reports</th><th>When</th></tr></thead>
                <tbody>{d.resolved.map((r) => <tr key={r.player_id + r.resolution}><td><Link to={`/admin/players/${r.player_id}`}>@{r.username}</Link></td><td>{r.resolution}</td><td className="num">{n(r.reports)}</td><td>{when(r.resolved_at)}</td></tr>)}</tbody>
              </table></div>
            </>
          )}
        </>
      )}
    </section>
  );
}

// ── Gift codes ────────────────────────────────────────────────────────────

const CODE_STATE = { active: 'Active', expired: 'Expired', 'used-up': 'Used up', disabled: 'Switched off' };
const giftWhat = (c) => (c.kind === 'coins' ? `${n(c.coins)} coins` : `${c.season_name ?? c.season_key} pass`);
const inDays = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

/** The codes just made, to copy or download (a CSV for a batch). */
function MadeCodes({ codes, onClose }) {
  const text = codes.map((c) => c.code).join('\n');
  const csv = () => {
    const rows = [['code', 'gives', 'uses', 'expires', 'tag'], ...codes.map((c) => [c.code, giftWhat(c), c.max_uses, c.expires_at, c.tag])];
    const blob = new Blob([rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `gift-codes-${codes[0].tag}-${codes[0].created_at.slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="adm-action">
      <b>{codes.length === 1 ? 'Code made' : `${codes.length} codes made`}: {giftWhat(codes[0])}, tag “{codes[0].tag}”</b>
      <textarea readOnly rows={Math.min(10, codes.length)} value={text} style={{ fontFamily: 'monospace', fontSize: '1.05rem' }} onFocus={(e) => e.target.select()} />
      <div className="adm-row">
        <button type="button" className="adm-btn" onClick={() => navigator.clipboard?.writeText(text).catch(() => {})}>Copy</button>
        <button type="button" className="adm-btn" onClick={csv}>Download CSV</button>
        <button type="button" className="adm-btn" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function MakeCodes({ seasons, onMade }) {
  const [f, setF] = useState({ kind: 'coins', coins: 5000, season_key: '', uses: 'single', max_uses: 100, count: 1, expires: inDays(30), tag: '', code: '', note: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const single = f.uses === 'single';
      const r = await adminApi.makeGiftCodes({
        kind: f.kind,
        ...(f.kind === 'coins' ? { coins: Number(f.coins) } : { season_key: f.season_key || seasons[0]?.key }),
        max_uses: single ? 1 : Number(f.max_uses),
        ...(single && Number(f.count) > 1 ? { count: Number(f.count) } : {}),
        ...(!single || Number(f.count) === 1 ? (f.code.trim() ? { code: f.code.trim() } : {}) : {}),
        // (The end of the chosen day, Swedish time.)
        expires_at: `${f.expires}T23:59:59+01:00`,
        tag: f.tag.trim(), note: f.note.trim() || undefined, reason: f.reason.trim(),
      });
      onMade(r.codes);
      setF((x) => ({ ...x, code: '', reason: '' }));
    } catch (err) { setError(err); } finally { setBusy(false); }
  };
  const batch = f.uses === 'single' && Number(f.count) > 1;
  return (
    <form className="adm-action" onSubmit={submit}>
      <b>Make codes</b>
      <div className="adm-row">
        <label>Gives <select value={f.kind} onChange={set('kind')}><option value="coins">Coins</option><option value="pass" disabled={!seasons.length}>A season pass</option></select></label>
        {f.kind === 'coins'
          ? <label>Coins <input type="number" min={1} max={100000} value={f.coins} onChange={set('coins')} required style={{ width: 110 }} /></label>
          : <label>Season <select value={f.season_key || seasons[0]?.key} onChange={set('season_key')}>{seasons.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></label>}
      </div>
      <div className="adm-row">
        <label>Uses <select value={f.uses} onChange={set('uses')}><option value="single">Single-use</option><option value="multi">Multi-use, up to</option></select></label>
        {f.uses === 'multi'
          ? <label>Limit <input type="number" min={2} max={100000} value={f.max_uses} onChange={set('max_uses')} required style={{ width: 110 }} /></label>
          : <label>How many codes <input type="number" min={1} max={500} value={f.count} onChange={set('count')} required style={{ width: 90 }} /></label>}
        <label>Expires (end of day) <input type="date" value={f.expires} min={inDays(0)} onChange={set('expires')} required /></label>
      </div>
      <div className="adm-row">
        <label style={{ flex: 1 }}>Creator or campaign (tag) <input value={f.tag} onChange={set('tag')} required minLength={2} maxLength={64} placeholder="e.g. creator-marblejoe or launch-giveaway" /></label>
        {!batch && <label>Own code (optional) <input value={f.code} onChange={(e) => setF((x) => ({ ...x, code: e.target.value.toUpperCase() }))} maxLength={24} placeholder="e.g. MARBLEJOE" /></label>}
      </div>
      <label>Note (optional) <input value={f.note} onChange={set('note')} maxLength={500} placeholder="What it's for, who it went to" /></label>
      <label>Reason (for the audit log) <input value={f.reason} onChange={set('reason')} required minLength={5} maxLength={500} /></label>
      <Err error={error} />
      <div className="adm-row"><button type="submit" className="adm-btn adm-btn--primary" disabled={busy}>{busy ? 'Making…' : batch ? `Make ${f.count} codes` : 'Make code'}</button>
        <span className="adm-muted">Single-use codes are 12 random letters and digits; an own code is for a multi-use creator code. Each account can use a code once.</span></div>
    </form>
  );
}

function GiftCodes() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState({ q: '', tag: '' });
  const [made, setMade] = useState(null);
  const list = useLoad(() => adminApi.giftCodes(filter), [filter.q, filter.tag]);
  const d = list.data;
  return (
    <section className="adm-stack">
      <h1 className="adm-h1">Gift codes</h1>
      {d && !d.enabled && <p className="adm-msg">Redeeming is <b>switched off</b> for players (client/src/shared/giftCodes.json). Codes made now work once it is switched on.</p>}
      <Err error={list.error} />
      {made ? <MadeCodes codes={made} onClose={() => setMade(null)} /> : d && <MakeCodes seasons={d.seasons} onMade={(c) => { setMade(c); list.reload(); }} />}
      {d?.tags.length > 0 && (
        <div className="adm-scroll"><table className="adm-table">
          <thead><tr><th>Creator or campaign</th><th className="num">Codes</th><th className="num">Redeemed</th><th className="num">Coins given</th><th className="num">Passes given</th><th>Last made</th></tr></thead>
          <tbody>{d.tags.map((t) => (
            <tr key={t.tag}><td><button type="button" className="adm-btn adm-btn--ghost" onClick={() => setFilter({ q: '', tag: t.tag })}>{t.tag}</button></td><td className="num">{n(t.codes)}</td><td className="num">{n(t.redemptions)}</td><td className="num">{n(t.coins_given)}</td><td className="num">{n(t.passes_given)}</td><td>{when(t.last_made)}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      <form className="adm-row" onSubmit={(e) => { e.preventDefault(); setFilter({ q: q.trim(), tag: '' }); }}>
        <input className="adm-search" placeholder="A code, or words from its tag or note" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="adm-btn adm-btn--primary">Search</button>
        {(filter.tag || filter.q) && <button type="button" className="adm-btn" onClick={() => { setQ(''); setFilter({ q: '', tag: '' }); }}>Show all{filter.tag ? ` (now: ${filter.tag})` : ''}</button>}
      </form>
      {d && (d.codes.length === 0 ? <p className="adm-muted">No codes.</p> : (
        <div className="adm-scroll"><table className="adm-table">
          <thead><tr><th>Code</th><th>Gives</th><th className="num">Used</th><th>Expires</th><th>Tag</th><th>State</th><th>Made</th></tr></thead>
          <tbody>{d.codes.map((c) => (
            <tr key={c.id}><td><Link to={`/admin/gift-codes/${c.id}`}><b style={{ fontFamily: 'monospace' }}>{c.code}</b></Link></td><td>{giftWhat(c)}</td><td className="num">{n(c.uses)} / {n(c.max_uses)}</td><td>{when(c.expires_at)}</td><td>{c.tag}</td><td>{CODE_STATE[c.state]}</td><td>{when(c.created_at)} <span className="adm-muted">{c.created_by_name ?? ''}</span></td></tr>
          ))}</tbody>
        </table></div>
      ))}
    </section>
  );
}

function GiftCode() {
  const { id } = useParams();
  const one = useLoad(() => adminApi.giftCode(id), [id]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const off = async (e) => {
    e.preventDefault();
    setError(null);
    try { await adminApi.disableGiftCode(id, reason.trim()); setReason(''); one.reload(); } catch (err) { setError(err); }
  };
  const c = one.data?.code;
  return (
    <section className="adm-stack">
      <Link to="/admin/gift-codes" className="adm-muted">← Gift codes</Link>
      <Err error={one.error} />
      {c && (
        <>
          <h1 className="adm-h1" style={{ fontFamily: 'monospace' }}>{c.code}</h1>
          <dl className="adm-facts">
            <div><dt>Gives</dt><dd>{giftWhat(c)}</dd></div>
            <div><dt>Used</dt><dd>{n(c.uses)} of {n(c.max_uses)} · {CODE_STATE[c.state]}</dd></div>
            <div><dt>Expires</dt><dd>{when(c.expires_at)}</dd></div>
            <div><dt>Tag</dt><dd>{c.tag}</dd></div>
            {c.note && <div><dt>Note</dt><dd>{c.note}</dd></div>}
            <div><dt>Made</dt><dd>{when(c.created_at)} by {c.created_by_name ?? '–'}{c.batch_id ? ' (in a batch)' : ''}</dd></div>
            {c.disabled_at && <div><dt>Switched off</dt><dd>{when(c.disabled_at)}</dd></div>}
          </dl>
          {!c.disabled_at && (
            <form className="adm-row" onSubmit={off}>
              <input className="adm-search" placeholder="Reason for switching it off" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={5} />
              <button type="submit" className="adm-btn adm-btn--danger">Switch off</button>
              <span className="adm-muted">No more redemptions; what was redeemed stays.</span>
            </form>
          )}
          <Err error={error} />
          <h2 className="adm-h1" style={{ fontSize: 18 }}>Redeemed by</h2>
          {one.data.redemptions.length === 0 ? <p className="adm-muted">Nobody yet.</p> : (
            <div className="adm-scroll"><table className="adm-table">
              <thead><tr><th>When</th><th>Player</th><th>Got</th></tr></thead>
              <tbody>{one.data.redemptions.map((r) => (
                <tr key={r.player_id + r.redeemed_at}><td>{when(r.redeemed_at)}</td><td><Link to={`/admin/players/${r.player_id}`}>@{r.player}</Link></td><td>{r.coins ? `${n(r.coins)} coins` : `pass${r.pass_revoked_at ? ' (since taken back)' : ''}`}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </>
      )}
    </section>
  );
}

// ── Support messages ──────────────────────────────────────────────────────

const STATUS_LABEL = { new: 'New', open: 'Open', done: 'Done' };
const StatusTag = ({ status }) => <span className={`adm-status adm-status--${status}`}>{STATUS_LABEL[status] ?? status}</span>;
const LinkedBy = ({ m }) => (m.player_id
  ? <><Link to={`/admin/players/${m.player_id}`}>@{m.player}</Link>{m.player_guest && <span className="adm-tag">guest</span>}{m.linked_by === 'email' && <span className="adm-tag adm-tag--warn" title="Not logged in: matched on the email they typed, which they may not own">by email</span>}</>
  : <span className="adm-muted">no account</span>);

/** Messages in a table; the status can be changed in place (logged in the audit log). */
function SupportTable({ rows, showPlayer = true, onChanged }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const change = async (m, status) => {
    setBusy(m.id); setError(null);
    try { await adminApi.supportStatus(m.id, status); await onChanged?.(); } catch (err) { setError(err); } finally { setBusy(null); }
  };
  if (!rows.length) return <p className="adm-muted">No messages.</p>;
  return (
    <div className="adm-stack">
      <Err error={error} />
      <div className="adm-scroll"><table className="adm-table adm-table--support">
        <thead><tr><th>Ref</th><th>Received</th><th>From</th>{showPlayer && <th>Player</th>}<th>Category</th><th>Order</th><th>Message</th><th className="num">Replies</th><th>Status</th></tr></thead>
        <tbody>{rows.map((m) => (
          <tr key={m.id} className={m.status === 'new' ? 'adm-row-new' : undefined}>
            <td><Link to={`/admin/support/${m.id}`}><b>{m.ref}</b></Link></td>
            <td>{when(m.created_at)}</td>
            <td>{m.name}<div className="adm-muted">{m.email}</div></td>
            {showPlayer && <td><LinkedBy m={m} /></td>}
            <td>{m.category}</td>
            <td>{m.order_no ?? '–'}</td>
            <td className="adm-msgcell"><Link to={`/admin/support/${m.id}`} className="adm-plain">{m.message.length > 110 ? `${m.message.slice(0, 110)}…` : m.message}</Link>{m.has_screenshot && <span className="adm-tag" title="Has a screenshot">screenshot</span>}</td>
            <td className="num">{m.replies || '–'}</td>
            <td>
              <select aria-label={`Status of ${m.ref}`} value={m.status} disabled={busy === m.id} onChange={(e) => change(m, e.target.value)} className={`adm-status-select adm-status--${m.status}`}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}

function SupportInbox() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState({ q: '', status: '', category: '' });
  const list = useLoad(() => adminApi.support(filter), [filter.q, filter.status, filter.category]);
  const counts = list.data?.counts;
  const setF = (k) => (v) => setFilter((f) => ({ ...f, [k]: v }));
  return (
    <section className="adm-stack">
      <div className="adm-row"><h1 className="adm-h1">Support messages</h1><span className="adm-grow" />
        {counts && <div className="adm-row" role="group" aria-label="Filter by status">
          {['', 'new', 'open', 'done'].map((st) => (
            <button key={st || 'all'} type="button" className={`adm-btn ${filter.status === st ? 'adm-btn--primary' : 'adm-btn--ghost'}`} aria-pressed={filter.status === st} onClick={() => setF('status')(st)}>
              {st ? `${STATUS_LABEL[st]} ${n(counts[st])}` : `All ${n(counts.new + counts.open + counts.done)}`}
            </button>
          ))}
        </div>}
      </div>
      <form className="adm-row" onSubmit={(e) => { e.preventDefault(); setF('q')(q.trim()); }}>
        <input className="adm-search" type="search" placeholder="Name, email, player, order number (MS-1001), reference (S-1001) or words in the message" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Category" value={filter.category} onChange={(e) => setF('category')(e.target.value)}>
          <option value="">All categories</option>
          {(list.data?.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="adm-btn adm-btn--primary">Search</button>
        {(filter.q || filter.category || filter.status) && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setQ(''); setFilter({ q: '', status: '', category: '' }); }}>Clear</button>}
      </form>
      <Err error={list.error} />
      {list.loading && !list.data && <p className="adm-muted">Loading…</p>}
      {list.data && <SupportTable rows={list.data.messages} onChanged={list.reload} />}
      {list.data?.messages.length === 200 && <p className="adm-muted">Showing the newest 200. Search or filter to find older ones.</p>}
    </section>
  );
}

function Screenshot({ id }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let live = true;
    let made = null;
    adminApi.supportScreenshot(id).then((blob) => { made = URL.createObjectURL(blob); if (live) setUrl(made); }).catch((err) => live && setError(err));
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [id]);
  if (error) return <Err error={error} />;
  if (!url) return <p className="adm-muted">Loading the screenshot…</p>;
  return <a href={url} target="_blank" rel="noreferrer" title="Open full size"><img src={url} alt="The player's screenshot" className="adm-shot" /></a>;
}

function SupportMessage() {
  const { id } = useParams();
  const d = useLoad(() => adminApi.supportMessage(id), [id]);
  const [note, setNote] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  if (d.error) return <Err error={d.error} />;
  if (!d.data) return <p className="adm-muted">Loading…</p>;
  const { message: m, replies, audit, emailOn } = d.data;
  const run = async (fn, done) => {
    setBusy(true); setMsg(null);
    try { const r = await fn(); await d.reload(); setMsg({ bad: false, text: typeof done === 'function' ? done(r) : done }); } catch (err) { setMsg({ bad: true, text: err.message }); } finally { setBusy(false); }
  };
  const setStatus = (status) => run(() => adminApi.supportStatus(m.id, status, note.trim() || undefined), () => { setNote(''); return `Marked ${STATUS_LABEL[status]}.`; });
  const reply = (e) => {
    e.preventDefault();
    if (text.trim().length < 2) return;
    run(() => adminApi.supportReply(m.id, text.trim()), (r) => { setText(''); return r.emailed ? `Reply emailed to ${m.email}.` : `Reply saved, but not emailed${r.emailError ? ` (${r.emailError})` : ': email is off (BREVO_API_KEY)'}. Answer the player another way.`; });
  };
  return (
    <section className="adm-stack">
      <Link to="/admin/support" className="adm-muted">← Support messages</Link>
      <div className="adm-row"><h1 className="adm-h1">{m.ref} · {m.category}</h1><StatusTag status={m.status} /></div>
      <div className="adm-row adm-row--top">
        <div className="adm-stack" style={{ flex: '1 1 480px', minWidth: 0 }}>
          <dl className="adm-facts">
            <div><dt>From</dt><dd>{m.name} · {m.email}</dd></div>
            <div><dt>Player</dt><dd><LinkedBy m={m} />{m.linked_by === 'login' && <span className="adm-muted"> (logged in)</span>}</dd></div>
            <div><dt>Received</dt><dd>{when(m.created_at)}</dd></div>
            <div><dt>Order number</dt><dd>{m.order_no ?? '–'}</dd></div>
            <div><dt>Device</dt><dd className="adm-muted">{m.device ?? '–'}</dd></div>
            <div><dt>Country · IP</dt><dd>{m.country ?? '–'} · {m.ip ?? <span className="adm-muted">(removed after 90 days)</span>}</dd></div>
            <div><dt>Support address told</dt><dd>{m.notified_at ? when(m.notified_at) : <span className="adm-muted">no (email off or no SUPPORT_EMAIL)</span>}</dd></div>
          </dl>
          <div className="adm-quote">{m.message}</div>
          {m.has_screenshot && <Screenshot id={m.id} />}
          <b>Replies</b>
          {replies.length === 0 ? <p className="adm-muted">No replies yet.</p> : replies.map((r) => (
            <div key={r.id} className="adm-reply">
              <div className="adm-muted">@{r.admin ?? '–'} · {when(r.created_at)} · {r.emailed_at ? 'emailed' : 'not emailed'}</div>
              <div className="adm-pre">{r.body}</div>
            </div>
          ))}
          <form className="adm-action" onSubmit={reply}>
            <b>Reply to {m.name}</b>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={5000} placeholder={`Hi ${m.name}, …`} />
            <p className="adm-muted">{emailOn ? `Emailed to ${m.email} from the game's address; their answer comes back to the support address.` : 'Email is off (no BREVO_API_KEY): the reply is saved here but not sent.'} Logged in the audit log. A new message becomes Open.</p>
            <div><button type="submit" className="adm-btn adm-btn--primary" disabled={busy || text.trim().length < 2}>{busy ? '…' : emailOn ? 'Send reply' : 'Save reply'}</button></div>
          </form>
          {msg && <p className={`adm-msg ${msg.bad ? 'adm-msg--bad' : ''}`} role="status">{msg.text}</p>}
        </div>
        <div className="adm-actions" style={{ flex: '0 1 320px' }}>
          <div className="adm-action">
            <b>Status</b>
            <div className="adm-row">
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <button key={k} type="button" className={`adm-btn ${m.status === k ? 'adm-btn--primary' : ''}`} aria-pressed={m.status === k} disabled={busy || m.status === k} onClick={() => setStatus(k)}>{v}</button>
              ))}
            </div>
            <label>Note for the audit log (optional)<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Coins credited, refund sent" /></label>
          </div>
          {m.player_id && <Link to={`/admin/players/${m.player_id}`} className="adm-btn adm-btn--ghost" style={{ textAlign: 'center', textDecoration: 'none' }}>Open @{m.player}'s profile</Link>}
        </div>
      </div>
      <b>History</b>
      <AuditTable rows={audit} showPlayer={false} />
    </section>
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
                <td><Link to={`/admin/players/${p.id}`}>{p.display_name || p.username}</Link>{p.display_name ? <span className="adm-muted"> @{p.username}</span> : null}{p.suspended_at && <span className="adm-tag adm-tag--bad">suspended</span>}{p.deleted_at && <span className="adm-tag">deleted</span>}{p.role === 'admin' && <span className="adm-tag">admin</span>}</td>
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

const TABS = ['Coins', 'Races', 'Marbles', 'Payments', 'Messages', 'Security', 'Emails', 'Audit'];

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
  const { player: p, coins, races, marbles, security, consents, payments, audit, messages = [] } = d.data;
  const after = (text) => async (fn) => { const r = await fn(); await d.reload(); return typeof text === 'function' ? text(r) : text; };
  return (
    <section className="adm-stack">
      <Link to="/admin/players" className="adm-muted">← Players</Link>
      <div className="adm-row adm-row--top">
        <div className="adm-stack" style={{ flex: '1 1 420px', minWidth: 0 }}>
          <h1 className="adm-h1">{p.display_name || p.username} {p.suspended_at && <span className="adm-tag adm-tag--bad">suspended {when(p.suspended_at)}</span>}{p.deleted_at && <span className="adm-tag">account deleted {when(p.deleted_at)}</span>}</h1>
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
          {p.role !== 'admin' && !p.deleted_at && (
            <Action title="Delete account (the player asked; anonymises it, keeps payments)" submit="Delete account" danger
              onSubmit={(reason) => after((r) => `Deleted: now ${r.username}.`)(() => adminApi.deleteAccount(p.id, reason))} />
          )}
          {p.role !== 'admin' && !p.deleted_at && (
            <Action title={p.suspended_at ? 'Lift the suspension' : 'Suspend (no login, no racing)'} submit={p.suspended_at ? 'Lift suspension' : 'Suspend'} danger={!p.suspended_at}
              onSubmit={(reason) => after(p.suspended_at ? 'Suspension lifted.' : 'Suspended.')(() => adminApi.suspend(p.id, !p.suspended_at, reason))} />
          )}
        </div>
      </div>

      <div className="adm-tabs" role="tablist">
        {TABS.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}{t === 'Messages' && messages.length > 0 && <span className="adm-count">{messages.length}</span>}</button>)}
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
      {tab === 'Payments' && <PaymentTable rows={payments} onChanged={d.reload} />}
      {tab === 'Messages' && (
        <div className="adm-stack">
          <p className="adm-muted">Messages sent with the Help Centre's contact form: while logged in to this account, or from its email address.</p>
          <SupportTable rows={messages} showPlayer={false} onChanged={d.reload} />
        </div>
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
            <div><span>From gift codes ({days} d)</span><b>{n(sum('gifted'))}</b><small>counted as bought, never on scoreboards</small></div>
            <div><span>Spent in the shop ({days} d)</span><b>{n(sum('spent'))}</b></div>
            <div><span>Given by support ({days} d)</span><b>{n(sum('support'))}</b></div>
            <div><span>Races ({days} d)</span><b>{n(sum('races'))}</b></div>
            <div><span>Accounts</span><b>{n(e.players.accounts)}</b><small>{n(e.players.saved)} saved · {n(e.players.guests)} guests</small></div>
            <div><span>Age groups</span><b>{n(e.players.adults)}</b><small>18+ · {n(e.players.age_13_17)} 13–17 · {n(e.players.under_13)} under 13</small></div>
            <div><span>News by email</span><b>{n(e.players.email_ok)}</b><small>{n(e.players.suspended)} suspended accounts</small></div>
          </div>
          <Bars rows={e.daily} />
          <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Day</th><th className="num">Players</th><th className="num">New accounts</th><th className="num">Races</th><th className="num">Earned</th><th className="num">Bought</th><th className="num">Gift codes</th><th className="num">Refunded</th><th className="num">Spent</th><th className="num">Support</th></tr></thead>
            <tbody>{[...e.daily].reverse().map((r) => <tr key={r.day}><td>{String(r.day).slice(0, 10)}</td><td className="num">{n(r.players)}</td><td className="num">{n(r.new_accounts)}</td><td className="num">{n(r.races)}</td><td className="num">{n(r.earned)}</td><td className="num">{n(r.bought)}</td><td className="num">{n(r.gifted)}</td><td className="num">{n(r.refunded)}</td><td className="num">{n(r.spent)}</td><td className="num">{n(r.support)}</td></tr>)}</tbody></table></div>
          <div className="adm-row adm-row--top">
            <div className="adm-stack" style={{ flex: '1 1 380px', minWidth: 0 }}>
              <b>Marbles sold ({days} d)</b>
              <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Marble</th><th>Rarity</th><th className="num">Copies</th><th className="num">Coins</th></tr></thead>
                <tbody>{e.sales.map((s) => <tr key={s.item_slug}><td>{s.name}</td><td>{s.rarity ?? '–'}</td><td className="num">{n(s.copies)}</td><td className="num">{n(s.coins)}</td></tr>)}</tbody></table>
                {e.sales.length === 0 && <p className="adm-muted">None.</p>}</div>
              <b>Coin packs paid ({days} d)</b>
              <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Pack</th><th>Provider</th><th className="num">Paid</th><th className="num">Amount</th></tr></thead>
                <tbody>{e.coinPacks.map((p) => <tr key={`${p.product_id}${p.provider}${p.currency}`}><td>{p.product_id}</td><td>{p.provider}</td><td className="num">{n(p.paid)}</td><td className="num">{(p.cents / 100).toFixed(2)} {p.currency}</td></tr>)}</tbody></table>
                {e.coinPacks.length === 0 && <p className="adm-muted">None paid in this period.</p>}</div>
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
