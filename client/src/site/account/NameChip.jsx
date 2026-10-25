import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { checkName, NAME_NOT_ALLOWED } from '../../shared/nameFilter';
import { isGuest, shownName } from '../../shared/playerName';

/** A chosen name, as the server takes it (src/names assertShownName): 3–24 letters, digits, spaces, _ or -. */
export const SHOWN_NAME = /^[\p{L}\p{N}][\p{L}\p{N} _-]{1,22}[\p{L}\p{N}_]$/u;

/**
 * The player's name in the top bar, next to the coins (Moses, 25 Oct 2026), on the website and in
 * the apps. A saved account: a link to Settings. A guest: the name with a small "not saved" dot; a tap
 * opens a menu with "Save your marble" first, then "Choose your name" (stored on the account with
 * the name filter; it stays when they save the account). Long names end in "…" on phones (site.css).
 */
export default function NameChip({ user, className = '' }) {
  const [open, setOpen] = useState(false);
  const name = shownName(user);
  if (!user) return null;
  if (!isGuest(user)) {
    return <Link to="/settings" className={`ms-chip ms-chip--name ${className}`} title={`${name}: Settings`}><span className="ms-chip__text">{name}</span></Link>;
  }
  return (
    <>
      <button type="button" className={`ms-chip ms-chip--name is-guest ${className}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} title={`${name}: not saved yet`}>
        <span className="ms-chip__text">{name}</span>
        <span className="ms-chip__unsaved" aria-hidden="true" />
        <span className="ms-visually-hidden">, not saved</span>
      </button>
      {open && <GuestNameMenu user={user} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The guest's menu: save the marble (first), or choose a name. */
export function GuestNameMenu({ user, onClose }) {
  const { refreshUser } = useAuth();
  const panel = useRef(null);
  const [name, setName] = useState(user?.display_name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    panel.current?.querySelector('a, button')?.focus();
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    const n = name.trim().replace(/\s+/g, ' ');
    if (!SHOWN_NAME.test(n)) { setError('A name is 3 to 24 letters, digits, spaces, _ or -.'); return; }
    if (/^guest[_ -]?\d/i.test(n)) { setError('Choose a name of your own.'); return; }
    if (checkName(n)) { setError(NAME_NOT_ALLOWED); return; }
    setBusy(true);
    setError(null);
    try {
      await api.setName(n);
      await refreshUser?.();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return createPortal((
    <div className="ms-namemenu" role="presentation" onClick={onClose}>
      <div className="ms-namemenu__panel" role="dialog" aria-modal="true" aria-label="Your name" ref={panel} onClick={(e) => e.stopPropagation()}>
        <div className="ms-namemenu__who">
          <b>{shownName(user)}</b>
          <span>Not saved yet: save your marble to keep it, your coins and your name on any device.</span>
        </div>
        <Link to="/signup" className="ms-btn ms-btn--primary" onClick={onClose}>Save your marble</Link>
        <form className="ms-namemenu__form" onSubmit={submit}>
          <label htmlFor="ms-choose-name">Choose your name</label>
          <div className="ms-namemenu__row">
            <input id="ms-choose-name" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} maxLength={24} autoComplete="nickname" placeholder="Your name" />
            <button type="submit" className="ms-btn ms-btn--sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
          {error && <span className="ms-namemenu__error" role="alert">{error}</span>}
          {saved && !error && <span className="ms-namemenu__ok" role="status">Saved: other players see you as {shownName(user)}.</span>}
          <span className="ms-note">Shown to other players in races, rooms and scoreboards. It stays when you save your marble.</span>
        </form>
        <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" onClick={onClose}>Close</button>
      </div>
    </div>
  ), document.body);
}
