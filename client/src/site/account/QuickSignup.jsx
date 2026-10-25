import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { MONTHS, TEXTS, ageFrom, lang as browserLang } from './saveTexts';
import { NAME_NOT_ALLOWED, checkName } from '../../shared/nameFilter';
import CountryPicker from '../country/CountryPicker';
import { browserCountry } from '../country/countries';

const thisYear = new Date().getUTCFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => thisYear - i);

/**
 * The quick sign-up (Moses, 20 Oct 2026): player name (a suggestion to change), email, password,
 * birth year and month, the terms (required) and news by email (optional, unticked). A guest's
 * account is saved with everything they won (POST /auth/claim); a visitor's is made (register).
 * The country the player races for is optional, pre-filled with a guess (the connection's country, else
 * the browser's region) that they can change or clear.
 * Under 13 (from the birth year and month): no account is made, a kind message instead. Then
 * "Check your email" when confirmation emails are on (double opt-in), else "Your marble is saved".
 * `onDone()`: the player goes on racing. `onLater()`: closes it. `onSaved()`: right after saving.
 * Used by the save pop-up (SavePrompt) and the sign-up page alike: one form, one age rule.
 */
export default function QuickSignup({ onDone, onLater, onSaved, onStep, heading: H = 'h2', title = null, sub = null }) {
  const L = browserLang();
  const t = TEXTS[L];
  const { user, claim, register } = useAuth();
  const guest = Boolean(user?.is_guest);
  const [f, setF] = useState({ username: '', email: '', password: '', year: '', month: '', country: '', terms: false, news: false });
  const [step, setStep] = useState('form'); // form | confirm | saved | young
  useEffect(() => { onStep?.(step); }, [step, onStep]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [resent, setResent] = useState(false);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // The player name to start from: the name the guest chose (Moses, 25 Oct 2026: it's kept), as a player
  // name (spaces become _); else a suggested free one. The player may change it.
  const chosen = String(user?.display_name ?? '').trim().replace(/[\s-]+/g, '_').replace(/[^A-Za-z0-9_]/g, '').slice(0, 24);
  useEffect(() => {
    if (chosen.length >= 3) { setF((v) => (v.username ? v : { ...v, username: chosen })); return undefined; }
    let on = true;
    api.suggestName().then((r) => { if (on && r?.name) setF((v) => (v.username ? v : { ...v, username: r.name })); }).catch(() => {});
    return () => { on = false; };
  }, [chosen]);
  // The country picker's guess (the player may change or clear it).
  useEffect(() => {
    let on = true;
    const fill = (code) => { if (on && code) setF((v) => (v.country ? v : { ...v, country: code })); };
    api.countrySuggestion().then((r) => fill(r?.suggested || browserCountry())).catch(() => fill(browserCountry()));
    return () => { on = false; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    // (the age first: under 13 gets the kind message whatever else is filled in)
    if (!f.year || !f.month) { setError(t.needBirth); return; }
    if (ageFrom(Number(f.year), Number(f.month)) < 13) { setStep('young'); return; } // (nothing sent, nothing stored)
    if (!/^[A-Za-z0-9_]{3,24}$/.test(f.username.trim())) { setError(t.needName); return; }
    if (checkName(f.username.trim())) { setError(NAME_NOT_ALLOWED); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setError(t.needEmail); return; }
    if (f.password.length < 8) { setError(t.needPassword); return; }
    if (!f.terms) { setError(t.needTerms); return; }
    setBusy(true);
    try {
      const body = { username: f.username.trim(), email: f.email.trim(), password: f.password, birth_year: Number(f.year), birth_month: Number(f.month), marketing_opt_in: f.news, lang: L, ...(f.country && { country: f.country }) };
      const out = await (guest ? claim : register)(body);
      onSaved?.(out);
      setStep(out?.confirm === 'sent' ? 'confirm' : 'saved');
    } catch (err) {
      if (err.details?.code === 'under_13') setStep('young');
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'young') {
    return (
      <div className="ms-save ms-save--center" role="status">
        <h2 className="ms-save__h">{t.youngTitle}</h2>
        <p className="ms-save__p">{t.youngText}</p>
        <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" onClick={onDone}>{t.keepRacing}</button>
      </div>
    );
  }
  if (step === 'confirm' || step === 'saved') {
    return (
      <div className="ms-save ms-save--center" role="status">
        {step === 'confirm' && <span className="ms-save__env" aria-hidden="true">✉</span>}
        <h2 className="ms-save__h">{step === 'confirm' ? t.confirmTitle : t.savedTitle}</h2>
        <p className="ms-save__p">{step === 'confirm' ? t.confirmText(f.email.trim()) : t.savedText(f.username.trim())}</p>
        {step === 'confirm' && <p className="ms-note">{t.confirmNote}</p>}
        <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" onClick={onDone}>{t.keepRacing}</button>
        {step === 'confirm' && (resent
          ? <span className="ms-note">{t.resent}</span>
          : <button type="button" className="ms-save__later" onClick={() => api.resendConfirmEmail(L).then(() => setResent(true)).catch((err) => setError(err.message))}>{t.resend}</button>)}
        {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
      </div>
    );
  }
  return (
    <form className="ms-form ms-save" onSubmit={submit} noValidate>
      <H className="ms-save__h">{title ?? t.formTitle}</H>
      <p className="ms-save__p">{sub ?? t.formSub}</p>
      <label>{t.name}
        <input value={f.username} onChange={set('username')} autoComplete="username" pattern="[A-Za-z0-9_]{3,24}" required maxLength={24} />
        <span className="ms-note" style={{ fontWeight: 400 }}>{t.nameHint}</span>
      </label>
      <label>{t.email}<input type="email" value={f.email} onChange={set('email')} autoComplete="email" inputMode="email" required maxLength={254} placeholder="you@example.com" /></label>
      <label>{t.password}<input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" minLength={8} maxLength={72} required placeholder={t.passwordHint} /></label>
      <fieldset className="ms-save__born">
        <legend>{t.born}</legend>
        <label>{t.year}
          <select value={f.year} onChange={set('year')} required autoComplete="bday-year">
            <option value="">–</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label>{t.month}
          <select value={f.month} onChange={set('month')} required autoComplete="bday-month">
            <option value="">–</option>
            {MONTHS[L].map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </label>
      </fieldset>
      <label>{t.country}
        <CountryPicker value={f.country} onChange={(country) => setF((v) => ({ ...v, country }))} />
        <span className="ms-note" style={{ fontWeight: 400 }}>{t.countryHint}</span>
      </label>
      <label className="ms-check"><input type="checkbox" checked={f.terms} onChange={set('terms')} required /><span>{t.terms[0]}<Link to="/legal#use" target="_blank">{t.terms[1]}</Link>{t.terms[2]}<Link to="/legal#privacy" target="_blank">{t.terms[3]}</Link>{t.terms[4]}</span></label>
      <label className="ms-check"><input type="checkbox" checked={f.news} onChange={set('news')} /><span>{t.news}</span></label>
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
      <button type="submit" className="ms-btn ms-btn--primary ms-btn--lg" disabled={busy}>{busy ? t.saving : t.save}</button>
      {onLater && <button type="button" className="ms-save__later" onClick={onLater}>{t.later}</button>}
    </form>
  );
}
