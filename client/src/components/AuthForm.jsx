import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthForm({ onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [fields, setFields] = useState({ login: '', username: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(fields.login, fields.password);
      else await register({ username: fields.username, email: fields.email, password: fields.password });
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card auth-form" onSubmit={submit}>
      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => setMode('register')}>Create account</button>
      </div>

      {mode === 'login' ? (
        <label className="field">
          <span>Username or email</span>
          <input value={fields.login} onChange={update('login')} autoComplete="username" required />
        </label>
      ) : (
        <>
          <label className="field">
            <span>Username</span>
            <input value={fields.username} onChange={update('username')} autoComplete="username"
              pattern="[A-Za-z0-9_]{3,24}" title="3–24 letters, numbers or underscores" required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={fields.email} onChange={update('email')} autoComplete="email" required />
          </label>
        </>
      )}
      <label className="field">
        <span>Password</span>
        <input type="password" value={fields.password} onChange={update('password')}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : undefined} required />
      </label>

      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn--primary btn--block" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account & get 500 coins'}
      </button>
    </form>
  );
}
