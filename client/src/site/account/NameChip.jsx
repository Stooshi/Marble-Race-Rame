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
 * the name filter; it stays when they save the account). A saved account (admins too, Moses, 27 Oct
 * 2026): a menu with "Your name" (the same rules and filter) and Settings. Long names end in "…" on
 * phones (site.css).
 */
export default function NameChip({ user, className = '' }) {
  const [open, setOpen] = useState(false);
  const name = shownName(user);
  if (!user) return null;
  // (A saved account whose name is hidden after reports: the chip opens "Choose a new name".)
  if (!isGuest(user) && user.name_hidden) {
    return (
      <>
        <button type="button" className={`ms-chip ms-chip--name ${className}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} title={`${name}: your name is hidden`}>
          <span className="ms-chip__text">{name}</span>
        </button>
        {open && <NameDialog user={user} onClose={() => setOpen(false)} />}
      </>
    );
  }
  if (!isGuest(user)) {
    return (
      <>
        <button type="button" className={`ms-chip ms-chip--name ${className}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} title={`${name}: your name and Settings`}>
          <span className="ms-chip__text">{name}</span>
        </button>
        {open && <SavedNameMenu user={user} onClose={() => setOpen(false)} />}
      </>
    );
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

export const HIDDEN_NOTICE = 'Your name was reported and is hidden. Choose a new name.';

export const SAVED_NOTE = (user) => `Shown to other players in races, rooms, leagues and scoreboards. You still log in with your player name ${user?.username ?? ''} or your email.`;

/**
 * "Choose your name": the same rules as the server (src/names assertShownName). A saved account with a
 * chosen name can go back to its player name (`reset`).
 */
export function ChooseNameForm({ user, label = 'Choose your name', note = 'Shown to other players in races, rooms and scoreboards. It stays when you save your marble.', id = 'ms-choose-name' }) {
  const { refreshUser } = useAuth();
  const [name, setName] = useState(user?.name_hidden ? '' : (user?.display_name ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const n = name.trim().replace(/\s+/g, ' ');
    if (!SHOWN_NAME.test(n)) { setError('A name is 3 to 24 letters, digits, spaces, _ or -.'); return; }
    if (/^(guest|player)[_ -]?\d/i.test(n)) { setError('Choose a name of your own.'); return; }
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

  // (Back to the player name: a saved account only, and never while a reported name is hidden.)
  const canReset = Boolean(user && !isGuest(user) && user.display_name && !user.name_hidden);
  const reset = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.setName(null);
      await refreshUser?.();
      setName('');
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="ms-form ms-namemenu__form" onSubmit={submit}>
      <label htmlFor={id}>{label}</label>
      <div className="ms-namemenu__row">
        <input id={id} value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} maxLength={24} autoComplete="nickname" placeholder="Type your player name" />
        <button type="submit" className="ms-btn ms-btn--sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
      {canReset && <button type="button" className="ms-linkbtn ms-namemenu__reset" disabled={busy} onClick={reset}>Use my player name, {user.username}</button>}
      {error && <span className="ms-namemenu__error" role="alert">{error}</span>}
      {saved && !error && <span className="ms-namemenu__ok" role="status">Saved: other players see you as {shownName(user)}.</span>}
      {note && <span className="ms-note">{note}</span>}
    </form>
  );
}

/** A panel over the page (closed with Escape, a tap outside or Close). */
function Panel({ label, onClose, children }) {
  const panel = useRef(null);
  useEffect(() => {
    panel.current?.querySelector('a, button, input')?.focus();
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return createPortal((
    <div className="ms-namemenu" role="presentation" onClick={onClose}>
      <div className="ms-namemenu__panel" role="dialog" aria-modal="true" aria-label={label} ref={panel} onClick={(e) => e.stopPropagation()}>
        {children}
        <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" onClick={onClose}>Close</button>
      </div>
    </div>
  ), document.body);
}

/** "Choose a new name" for a player whose name is hidden after reports (guests and saved accounts). */
export function NameDialog({ user, onClose }) {
  return (
    <Panel label="Choose a new name" onClose={onClose}>
      <div className="ms-namemenu__who">
        <b>{shownName(user)}</b>
        <span>{HIDDEN_NOTICE}</span>
      </div>
      <ChooseNameForm user={user} label="Your new name" note="Other players see guest_ or Player_ and a number until you choose one. Names must be friendly and your own." />
    </Panel>
  );
}

/**
 * The notice under the top bar while the player's name is hidden after reports (Moses, 25 Oct 2026),
 * with "Choose a new name". (Hidden during a full-screen race: site.css.)
 */
export function HiddenNameNotice() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user?.name_hidden) return null;
  return (
    <div className="ms-hidden-name" role="status">
      <span>{HIDDEN_NOTICE}</span>
      <button type="button" className="ms-btn ms-btn--primary ms-btn--sm" onClick={() => setOpen(true)}>Choose a new name</button>
      {open && <NameDialog user={user} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** A saved account's menu: its name (change it) and Settings. */
export function SavedNameMenu({ user, onClose }) {
  return (
    <Panel label="Your name" onClose={onClose}>
      <div className="ms-namemenu__who">
        <b>{shownName(user)}</b>
        <span>{user?.display_name ? `Player name ${user.username}` : 'Saved account'}</span>
      </div>
      <ChooseNameForm user={user} label="Your name" note={SAVED_NOTE(user)} />
      <Link to="/settings" className="ms-btn" onClick={onClose}>Settings</Link>
    </Panel>
  );
}

/** The guest's menu: save the marble (first), or choose a name. */
export function GuestNameMenu({ user, onClose }) {
  return (
    <Panel label="Your name" onClose={onClose}>
      <div className="ms-namemenu__who">
        <b>{shownName(user)}</b>
        <span>{user?.name_hidden ? HIDDEN_NOTICE : 'Not saved yet: save your marble to keep it, your coins and your name on any device.'}</span>
      </div>
      <Link to="/signup" className="ms-btn ms-btn--primary" onClick={onClose}>Save your marble</Link>
      <ChooseNameForm user={user} label={user?.name_hidden ? 'Choose a new name' : 'Choose your name'} />
    </Panel>
  );
}
