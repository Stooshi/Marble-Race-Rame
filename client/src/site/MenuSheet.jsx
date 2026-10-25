import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink } from 'react-router-dom';
import { formatNumber } from '../utils/format';
import { shownName } from '../shared/playerName';
import SoundControl from './SoundControl';
import LogoutButton from './account/LogoutButton';

const PAGES = [
  ['/home', 'Race'],
  ['/bag', 'Marble Bag'],
  ['/scores', 'Scoreboards'],
  ['/shop', 'Shop'],
  ['/tracks', 'Tracks'],
  ['/help', 'Help'],
];

/**
 * The menu: the pages, the account and, for a guest, saving their marble. On a phone's screen, on the
 * website and in the apps alike (SiteHeader, Moses, 25 Oct 2026), a drawer from the right with the sound
 * control in it (the header keeps only the logo, the coins, SAVE and the menu button). (`drawer` off: the
 * older bottom sheet, unused now.)
 */
export function MenuSheet({ user, onClose, drawer = false }) {
  const panel = useRef(null);
  useEffect(() => {
    panel.current?.querySelector('a, button')?.focus();
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  // (On the page itself, not in the header: the header's blur would hold a fixed sheet inside it.)
  return createPortal((
    <div className={`ms-appmenu${drawer ? ' ms-appmenu--drawer' : ''}`} role="presentation" onClick={onClose}>
      <nav className="ms-appmenu__panel" role="dialog" aria-modal="true" aria-label="Menu" ref={panel} onClick={(e) => e.stopPropagation()}>
        {drawer ? (
          <div className="ms-appmenu__top">
            <SoundControl />
            <button type="button" className="ms-apphead__icon" aria-label="Close the menu" onClick={onClose}>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        ) : <span className="ms-appmenu__grip" aria-hidden="true" />}
        {user && (
          <div className="ms-appmenu__who">
            <b>{shownName(user)}</b>
            <span>● {formatNumber(user.coins ?? 0)} coins{user.streak > 0 ? ` · ▲ ${user.streak} day streak` : ''}</span>
          </div>
        )}
        <div className="ms-appmenu__pages">
          {PAGES.map(([to, label]) => <NavLink key={to} to={to} onClick={onClose}>{label}</NavLink>)}
        </div>
        <div className="ms-appmenu__more">
          {user ? (
            <>
              <Link to="/shop#coins" onClick={onClose}>Get coins</Link>
              {user.is_guest ? <Link to="/signup" onClick={onClose} className="is-strong">Save your marble</Link> : <Link to="/settings" onClick={onClose}>Settings</Link>}
              {!user.is_guest && <Link to="/purchases" onClick={onClose}>Purchases</Link>}
              <LogoutButton className="ms-appmenu__logout" onLoggedOut={onClose} />
            </>
          ) : (
            <>
              <Link to="/play/start?quick=1" onClick={onClose} className="is-strong">Play free</Link>
              <Link to="/signup?mode=login" onClick={onClose}>Log in</Link>
            </>
          )}
          <Link to="/legal" onClick={onClose}>Terms and privacy</Link>
        </div>
        {!drawer && <button type="button" className="ms-btn ms-btn--ghost ms-appmenu__close" onClick={onClose}>Close</button>}
      </nav>
    </div>
  ), document.body);
}
