import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { track } from '../consent/tracking';
import QuickSignup from '../account/QuickSignup';

/**
 * Sign up ("Save your marble": the same form as the save pop-up, with birth year and month, since
 * 20 Oct 2026) and log in (?mode=login). ?next= says where to go afterwards.
 */
export default function SignupPage() {
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const guest = Boolean(user?.is_guest);
  const visitor = !user; // (not even a guest yet: nothing to save, a new account)
  const [step, setStep] = useState('form');
  const mode = search.get('mode') === 'login' ? 'login' : 'signup';
  const [resetOn, setResetOn] = useState(false);
  useEffect(() => {
    if (mode !== 'login') return undefined;
    let live = true;
    api.passwordResetEnabled().then((r) => { if (live) setResetOn(Boolean(r.enabled)); }).catch(() => {});
    return () => { live = false; };
  }, [mode]);
  const next = search.get('next')?.startsWith('/') ? search.get('next') : '/home';
  const [f, setF] = useState({ username: '', email: '', login: '', password: '', age: '', terms: false, news: false });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(f.login, f.password);
      navigate(next, { replace: true });
    } catch (err) {
      // (The server's "Invalid credentials", in plain words.)
      setError(err.status === 401 || /invalid credentials/i.test(err.message ?? '') ? "That player name or email and password don't match. Check them and try again." : err.message);
      setBusy(false);
    }
  };

  const swap = () => setSearch((s) => { const n = new URLSearchParams(s); if (mode === 'login') n.delete('mode'); else n.set('mode', 'login'); return n; }, { replace: true });

  return (
    <div className="ms-page" style={{ maxWidth: 520 }}>
      {mode === 'signup' ? (
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          {guest && <span className="ms-pill" style={{ justifySelf: 'start' }}>You're racing as a guest: saving keeps everything you've won</span>}
          <QuickSignup
            heading="h1"
            {...(visitor && { title: 'Make your free account', sub: 'Your coins, marbles and races are saved to it, on every device.' })}
            onStep={setStep}
            onDone={() => navigate(next, { replace: true })}
            onSaved={() => track('sign_up') /* (only to what the player allowed in the cookie banner; no name or email) */}
          />
          {step === 'form' && (visitor
            ? <Link to="/play/start?quick=1" style={{ textAlign: 'center', color: 'var(--ms-soft)' }}>Not now, play free as a guest</Link>
            : <Link to="/home" style={{ textAlign: 'center', color: 'var(--ms-soft)' }}>Not now, keep racing as a guest</Link>)}
          {step === 'form' && <button type="button" onClick={swap} className="ms-linkbtn">Already have an account? Log in</button>}
        </div>
      ) : (
        <form className="ms-card ms-form" onSubmit={submit} noValidate>
          <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Welcome back</h1>
          <label>Player name or email<input value={f.login} onChange={set('login')} autoComplete="username" required /></label>
          <label>Password<input type="password" value={f.password} onChange={set('password')} autoComplete="current-password" required /></label>
          {resetOn && <Link to="/forgot-password" style={{ justifySelf: 'start', color: 'var(--ms-soft)' }}>Forgot your password?</Link>}
          {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
          <button type="submit" className="ms-btn ms-btn--primary ms-btn--lg" disabled={busy}>{busy ? 'ONE MOMENT…' : 'LOG IN'}</button>
          {visitor
            ? <Link to="/play/start?quick=1" style={{ textAlign: 'center', color: 'var(--ms-soft)' }}>Not now, play free as a guest</Link>
            : <Link to="/home" style={{ textAlign: 'center', color: 'var(--ms-soft)' }}>Not now, keep racing as a guest</Link>}
          <button type="button" onClick={swap} className="ms-linkbtn">{visitor ? 'New here? Make a free account' : 'New here? Save your marble'}</button>
        </form>
      )}
    </div>
  );
}
