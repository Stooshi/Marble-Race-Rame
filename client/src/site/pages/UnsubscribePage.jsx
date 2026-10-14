import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

/**
 * The link in every news email (/unsubscribe?u=…&t=…): stops news emails at once, no login needed.
 * The server checks the link's signature and saves the answer with its date.
 */
export default function UnsubscribePage() {
  const [search] = useSearchParams();
  const u = search.get('u');
  const t = search.get('t');
  const [state, setState] = useState(u && t ? 'working' : 'bad');
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!u || !t) return;
    api.unsubscribe(u, t).then(() => setState('done')).catch((e) => { setError(e.message); setState('bad'); });
  }, [u, t]);
  return (
    <div className="ms-page ms-page--narrow">
      <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
        <h1 className="ms-h2">News emails</h1>
        {state === 'working' && <p className="ms-lede" style={{ margin: 0 }}>One moment…</p>}
        {state === 'done' && (
          <>
            <p className="ms-lede" style={{ margin: 0 }} role="status">You're unsubscribed: we won't send you news emails any more.</p>
            <span className="ms-note">Changed your mind? Turn them back on in your <Link to="/settings">settings</Link>. Emails about your purchases (receipts) still come from Stripe.</span>
          </>
        )}
        {state === 'bad' && (
          <>
            <div className="ms-msg ms-msg--bad" role="alert">{error || 'This unsubscribe link is incomplete.'}</div>
            <span className="ms-note">You can always turn news emails off in your <Link to="/settings">settings</Link>.</span>
          </>
        )}
      </div>
    </div>
  );
}
