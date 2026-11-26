import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

/**
 * The in-game "on sale now" notice for a player who asked to be reminded (season.pass.onSaleNotice:
 * only once the server's reminder sending is on and the sale has opened). Shown above every page
 * until the player closes it or opens the pass page. Looked up once a session, logged in only.
 */
export default function PassOnSaleNotice() {
  const { isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();
  const [season, setSeason] = useState(null);
  useEffect(() => {
    if (!isAuthenticated || user?.is_guest) { setSeason(null); return; }
    let live = true;
    api.seasons().then((r) => { if (live) setSeason((r.seasons ?? []).find((s) => s.pass?.onSaleNotice) ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [isAuthenticated, user?.id, user?.is_guest]);
  if (!season || pathname === '/pass' || pathname.startsWith('/race') || pathname.startsWith('/admin')) return null;
  const close = () => { setSeason(null); api.passReminderSeen(season.key).catch(() => {}); };
  return (
    <div className="ms-onsale" role="status">
      <span><strong>The {season.pass.name} is on sale now.</strong> You asked us to remind you.</span>
      <Link to={`/pass?season=${season.key}`} className="ms-btn ms-btn--sm ms-btn--primary" onClick={close}>See the pass</Link>
      <button type="button" className="ms-onsale__x" aria-label="Close" onClick={close}>×</button>
    </div>
  );
}
