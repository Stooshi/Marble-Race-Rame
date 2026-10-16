import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { track } from '../consent/tracking';

const MIN_AGE = 13; // [13]: players younger than this need a parent or guardian's approval (placeholder process)
const AGE_GROUPS = [['under-13', `Under ${MIN_AGE}`], ['13-17', `${MIN_AGE}–17`], ['18+', '18 or older']];

/** Sign up ("Save your marble") and log in (?mode=login). ?next= says where to go afterwards. */
export default function SignupPage() {
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const { login, register, claim, user } = useAuth();
  const guest = Boolean(user?.is_guest);
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
  const tooYoung = f.age === 'under-13';

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signup') {
      if (!f.age) { setError('Pick your age group.'); return; }
      if (tooYoung) { setError(`Players under ${MIN_AGE} need a parent or guardian to approve their account first. [Parent approval is coming]`); return; }
      if (!f.terms) { setError('Please accept the terms of use to continue.'); return; }
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(f.login, f.password);
      else {
        await (guest ? claim : register)({ username: f.username, email: f.email, password: f.password, age_group: f.age, marketing_opt_in: f.news });
        track('sign_up'); // (only to what the player allowed in the cookie banner; no name or email)
      }
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const swap = () => setSearch((s) => { const n = new URLSearchParams(s); if (mode === 'login') n.delete('mode'); else n.set('mode', 'login'); return n; }, { replace: true });

  return (
    <div className="ms-page" style={{ maxWidth: 520 }}>
      <form className="ms-card ms-form" onSubmit={submit} noValidate>
        <div style={{ display: 'grid', gap: 4 }}>
          {mode === 'signup' && <span className="ms-eyebrow">Keep everything you win</span>}
          <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>{mode === 'signup' ? 'Save your marble' : 'Welcome back'}</h1>
        </div>
        {mode === 'signup' && guest && <span className="ms-pill" style={{ justifySelf: 'start' }}>You're racing as a guest: saving keeps everything you've won</span>}
        {mode === 'signup' && <p style={{ margin: 0, color: 'var(--ms-soft)' }}>Keep your coins, streak and Marble Bag on every device, and get told when your friends race.</p>}
        <button type="button" className="ms-btn" disabled title="Coming soon">Continue with Google · [soon]</button>
        <button type="button" className="ms-btn" disabled title="Coming soon">Continue with Apple · [soon]</button>
        <div className="ms-or"><span />or with email<span /></div>
        {mode === 'signup' ? (
          <>
            <label>Player name<input value={f.username} onChange={set('username')} autoComplete="username" pattern="[A-Za-z0-9_]{3,24}" placeholder="3–24 letters, numbers or _" required /></label>
            <label>Email<input type="email" value={f.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" required /></label>
            <label>Password<input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required /></label>
            <fieldset className="ms-agegroup" style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              <legend style={{ fontWeight: 600, marginBottom: 8 }}>Your age</legend>
              <div className="ms-row" role="radiogroup">
                {AGE_GROUPS.map(([value, label]) => (
                  <label key={value} className="ms-check" style={{ flex: '1 1 120px' }}>
                    <input type="radio" name="age" value={value} checked={f.age === value} onChange={set('age')} /><span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {tooYoung && <span className="ms-note">Under [{MIN_AGE}]? We'll ask a parent or guardian to approve your account first. [Parent approval is coming]</span>}
            <label className="ms-check"><input type="checkbox" checked={f.terms} onChange={set('terms')} /><span>I accept the <Link to="/legal#use">terms of use</Link> and have read the <Link to="/legal#privacy">privacy policy</Link>.</span></label>
            {!tooYoung && <label className="ms-check"><input type="checkbox" checked={f.news} onChange={set('news')} /><span>Email me about new tracks and limited marbles (optional). You can stop any time.</span></label>}
          </>
        ) : (
          <>
            <label>Player name or email<input value={f.login} onChange={set('login')} autoComplete="username" required /></label>
            <label>Password<input type="password" value={f.password} onChange={set('password')} autoComplete="current-password" required /></label>
            {resetOn && <Link to="/forgot-password" style={{ justifySelf: 'start', color: 'var(--ms-soft)' }}>Forgot your password?</Link>}
          </>
        )}
        {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
        <button type="submit" className="ms-btn ms-btn--primary ms-btn--lg" disabled={busy}>{busy ? 'ONE MOMENT…' : mode === 'signup' ? 'SAVE AND KEEP RACING' : 'LOG IN'}</button>
        <Link to="/home" style={{ textAlign: 'center', color: 'var(--ms-soft)' }}>Not now, keep racing as a guest</Link>
        <button type="button" onClick={swap} className="ms-linkbtn">{mode === 'signup' ? 'Already have an account? Log in' : 'New here? Save your marble'}</button>
      </form>
    </div>
  );
}
