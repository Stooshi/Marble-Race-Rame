import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatNumber } from '../utils/format';
import { plainName } from '../shared/playerName';
import LogoutButton from '../site/account/LogoutButton';

export default function NavBar() {
  const { user, isAuthenticated } = useAuth();
  return (
    <header className="nav">
      <div className="nav__inner">
        <Link to="/" className="nav__brand">
          <span className="nav__logo" aria-hidden="true" />
          <span className="nav__brand-text">Marble Race</span>
        </Link>
        <nav className="nav__links">
          <NavLink to="/" end>Home</NavLink>
          {isAuthenticated && <NavLink to="/dashboard">Dashboard</NavLink>}
        </nav>
        <div className="nav__user">
          {isAuthenticated ? (
            <>
              <span className="coins" title="Coins">{formatNumber(user.coins)}</span>
              <Link to="/dashboard" className="nav__name">{plainName(user.username, user.display_name)}</Link>
              <LogoutButton className="btn btn--ghost btn--sm" />
            </>
          ) : (
            <Link to="/" className="btn btn--sm">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
