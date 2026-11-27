import LANGUAGE from '../../shared/language.json';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import CONSENT from '../../shared/payments/consent.json';
import { api } from '../../api/client';
import { activatesDay } from './preSale';

/**
 * "Remind me when sales open" on the pass page, before the pass goes on sale. Only collected for now
 * (src/seasons/reminders.js): nothing is sent yet.
 * - A player (an account with an email): a reminder in the game, and by email too if they tick it.
 * - A visitor or a guest: their email address and a consent box (unticked), one email only.
 * Double opt-in: an email reminder goes only to an address confirmed from a confirmation email (an
 * account's address too, until account emails are verified).
 */
const LISTED = (key) => `marble-pass-reminder:${key}`;
const remembered = (key) => { try { return localStorage.getItem(LISTED(key)) === '1'; } catch { return false; } };
// The emails' language: English only for now (Moses, 21 Oct), else Swedish for a Swedish browser.
const LANG = () => (!LANGUAGE.ENGLISH_ONLY && typeof navigator !== 'undefined' && /^sv\b/i.test(navigator.language || '') ? 'sv' : 'en');
const remember = (key) => { try { localStorage.setItem(LISTED(key), '1'); } catch { /* (private window) */ } };

export default function PassReminder({ season, user, onChange }) {
  const { pass } = season;
  const opens = activatesDay(pass.saleStartsAt ?? season.startsAt);
  const player = user && !user.is_guest && user.email;
  const fill = (text, extra = {}) => Object.entries({ pass: pass.name, opens, ...extra }).reduce((t, [k, v]) => t.split(`{${k}}`).join(v), text);
  const [emailToo, setEmailToo] = useState(false);
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [website, setWebsite] = useState(''); // (the field people never see: a bot fills it)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(() => !player && remembered(season.key));

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (player) {
        await api.passRemind(season.key, { email_too: emailToo, lang: LANG() });
        onChange?.();
      } else {
        await api.passRemind(season.key, { email: email.trim(), consent: agreed, website, lang: LANG() });
        remember(season.key);
        setDone(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try { await api.passRemindCancel(season.key); onChange?.(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (player && pass.reminder) {
    return (
      <div className="ms-pass-remind ms-pass-remind--set" role="status">
        <span>✓ We'll remind you here in the game on {opens}{pass.reminder.email ? (pass.reminder.confirmed ? `, and by email to ${pass.reminder.address}` : `, and by email to ${pass.reminder.address} once you confirm it from the email we send you`) : ''}.</span>
        <button type="button" className="ms-btn ms-btn--sm" disabled={busy} onClick={cancel}>Cancel reminder</button>
        {error && <span className="ms-msg ms-msg--bad" role="alert">{error}</span>}
      </div>
    );
  }
  if (done) {
    return <div className="ms-pass-remind ms-pass-remind--set" role="status">✓ Thanks. We'll send you an email to confirm your address; once you confirm it, we'll email you once, on {opens}, when the pass goes on sale.</div>;
  }
  return (
    <form className="ms-form ms-pass-remind" onSubmit={send}>
      <strong className="ms-pass-remind__h">Remind me when sales open</strong>
      {player ? (
        <>
          <span className="ms-note">{fill(CONSENT.reminderPlayer)}</span>
          <label className="ms-check ms-pass-remind__check">
            <input type="checkbox" checked={emailToo} onChange={(e) => setEmailToo(e.target.checked)} />
            <span>{fill(CONSENT.reminderPlayerEmail, { email: user.email })}</span>
          </label>
        </>
      ) : (
        <>
          <label>Your email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} autoComplete="email" inputMode="email" placeholder="you@example.com" />
          </label>
          <label className="ms-check ms-pass-remind__check">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
            <span>{fill(CONSENT.reminderVisitor)}</span>
          </label>
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
          <span className="ms-note">We keep your address only for this reminder: deleted if you don't confirm it within 7 days of our email, and within 30 days after the sale opens. <Link to="/legal#privacy">Privacy</Link></span>
        </>
      )}
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
      <button type="submit" className="ms-btn ms-btn--primary" disabled={busy || (!player && (!agreed || !email.trim()))}>
        {busy ? 'ONE MOMENT…' : 'REMIND ME'}
      </button>
    </form>
  );
}
