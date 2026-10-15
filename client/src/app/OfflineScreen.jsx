import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { API_URL } from '../api/client';
import Logo from '../site/Logo';
import { isNativeApp, watchNetwork } from './native';

/** Can the game server be reached? (Its /health answers within 6 s.) */
export async function serverReachable(fetchFn = fetch) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetchFn(`${API_URL}/health`, { signal: ctrl.signal, cache: 'no-store' });
    return res.ok || res.status === 503; // (503: up, its database briefly away; the pages say so themselves)
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Covers the game when the phone is offline (or, in the apps, when the game server can't be reached
 * at start), with a retry. It goes away by itself when the connection comes back.
 */
export default function OfflineScreen() {
  const [online, setOnline] = useState(true);
  const [server, setServer] = useState(true);
  const [checking, setChecking] = useState(false);
  const { pathname } = useLocation();

  const check = useCallback(async () => {
    setChecking(true);
    setServer(await serverReachable());
    setChecking(false);
  }, []);

  useEffect(() => {
    let stop = () => {};
    let live = true;
    watchNetwork((on) => { setOnline(on); if (on && isNativeApp()) check(); }).then((s) => { if (live) stop = s; else s(); });
    return () => { live = false; stop(); };
  }, [check]);

  // In the apps, look again every 10 s while the server can't be reached.
  useEffect(() => {
    if (server || !online) return undefined;
    const t = setInterval(check, 10_000);
    return () => clearInterval(t);
  }, [server, online, check]);

  if (online && server) return null;
  // On the Help Centre (it works offline) a slim bar instead of the cover, so the answers can be read.
  if (pathname.startsWith('/help')) {
    return (
      <div className="ms-offline-bar" role="status">
        {online ? "Can't reach the race track right now." : "You're offline."} The help answers still work.
        <button type="button" className="ms-linkbtn" onClick={check} disabled={checking}>{checking ? 'Checking…' : 'Try again'}</button>
      </div>
    );
  }
  return (
    <div className="ms-offline" role="alertdialog" aria-modal="true" aria-labelledby="ms-offline-h">
      <div className="ms-offline__box">
        <Logo size={34} />
        <svg className="ms-offline__icon" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M6 18a26 26 0 0 1 36 0M12 25a17 17 0 0 1 24 0M18 32a8 8 0 0 1 12 0" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="24" cy="38" r="3" fill="currentColor" />
          <path d="M8 8l32 32" stroke="#FF7A1A" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
        <h1 id="ms-offline-h" className="ms-h2" style={{ margin: 0 }}>{online ? "Can't reach the race track" : "You're offline"}</h1>
        <p style={{ margin: 0, color: 'var(--ms-soft)' }}>
          {online
            ? 'The game server isn\'t answering right now. We\'ll keep trying; your coins and marbles are safe.'
            : 'Races are live, so Marble Spins needs the internet. Check Wi-Fi or mobile data; the game comes back by itself.'}
        </p>
        <button type="button" className="ms-btn ms-btn--primary" onClick={check} disabled={checking}>{checking ? 'CHECKING…' : 'TRY AGAIN'}</button>
        <Link to="/help#i-see-the-offline-screen" className="ms-offline__help">Help Centre</Link>
      </div>
    </div>
  );
}
