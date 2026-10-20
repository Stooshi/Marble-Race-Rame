import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatNumber } from '../utils/format';
import Logo from './Logo';
import SoundControl from './SoundControl';
import { handle } from '../shared/playerName';
import LogoutButton from './account/LogoutButton';

/** Which header a page wears: the landing page's, the race flow's slim one, checkout's, or the game's. */
export function headerKind(pathname, isAuthenticated) {
  if (pathname === '/' && !isAuthenticated) return 'landing';
  if (pathname.startsWith('/checkout')) return 'checkout';
  if (pathname.startsWith('/play/')) return 'flow';
  return 'app';
}

function UserChips({ user }) {
  return (
    <div className="ms-chips">
      <Link to="/shop#coins" className="ms-chip" title="Coins: earned racing or bought in coin packs">● {formatNumber(user.coins ?? 0)} coins</Link>
      {user.streak > 0 && <span className="ms-chip ms-chip--streak" title={`Daily streak: the daily goal met ${user.streak} day${user.streak === 1 ? '' : 's'} in a row`}>▲ {user.streak}</span>}
      {user.is_guest
        ? <Link to="/signup" className="ms-btn ms-btn--primary ms-btn--sm"><span className="ms-wide-only">SAVE YOUR MARBLE</span><span className="ms-narrow-only">SAVE</span></Link>
        : <Link to="/settings" className="ms-chip" title="Settings">{handle(user.username)}</Link>}
    </div>
  );
}

export default function SiteHeader() {
  const { pathname } = useLocation();
  const { user, isAuthenticated, loading, token } = useAuth();
  // (Signed in, or still checking a stored login: the logo goes to the home hub, never to the visitors' landing page.)
  const signedIn = isAuthenticated || (loading && Boolean(token));
  const home = signedIn ? '/home' : '/';
  const kind = headerKind(pathname, signedIn);

  if (kind === 'checkout') {
    return (
      <header className="ms-header">
        <div className="ms-header__inner ms-header__inner--narrow">
          <Link to="/shop" className="ms-header__back">← Back to the shop</Link>
          <span className="ms-grow" />
          <Link to="/help#buying-coins" className="ms-header__back">Help</Link>
          <Link to={home} aria-label="Marble Spins home" className="ms-header__logo"><Logo size={26} plain /></Link>
        </div>
      </header>
    );
  }
  if (kind === 'landing') {
    return (
      <header className="ms-header">
        <div className="ms-header__inner ms-header__inner--landing">
          <Link to="/" aria-label="Marble Spins home" className="ms-header__logo"><Logo /></Link>
          <nav aria-label="Main" className="ms-nav ms-nav--landing">
            <a href="#how">How to play</a><a href="#tracks">Tracks</a><a href="#marbles">Marbles</a><a href="#friends">Friends</a><a href="#faq">FAQ</a><Link to="/help">Help</Link>
          </nav>
          <Link to="/signup?mode=login" className="ms-header__login">Log in</Link>
          <Link to="/play/start?quick=1" className="ms-btn ms-btn--primary ms-btn--sm">PLAY FREE</Link>
        </div>
      </header>
    );
  }
  return (
    <header className="ms-header">
      <div className="ms-header__inner">
        <Link to={home} aria-label="Marble Spins home" className="ms-header__logo"><Logo /></Link>
        {kind === 'app' ? (
          <nav aria-label="Main" className="ms-nav">
            <NavLink to="/home">Race</NavLink>
            <NavLink to="/bag">Marble Bag</NavLink>
            <NavLink to="/scores">Scoreboards</NavLink>
            <NavLink to="/shop">Shop</NavLink>
            <NavLink to="/help">Help</NavLink>
          </nav>
        ) : <span className="ms-grow" />}
        <SoundControl />
        {isAuthenticated ? (
          <>
            <UserChips user={user} />
            {kind === 'app' && <LogoutButton className="ms-header__logout" />}
          </>
        ) : (
          <div className="ms-chips">
            <Link to="/signup?mode=login" className="ms-header__login">Log in</Link>
            <Link to="/signup" className="ms-btn ms-btn--primary ms-btn--sm"><span className="ms-wide-only">SAVE YOUR MARBLE</span><span className="ms-narrow-only">SIGN UP</span></Link>
          </div>
        )}
      </div>
    </header>
  );
}
