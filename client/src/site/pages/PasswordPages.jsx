import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

/** /forgot-password: asks for the account's email and sends a reset link (Brevo, when set up). */
export function ForgotPasswordPage() {
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { setDone(await api.forgotPassword(address.trim())); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="ms-page ms-page--narrow">
      <form className="ms-card ms-form" onSubmit={submit}>
        <h1 className="ms-h2" style={{ margin: 0 }}>Forgot your password?</h1>
        {!done && (
          <>
            <p style={{ margin: 0, color: 'var(--ms-soft)' }}>Type the email address of your account and we'll send you a link to choose a new password.</p>
            <label>Email<input type="email" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="email" required /></label>
            {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
            <button type="submit" className="ms-btn ms-btn--primary ms-btn--lg" disabled={busy || !address.trim()}>{busy ? 'ONE MOMENT…' : 'SEND THE LINK'}</button>
          </>
        )}
        {done && (
          <div className="ms-msg" role="status">
            If an account uses <b>{address.trim()}</b>, we've emailed it a link. It works once, for {done.minutes ?? 60} minutes. Can't find it? Look in your spam folder, or ask again in a few minutes.
          </div>
        )}
        <Link to="/signup?mode=login" style={{ color: 'var(--ms-soft)' }}>Back to log in</Link>
        <span className="ms-note">Playing as a guest? Guest accounts have no email or password: save your marble to keep it.</span>
      </form>
    </div>
  );
}

/** /reset-password?token=…: the link from the email. Choose a new password; logs in with it. */
export function ResetPasswordPage() {
  const [search] = useSearchParams();
  const token = search.get('token') ?? '';
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 8) { setError('Use at least 8 characters.'); return; }
    if (pw !== again) { setError("The two passwords aren't the same."); return; }
    setBusy(true); setError(null);
    try {
      await resetPassword(token, pw);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  if (!token) {
    return (
      <div className="ms-page ms-page--narrow"><div className="ms-card" style={{ display: 'grid', gap: 12 }}>
        <h1 className="ms-h2" style={{ margin: 0 }}>Reset your password</h1>
        <div className="ms-msg ms-msg--bad" role="alert">This link is incomplete. Open the whole link from the email, or ask for a new one.</div>
        <Link to="/forgot-password">Ask for a new link</Link>
      </div></div>
    );
  }
  return (
    <div className="ms-page ms-page--narrow">
      <form className="ms-card ms-form" onSubmit={submit}>
        <h1 className="ms-h2" style={{ margin: 0 }}>Choose a new password</h1>
        <label>New password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required /></label>
        <label>The same again<input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
        {error && <div className="ms-msg ms-msg--bad" role="alert">{error} {/expired|used/.test(error) && <Link to="/forgot-password">Ask for a new link</Link>}</div>}
        <button type="submit" className="ms-btn ms-btn--primary ms-btn--lg" disabled={busy}>{busy ? 'ONE MOMENT…' : 'SAVE AND LOG IN'}</button>
        <span className="ms-note">Saving logs you out on every other device.</span>
      </form>
    </div>
  );
}
