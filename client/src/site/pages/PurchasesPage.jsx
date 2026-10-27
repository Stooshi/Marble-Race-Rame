import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { PACK } from '../../shared/payments/packs';
import { formatNumber } from '../../utils/format';
import { wanted } from '../payments/GetCoins';
import { track } from '../consent/tracking';
import { activatesDay } from '../payments/preSale';

/** An amount in its currency, in the player's own number style ("€10.99", "109,00 kr"). */
export function money(cents, currency) {
  if (cents == null || !currency) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

const STATUS = { pending: 'Waiting for payment', paid: 'Paid', refunded: 'Refunded', failed: 'Not paid' };

function statusOf(o) {
  if (o.withdrawn_at && o.status === 'paid' && !(o.refunded_cents > 0)) return 'Withdrawn · refund on its way';
  if (o.status === 'paid' && o.refunded_cents > 0) return 'Partly refunded';
  return STATUS[o.status] ?? o.status;
}

/**
 * The player's coin-pack orders: order number, date, coins, what was charged (their currency,
 * VAT included) and the Stripe receipt. After paying, Stripe sends the player here with
 * ?paid=MS-1234; the coins arrive when Stripe confirms the payment, so the page checks for a minute.
 */
export default function PurchasesPage() {
  const [search] = useSearchParams();
  const { isAuthenticated, loading: authLoading, refreshUser } = useAuth();
  const justPaid = search.get('paid');
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [waiting, setWaiting] = useState(Boolean(justPaid));
  const [withdrawn, setWithdrawn] = useState(null); // { orderNo, email } once the player has withdrawn
  // The seasons, for a pass bought in its pre-sale: "Season pass · activates 1 December".
  const [seasonList, setSeasonList] = useState([]);
  useEffect(() => { if (isAuthenticated) api.seasons().then((r) => setSeasonList(r.seasons ?? [])).catch(() => {}); }, [isAuthenticated]);
  const passOf = (o) => seasonList.find((x) => x.key === o.season_key && x.pass) ?? null;
  const refresh = useRef(refreshUser);
  refresh.current = refreshUser;

  const load = useCallback(async () => {
    try {
      const { orders: list } = await api.myOrders();
      setOrders(list);
      setError(null);
      return list;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  // Just back from Stripe: look again every 2 s (up to a minute) until the payment is confirmed.
  useEffect(() => {
    if (!isAuthenticated || !justPaid) return undefined;
    let tries = 0;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      tries += 1;
      try {
        const { order } = await api.order(justPaid);
        if (order.status !== 'pending') {
          // The purchase, from the payment the server has confirmed: once per order (the order number dedupes it too).
          if (order.status === 'paid') {
            track('purchase', { orderNo: order.order_no ?? justPaid, productId: order.product_id, value: (order.charged_cents ?? order.amount_cents) / 100, currency: order.charged_currency ?? order.currency }, { onceKey: `purchase:${order.order_no ?? justPaid}` });
          }
          setWaiting(false);
          await Promise.all([load(), refresh.current?.()]);
          // Came through Get coins: back to the marble wanted (coin packs only; this tab remembers it).
          const w = order.status === 'paid' && !order.season_key ? wanted({ clear: true }) : null;
          if (w && !stop) navigate(w.back, { replace: true, state: { coinsAdded: order.coins } });
          return;
        }
      } catch { /* (try again) */ }
      if (tries >= 30) { setWaiting(false); load(); return; }
      setTimeout(tick, 2000);
    };
    tick();
    return () => { stop = true; };
  }, [isAuthenticated, justPaid, load, navigate]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="ms-page ms-page--narrow">
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <h1 className="ms-h2">Your purchases</h1>
          <p className="ms-lede" style={{ margin: 0 }}>Log in to see your orders (coin packs and the season pass) and receipts.</p>
          <div className="ms-row"><Link to="/signup?mode=login&next=/purchases" className="ms-btn ms-btn--primary">Log in</Link></div>
        </div>
      </div>
    );
  }

  const fresh = justPaid && orders?.find((o) => o.order_no === justPaid);
  return (
    <div className="ms-page" style={{ display: 'grid', gap: 16 }}>
      <div className="ms-row" style={{ justifyContent: 'space-between', alignItems: 'end' }}>
        <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, margin: 0 }}>Your purchases</h1>
        <Link to="/checkout" className="ms-btn">Buy coins</Link>
      </div>

      {justPaid && waiting && <div className="ms-msg" role="status">Thanks! Waiting for Stripe to confirm order {justPaid}… your coins arrive as soon as it does.</div>}
      {justPaid && !waiting && fresh?.status === 'paid' && <div className="ms-msg" role="status">Order {justPaid} is paid: {fresh.season_key ? (passOf(fresh)?.state === 'before' ? `your ${passOf(fresh).pass.name} activates on ${activatesDay(passOf(fresh).pass.activatesAt)}` : 'your season pass is ready') : `● ${formatNumber(fresh.coins)} coins added`}. Stripe has emailed you a receipt. <Link to="/shop">To the shop</Link></div>}
      {justPaid && !waiting && fresh?.status === 'pending' && <div className="ms-msg" role="status">Stripe hasn't confirmed order {justPaid} yet. Some payments take a little longer; your coins arrive by themselves when it does. Reload this page to check.</div>}
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
      {!orders && !error && <p className="ms-note">Loading your orders…</p>}
      {orders?.length === 0 && <p className="ms-lede">No purchases yet. Coin packs are in the <Link to="/checkout">shop's checkout</Link>.</p>}

      {withdrawn && <div className="ms-msg" role="status">Withdrawal received for order {withdrawn.orderNo}. You get the full amount back, the same way you paid, within 14 days, and the pass is removed from your account.{withdrawn.email ? " We've emailed you a confirmation." : ''}</div>}
      {orders?.some((o) => o.withdraw) && <Withdrawals orders={orders.filter((o) => o.withdraw)} nameOf={(o) => passOf(o)?.pass?.name ?? 'Season pass'} onDone={(w) => { setWithdrawn(w); return Promise.all([load(), refresh.current?.()]); }} />}

      {orders?.length > 0 && (
        <div className="ms-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="ms-table">
            <thead>
              <tr><th>Order</th><th>Date</th><th className="num">Coins</th><th className="num">Paid (incl. VAT)</th><th>Status</th><th>Receipt</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_no} className={o.order_no === justPaid ? 'is-me' : undefined}>
                  <td style={{ fontWeight: 700 }}>{o.order_no}</td>
                  <td>{new Date(o.paid_at ?? o.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td className="num">{o.season_key ? (passOf(o)?.state === 'before' && o.status === 'paid' ? `Season pass · activates ${activatesDay(passOf(o).pass.activatesAt)}` : 'Season pass') : `● ${formatNumber(o.coins)}`}</td>
                  <td className="num">
                    {o.charged_cents != null ? money(o.charged_cents, o.charged_currency) : ['apple', 'google'].includes(o.provider) ? money(o.amount_cents, o.currency) : `${PACK[o.product_id]?.priceLabel ?? money(o.amount_cents, o.currency)}`}
                    {['apple', 'google'].includes(o.provider) && o.charged_cents == null && <span className="ms-note" style={{ display: 'block' }}>US price; {o.provider === 'apple' ? 'Apple' : 'Google'}'s receipt has what you paid</span>}
                    {o.tax_cents > 0 && <span className="ms-note" style={{ display: 'block' }}>VAT {money(o.tax_cents, o.charged_currency)}</span>}
                    {o.refunded_cents > 0 && <span className="ms-note" style={{ display: 'block' }}>Refunded {money(o.refunded_cents, o.charged_currency ?? o.currency)}</span>}
                  </td>
                  <td>{statusOf(o)}</td>
                  <td>{o.receipt_url ? <a href={o.receipt_url} target="_blank" rel="noreferrer">View receipt</a> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <span className="ms-note">Questions about an order? <Link to="/help#i-paid-but-my-coins-didnt-arrive-what-do-i-do">Help with payments</Link>, or <Link to="/help#contact">contact us</Link> with its order number. Coins can't be cashed out; refunds follow the <Link to="/legal#sale">terms of sale</Link>.</span>
    </div>
  );
}

const until = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace(', ', ' at ');

/**
 * The online withdrawal function (EU rules; Moses, 21 Oct 2026): each purchase still within its
 * withdrawal period (a season pass bought in its pre-sale, until it activates) gets a clearly labelled
 * "Withdraw from this purchase" button, then a confirmation step. Bought in the iPhone app: Apple's.
 */
function Withdrawals({ orders, nameOf, onDone }) {
  const [asking, setAsking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const confirm = async (o) => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.withdrawOrder(o.order_no);
      setAsking(null);
      await onDone({ orderNo: o.order_no, email: r.email });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="ms-card" aria-labelledby="withdraw-h" style={{ display: 'grid', gap: 12 }}>
      <h2 id="withdraw-h" className="ms-h3" style={{ margin: 0 }}>Right of withdrawal</h2>
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
      {orders.map((o) => (
        <div key={o.order_no} style={{ display: 'grid', gap: 8 }}>
          <p style={{ margin: 0 }}>
            <b>{nameOf(o)}</b> · order {o.order_no} · {o.charged_cents != null ? money(o.charged_cents, o.charged_currency) : money(o.amount_cents, o.currency)}.
            {' '}You can withdraw from this purchase for a full refund until it activates on {until(o.withdraw.until)} (Swedish time).
          </p>
          {o.withdraw.via === 'apple' ? (
            <p className="ms-note" style={{ margin: 0 }}>Bought in the iPhone app: Apple handles withdrawals and refunds for App Store purchases. Ask Apple at reportaproblem.apple.com.</p>
          ) : asking === o.order_no ? (
            <div className="ms-msg" style={{ display: 'grid', gap: 10 }}>
              <span>Withdraw from order {o.order_no}? You get the full {o.charged_cents != null ? money(o.charged_cents, o.charged_currency) : money(o.amount_cents, o.currency)} back the same way you paid, and the {nameOf(o)} is removed from your account.</span>
              <div className="ms-row">
                <button type="button" className="ms-btn ms-btn--primary" disabled={busy} onClick={() => confirm(o)}>{busy ? 'ONE MOMENT…' : 'Confirm withdrawal'}</button>
                <button type="button" className="ms-btn" disabled={busy} onClick={() => setAsking(null)}>Keep my purchase</button>
              </div>
            </div>
          ) : (
            <div><button type="button" className="ms-btn" onClick={() => setAsking(o.order_no)}>Withdraw from this purchase</button></div>
          )}
        </div>
      ))}
    </section>
  );
}
