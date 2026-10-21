import { lang } from '../account/saveTexts';
import LogoutButton from '../account/LogoutButton';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { activatesDay } from '../payments/preSale';

const day = (t) => (t ? new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null);

/** News by email: on or off, saved with the date. Not offered under 13, or to guests without an email. */
function NewsByEmail() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { api.emailStatus().then(setState).catch((e) => setError(e.message)); }, []);
  const toggle = async () => {
    setBusy(true); setError(null);
    try { await api.setNews(!state.news); setState(await api.emailStatus()); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <section className="ms-card" style={{ display: 'grid', gap: 10 }} aria-labelledby="news-h">
      <h2 id="news-h" className="ms-h3" style={{ margin: 0 }}>News by email</h2>
      {!state && !error && <span className="ms-note">Loading…</span>}
      {state && !state.allowed && state.why === 'under-13' && <p style={{ margin: 0 }}>News emails aren't offered to players under 13.</p>}
      {state && !state.allowed && state.why === 'guest' && <p style={{ margin: 0 }}>You're playing as a guest. <Link to="/signup">Save your account</Link> with an email address to choose news by email.</p>}
      {state?.allowed && (
        <>
          <label style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: busy ? 'wait' : 'pointer' }}>
            <input type="checkbox" role="switch" checked={state.news} disabled={busy} onChange={toggle} style={{ width: 22, height: 22, flex: 'none' }} />
            <span>Send me news, new marbles and events by email ({state.email})</span>
          </label>
          <span className="ms-note">
            {state.news ? 'On' : 'Off'}{state.since ? ` since ${day(state.since)}` : ''}. Every email has a link to stop them; you can change this here any time.
          </span>
        </>
      )}
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
    </section>
  );
}

function YourData() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const download = async () => {
    setBusy(true); setError(null);
    try {
      const blob = await api.exportData();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: 'marble-spins-my-data.json' });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <section className="ms-card" style={{ display: 'grid', gap: 10 }} aria-labelledby="data-h">
      <h2 id="data-h" className="ms-h3" style={{ margin: 0 }}>Your data</h2>
      <p style={{ margin: 0 }}>Download everything Marble Spins stores about your account: profile, races, coins, marbles, purchases, email answers and the security log. <Link to="/legal#privacy">Privacy</Link></p>
      <div><button type="button" className="ms-btn" onClick={download} disabled={busy}>{busy ? 'Preparing…' : 'Download my data'}</button></div>
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
    </section>
  );
}

function DeleteAccount({ user, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const guest = user?.is_guest;
  const ready = typed.trim().toUpperCase() === 'DELETE' && (guest || password.length > 0) && !busy;
  const run = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await api.deleteAccount({ confirm: typed.trim(), ...(!guest && { password }) }); onDeleted(); } catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <section className="ms-card" style={{ display: 'grid', gap: 10, borderColor: 'rgba(229,50,45,0.45)' }} aria-labelledby="del-h">
      <h2 id="del-h" className="ms-h3" style={{ margin: 0 }}>Delete my account</h2>
      {!open && (
        <>
          <p style={{ margin: 0 }}>Deletes your account for good: your login, name, email and settings. It can't be undone, and coins and marbles can't be moved to another account.</p>
          <div><button type="button" className="ms-btn" onClick={() => setOpen(true)}>Delete my account…</button></div>
        </>
      )}
      {open && (
        <form onSubmit={run} className="ms-form">
          <ul style={{ margin: 0, paddingLeft: '1.2em', display: 'grid', gap: 4 }}>
            <li>You'll be logged out everywhere and can't log in again.</li>
            <li>Your name, email, password, settings and email answers are removed, and your IP addresses deleted.</li>
            <li>Your coins, marbles and Marble IDs are lost. Race results stay, under an anonymous name, so other players' places don't change.</li>
            <li>Records of purchases are kept for bookkeeping, as the law requires, without your name or email.</li>
          </ul>
          {!guest && (
            <label>Your password
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}
          <label>Type DELETE to confirm
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" />
          </label>
          {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
          <div className="ms-row">
            <button type="submit" className="ms-btn ms-btn--danger" disabled={!ready}>{busy ? 'Deleting…' : 'Delete my account for good'}</button>
            <button type="button" className="ms-btn" onClick={() => { setOpen(false); setTyped(''); setPassword(''); setError(null); }}>Keep my account</button>
          </div>
        </form>
      )}
    </section>
  );
}

/** The player's season passes: "Holiday Season Pass 2026 — activates 1 December" before the season starts. */
function SeasonPasses() {
  const [list, setList] = useState(null);
  useEffect(() => { api.seasons().then((r) => setList((r.seasons ?? []).filter((x) => x.pass?.owned))).catch(() => setList([])); }, []);
  if (!list?.length) return null;
  const until = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'long' }).format(new Date(iso));
  return (
    <section className="ms-card" style={{ display: 'grid', gap: 6 }} aria-labelledby="pass-h">
      <h2 id="pass-h" className="ms-h3" style={{ margin: 0 }}>Season pass</h2>
      {list.map((x) => (
        <span key={x.key}>
          <strong>{x.pass.name}</strong> — {x.state === 'before' ? `activates ${activatesDay(x.pass.activatesAt ?? x.startsAt)}` : x.state === 'on' ? `active until ${until(x.freeFrom)}` : 'the season is over'}
          {' · '}<Link to={`/pass?season=${x.key}`}>Details</Link>
        </span>
      ))}
    </section>
  );
}

/** Account settings (/settings): news by email, purchases, the data download and deleting the account. */
export default function SettingsPage() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const navigate = useNavigate();
  if (!loading && !isAuthenticated) {
    return (
      <div className="ms-page ms-page--narrow">
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <h1 className="ms-h2">Settings</h1>
          <p className="ms-lede" style={{ margin: 0 }}>Log in to change your settings.</p>
          <div className="ms-row"><Link to="/signup?mode=login&next=/settings" className="ms-btn ms-btn--primary">Log in</Link></div>
        </div>
      </div>
    );
  }
  return (
    <div className="ms-page ms-page--narrow" style={{ display: 'grid', gap: 16 }}>
      <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, margin: 0 }}>Settings</h1>
      {user && <span style={{ color: 'var(--ms-soft)' }}>@{user.username}{user.is_guest ? ' · guest' : ` · ${user.email}`}</span>}
      {user && !user.is_guest && !user.email_verified_at && <ConfirmEmail />}
      <SeasonPasses />
      <NewsByEmail />
      <section className="ms-card" style={{ display: 'grid', gap: 6 }} aria-labelledby="buy-h">
        <h2 id="buy-h" className="ms-h3" style={{ margin: 0 }}>Purchases</h2>
        <span>Your orders (coin packs and the season pass) and receipts: <Link to="/purchases">Purchases</Link></span>
      </section>
      <section className="ms-card" style={{ display: 'grid', gap: 6 }} aria-labelledby="help-h">
        <h2 id="help-h" className="ms-h3" style={{ margin: 0 }}>Help</h2>
        <span>Answers about coins, marbles, payments and your account: <Link to="/help">Help Centre</Link> · <Link to="/help#contact">Contact us</Link></span>
      </section>
      <YourData />
      <DeleteAccount user={user} onDeleted={() => { logout(); navigate('/?deleted=1'); }} />
      <div className="ms-row"><LogoutButton className="ms-btn" onLoggedOut={() => navigate('/')} /></div>
    </div>
  );
}

/** "Your email isn't confirmed yet": a new confirmation link (only once emails are switched on). */
function ConfirmEmail() {
  const [on, setOn] = useState(false);
  const [state, setState] = useState(null);
  useEffect(() => { api.passwordResetEnabled().then((r) => setOn(Boolean(r.enabled))).catch(() => {}); }, []);
  if (!on) return null;
  const send = () => { setState('busy'); api.resendConfirmEmail(lang()).then((r) => setState(r.confirm === 'sent' ? 'sent' : r.confirm)).catch((e) => setState(e.message)); };
  return (
    <section className="ms-card" style={{ display: 'grid', gap: 8 }} aria-labelledby="confirm-h">
      <h2 id="confirm-h" className="ms-h3" style={{ margin: 0 }}>Confirm your email</h2>
      <span>Your email address isn't confirmed yet. Confirm it to keep your account safe and get a new password if you forget it.</span>
      <div className="ms-row">
        <button type="button" className="ms-btn ms-btn--sm" disabled={state === 'busy' || state === 'sent'} onClick={send}>Send the confirmation link</button>
        {state === 'sent' && <span className="ms-note">Sent: check your inbox.</span>}
        {state === 'limit' && <span className="ms-note">Sent a few times already: try again in an hour.</span>}
        {state && !['busy', 'sent', 'limit', 'off', 'confirmed'].includes(state) && <span className="ms-msg ms-msg--bad">{state}</span>}
      </div>
    </section>
  );
}
