/**
 * "Redeem a code" (/redeem, linked from Settings): a gift code from a creator, a campaign or a
 * giveaway, worth coins or a season pass (src/giftCodes on the server).
 *
 *   - website only: the apps show no field and no link (Apple 3.1.1 doesn't allow an app's own codes
 *     to unlock content; what's redeemed here works in the apps, as both are sold in the stores too);
 *   - saved accounts only: a guest saves their marble first, right here;
 *   - off until client/src/shared/giftCodes.json says enabled: then it's the site's 404 page.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { isNativeApp } from '../../app/native';
import { formatNumber } from '../../utils/format';
import QuickSignup from '../account/QuickSignup';
import giftCodes from '../../shared/giftCodes.json';

export const giftCodesOn = () => giftCodes.enabled === true && !isNativeApp();

const when = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function Redeemed({ codes }) {
  if (!codes?.length) return null;
  return (
    <section className="ms-card" style={{ display: 'grid', gap: 8 }} aria-labelledby="redeemed-h">
      <h2 id="redeemed-h" className="ms-h3" style={{ margin: 0 }}>Your codes</h2>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
        {codes.map((c) => <li key={c.code + c.redeemedAt}><b>{c.what}</b> <span style={{ color: 'var(--ms-muted)' }}>· {c.code} · {when(c.redeemedAt)}</span></li>)}
      </ul>
    </section>
  );
}

export default function RedeemPage({ NotFound }) {
  const { isAuthenticated, loading, user, refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [codes, setCodes] = useState(null);
  const saved = isAuthenticated && user && !user.is_guest;
  useEffect(() => {
    if (saved && giftCodesOn()) api.myGiftCodes().then((r) => setCodes(r.codes)).catch(() => {});
  }, [saved, done]);

  if (!giftCodesOn()) return NotFound ? <NotFound /> : null;

  if (!loading && !isAuthenticated) {
    return (
      <div className="ms-page ms-page--narrow">
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <h1 className="ms-h2">Redeem a code</h1>
          <p className="ms-lede" style={{ margin: 0 }}>Log in or make a free account first, so what your code gives you stays yours.</p>
          <div className="ms-row">
            <Link to="/signup?next=%2Fredeem" className="ms-btn ms-btn--primary">SIGN UP</Link>
            <Link to="/signup?mode=login&next=%2Fredeem" className="ms-btn">Log in</Link>
          </div>
        </div>
      </div>
    );
  }
  if (user?.is_guest) {
    return (
      <div className="ms-page ms-page--narrow">
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <QuickSignup
            heading="h1"
            title="Save your marble to redeem a code"
            sub="Codes are for saved accounts, so what you get stays yours on every device. Everything you've won as a guest comes with you."
            onDone={() => refreshUser()}
          />
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true); setError(null); setDone(null);
    try {
      const r = await api.redeemCode(code.trim());
      setDone(r);
      setCode('');
      refreshUser?.();
    } catch (err) {
      setError(err.message || 'That didn\'t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ms-page ms-page--narrow" style={{ display: 'grid', gap: 16 }}>
      <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, margin: 0 }}>Redeem a code</h1>
      <form className="ms-card ms-form" onSubmit={submit} aria-describedby="redeem-help">
        <p id="redeem-help" style={{ margin: 0, color: 'var(--ms-soft)' }}>Got a code from a creator or a giveaway? Type it here. Each code works once per account.</p>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Your code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-EFGH-JKMN"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            style={{ fontFamily: 'var(--ms-cond)', fontWeight: 700, fontSize: '1.3rem', letterSpacing: '0.08em' }}
          />
        </label>
        <div className="ms-row"><button type="submit" className="ms-btn ms-btn--primary" disabled={busy || !code.trim()}>{busy ? 'Checking…' : 'REDEEM'}</button></div>
        {error && <p className="ms-msg ms-msg--bad" role="alert" style={{ margin: 0 }}>{error}</p>}
        {done?.kind === 'coins' && (
          <p className="ms-msg" role="status" style={{ margin: 0 }}>
            <b>{formatNumber(done.coins)} coins</b> added to your account. Spend them in the <Link to="/shop">shop</Link>.
          </p>
        )}
        {done?.kind === 'pass' && (
          <p className="ms-msg" role="status" style={{ margin: 0 }}>
            The <b>{done.season.name} pass</b> is yours{new Date(done.season.startsAt) > new Date() ? `, from ${when(done.season.startsAt)}` : ''}, with its marble in your <Link to="/bag">Marble Bag</Link>. <Link to={`/pass?season=${done.season.key}`}>What it gives you</Link>
          </p>
        )}
      </form>
      <Redeemed codes={codes} />
      <p className="ms-note">Codes are free and can't be sold or exchanged for money. Coins from a code count as bought coins: they never count on the scoreboards. <Link to="/legal#sale">Terms</Link></p>
    </div>
  );
}
