import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import QuickSignup from './QuickSignup';
import { TEXTS, lang as browserLang } from './saveTexts';

/**
 * "Save your marble — it's free" (Moses, 20 Oct 2026): for guests after every 3rd finished race
 * (3, 6, 9 …, counted by the server across visits: GET /auth/me racesFinished), before the next race
 * starts: on the race pages (/play/…, a friend room /r/…, the next race /race/…) and when "Race again" is pressed. "Later"
 * is always there and always works, and racing is never blocked (App Store rules). Never for saved
 * players (the app review accounts are saved accounts). Once "Later" is pressed it waits for the
 * next 3 races (remembered on the device; if that's lost, it shows once more at the same count).
 */
const EVERY = 3;
const SEEN_KEY = 'marble-save-prompt-seen';
const seenAt = () => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; } };
const markSeen = (n) => { try { localStorage.setItem(SEEN_KEY, String(n)); } catch { /* (private window) */ } };

const SaveCtx = createContext({ beforeNextRace: async () => {} });
export const useSavePrompt = () => useContext(SaveCtx);

export function SavePromptProvider({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(null); // null | { n, step: 'ask' | 'form' }
  const waiting = useRef([]);
  const guest = Boolean(user?.is_guest);

  const due = useCallback(async () => {
    if (!guest) return null;
    const me = await api.me().catch(() => null);
    const n = me?.racesFinished ?? 0;
    if (!me?.user?.is_guest || n < EVERY || n % EVERY !== 0 || seenAt() >= n) return null;
    return n;
  }, [guest]);

  const close = useCallback((n) => {
    if (n) markSeen(n);
    setOpen(null);
    const go = waiting.current; waiting.current = [];
    go.forEach((resolve) => resolve());
  }, []);

  /** Await before starting the next race: resolves at once, or once the pop-up is closed (either button). */
  const beforeNextRace = useCallback(async () => {
    const n = await due();
    if (!n) return;
    await new Promise((resolve) => { waiting.current.push(resolve); setOpen({ n, step: 'ask' }); });
  }, [due]);

  // On the race pages: before the next race can start.
  useEffect(() => {
    if (!guest || !/^\/(play|r|race)\//.test(pathname)) return undefined;
    let on = true;
    due().then((n) => { if (on && n) setOpen((o) => o ?? { n, step: 'ask' }); });
    return () => { on = false; };
  }, [guest, pathname, due]);

  return (
    <SaveCtx.Provider value={{ beforeNextRace }}>
      {children}
      {open && <SaveSheet open={open} onForm={() => setOpen({ ...open, step: 'form' })} onClose={() => close(open.n)} />}
    </SaveCtx.Provider>
  );
}

function SaveSheet({ open, onForm, onClose }) {
  const t = TEXTS[browserLang()];
  const panel = useRef(null);
  useEffect(() => { panel.current?.querySelector('button, input')?.focus(); }, [open.step]);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="ms-sheet ms-sheet--save" role="presentation">
      <div ref={panel} className="ms-sheet__panel ms-save-panel" role="dialog" aria-modal="true" aria-label={t.headline}>
        {open.step === 'ask' ? (
          <div className="ms-save">
            <span className="ms-save__eyebrow">{t.note(open.n)}</span>
            <h2 className="ms-save__h">{t.headline}</h2>
            <ul className="ms-save__ticks">{t.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
            <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" onClick={onForm}>{t.signUp}</button>
            <button type="button" className="ms-save__later" onClick={onClose}>{t.later}</button>
          </div>
        ) : (
          <QuickSignup onDone={onClose} onLater={onClose} />
        )}
      </div>
    </div>
  );
}
