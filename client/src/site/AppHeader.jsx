import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatNumber } from '../utils/format';
import { shownName } from '../shared/playerName';
import Logo from './Logo';
import SoundControl from './SoundControl';
import LogoutButton from './account/LogoutButton';
import NameChip from './account/NameChip';

/**
 * The header inside the iPhone and Android apps (Moses, 22 Oct 2026, first Android test: "the apps look
 * like the website"). The website keeps SiteHeader. One compact bar, clear of the notch and the status
 * bar: a small logo, the coins, sound and one menu button; the pages behind the menu open in a bottom
 * sheet. In a race (html.is-race-full, set by the race page) the bar becomes two floating buttons over
 * the full-screen race: back, and the menu.
 */
export default function AppHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, token } = useAuth();
  const signedIn = isAuthenticated || (loading && Boolean(token));
  const home = signedIn ? '/home' : '/';
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate(home));

  return (
    <header className="ms-apphead">
      <div className="ms-apphead__bar">
        {!['/', '/home'].includes(pathname) && (
          <button type="button" className="ms-apphead__icon ms-apphead__back" onClick={back} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
        )}
        <Link to={home} aria-label="Marble Spins home" className="ms-apphead__logo"><Logo size={20} /></Link>
        <span className="ms-grow" />
        {isAuthenticated && <Link to="/shop#coins" className="ms-chip ms-apphead__coins" title="Coins">{`● ${formatNumber(user.coins ?? 0)}`}</Link>}
        {isAuthenticated && <NameChip user={user} className="ms-apphead__name" />}
        <SoundControl />
        <button type="button" className="ms-apphead__icon ms-apphead__menu" aria-expanded={open} aria-haspopup="dialog" aria-label="Menu" onClick={() => setOpen(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
      {open && <MenuSheet user={isAuthenticated ? user : null} onClose={() => setOpen(false)} />}
    </header>
  );
}

const PAGES = [
  ['/home', 'Race'],
  ['/bag', 'Marble Bag'],
  ['/scores', 'Scoreboards'],
  ['/shop', 'Shop'],
  ['/tracks', 'Tracks'],
  ['/help', 'Help'],
];

/**
 * The menu: the pages, the account and, for a guest, saving their marble. In the apps a bottom sheet;
 * on a phone's website (WebHeader, Moses, 25 Oct 2026) the same menu as a drawer from the right, with
 * the sound control in it (the header keeps only the logo, the coins, SAVE and the menu button).
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
