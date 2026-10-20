import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import QuickSignup from './QuickSignup';

/**
 * "Log out". For a guest it first warns (Moses, 20 Oct 2026): a guest has no password, so logging
 * out loses everything. "Save my marble" opens the quick sign-up right there (coins and marbles move
 * to the account); "Log out anyway" logs out. A saved player logs out at once.
 */
export default function LogoutButton({ className, children = 'Log out', onLoggedOut }) {
  const { user, logout } = useAuth();
  const [step, setStep] = useState(null); // null | 'warn' | 'save'
  const out = () => { setStep(null); logout(); onLoggedOut?.(); };
  return (
    <>
      <button type="button" className={className} onClick={() => (user?.is_guest ? setStep('warn') : out())}>{children}</button>
      {step && <GuestWarning step={step} onSave={() => setStep('save')} onLogout={out} onClose={() => setStep(null)} />}
    </>
  );
}

function GuestWarning({ step, onSave, onLogout, onClose }) {
  const panel = useRef(null);
  useEffect(() => { panel.current?.querySelector('button, input')?.focus(); }, [step]);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="ms-sheet ms-sheet--save" role="presentation" onClick={onClose}>
      <div ref={panel} className="ms-sheet__panel ms-save-panel" role="alertdialog" aria-modal="true" aria-labelledby="guest-logout-h" onClick={(e) => e.stopPropagation()}>
        {step === 'warn' ? (
          <div className="ms-save">
            <h2 id="guest-logout-h" className="ms-save__h">You're a guest — if you log out, your coins and marbles are lost.</h2>
            <p style={{ margin: 0, color: 'var(--ms-soft)' }}>Save your marble first? It's free: an email and a password, and everything you have stays yours.</p>
            <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" onClick={onSave}>Save my marble</button>
            <button type="button" className="ms-save__later" onClick={onLogout}>Log out anyway</button>
          </div>
        ) : (
          <>
            <h2 id="guest-logout-h" className="ms-visually-hidden">Save your marble</h2>
            <QuickSignup onDone={onClose} onLater={onClose} />
          </>
        )}
      </div>
    </div>
  );
}
