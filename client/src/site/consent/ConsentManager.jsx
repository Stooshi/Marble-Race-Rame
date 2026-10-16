import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CONSENT_VERSION, onConsent, onOpenCookieSettings, readConsent, saveConsent } from './consent';
import { TRACKING_CONFIGURED, applyConsent, trackPage } from './tracking';

const LOGGED_KEY = 'marble-consent-logged';
const isApp = () => typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());

/** Logs the choice to the player's account once per account and choice (the consent record). */
async function logToAccount(user, consent) {
  if (!user || !consent) return;
  let logged = {};
  try { logged = JSON.parse(localStorage.getItem(LOGGED_KEY) ?? '{}'); } catch { /* (no storage) */ }
  if (logged[user.id] === consent.at) return;
  try {
    await api.cookieConsent({ version: consent.v ?? CONSENT_VERSION, statistics: consent.statistics, marketing: consent.marketing, decided_at: consent.at });
    logged[user.id] = consent.at;
    try { localStorage.setItem(LOGGED_KEY, JSON.stringify(logged)); } catch { /* (no storage) */ }
  } catch { /* (tried again next time) */ }
}

/**
 * The cookie banner and its settings (website only): shown until the player chooses, and again
 * from "Cookie settings" in the footer or on /cookies. Accept all and Reject all are the same size
 * and look; nothing is pre-ticked. Applies the choice (./tracking.js) and logs it when logged in.
 */
export default function ConsentManager() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [consent, setConsent] = useState(() => readConsent());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const app = isApp();

  useEffect(() => onConsent((c) => setConsent(c)), []);
  useEffect(() => onOpenCookieSettings(() => setSettingsOpen(true)), []);
  // Apply the choice (and the account's age rule) whenever either changes; not while a login is
  // still loading (the under-13 rule needs the account first).
  useEffect(() => { if (!loading) applyConsent(consent, user); }, [consent, user, loading]);
  // The record on the account: when logged in, once per account and choice.
  useEffect(() => { if (user && !user.is_guest && consent) logToAccount(user, consent); }, [user, consent]);
  // Every page change, to whatever was allowed.
  useEffect(() => { if (!loading) trackPage(pathname); }, [pathname, consent, loading]);

  if (app || pathname.startsWith('/admin')) return null;
  const choose = (c) => { saveConsent(c); setSettingsOpen(false); };
  return (
    <>
      {!consent && TRACKING_CONFIGURED && !settingsOpen && (
        <div className="ms-consent" role="region" aria-label="Cookie choices">
          <div className="ms-consent__inner">
            <p className="ms-consent__text">
              We use necessary storage to run the game. With your OK, we also use <b>statistics</b> cookies (Google Analytics) to see how the site is used, and <b>marketing</b> cookies (Meta Pixel) to measure our ads. Nothing is sent about you by name. <Link to="/cookies">Cookie policy</Link>
            </p>
            <div className="ms-consent__buttons">
              <button type="button" className="ms-btn ms-consent__btn" onClick={() => choose({ statistics: false, marketing: false })}>REJECT ALL</button>
              <button type="button" className="ms-btn ms-consent__btn" onClick={() => choose({ statistics: true, marketing: true })}>ACCEPT ALL</button>
              <button type="button" className="ms-linkbtn" onClick={() => setSettingsOpen(true)}>Settings</button>
            </div>
          </div>
        </div>
      )}
      {settingsOpen && <CookieSettings current={consent} onSave={choose} onClose={() => setSettingsOpen(false)} />}
    </>
  );
}

/** The settings dialog: a switch per category, nothing pre-ticked (or the current choice). */
function CookieSettings({ current, onSave, onClose }) {
  const id = useId();
  const [stats, setStats] = useState(Boolean(current?.statistics));
  const [marketing, setMarketing] = useState(Boolean(current?.marketing));
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="ms-consent-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-h`}>
      <div className="ms-consent-dialog__box" ref={ref} tabIndex={-1}>
        <h2 id={`${id}-h`} className="ms-h3">Cookie settings</h2>
        <p className="ms-note">Choose what we may use. You can change this any time from "Cookie settings" at the bottom of every page. <Link to="/cookies" onClick={onClose}>What each one does</Link></p>
        <label className="ms-consent-dialog__row">
          <input type="checkbox" checked disabled />
          <span><b>Necessary</b> (always on): keeps you logged in, your settings and this choice. Needed for the game to work.</span>
        </label>
        <label className="ms-consent-dialog__row">
          <input type="checkbox" checked={stats} onChange={(e) => setStats(e.target.checked)} />
          <span><b>Statistics</b>: Google Analytics counts visits and which features are used, without your name or email.</span>
        </label>
        <label className="ms-consent-dialog__row">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
          <span><b>Marketing</b>: the Meta Pixel (and Google's ad signals) measure whether our ads lead to sign-ups and purchases. Never for players under 13.</span>
        </label>
        <div className="ms-consent__buttons">
          <button type="button" className="ms-btn ms-consent__btn" onClick={() => onSave({ statistics: false, marketing: false })}>REJECT ALL</button>
          <button type="button" className="ms-btn ms-consent__btn" onClick={() => onSave({ statistics: true, marketing: true })}>ACCEPT ALL</button>
          <button type="button" className="ms-btn ms-btn--primary" onClick={() => onSave({ statistics: stats, marketing })}>SAVE MY CHOICES</button>
          <button type="button" className="ms-linkbtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
