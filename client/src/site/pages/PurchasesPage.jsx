import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { PACK } from '../../shared/payments/packs';
import { formatNumber } from '../../utils/format';

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
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [waiting, setWaiting] = useState(Boolean(justPaid));
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
          setWaiting(false);
          await Promise.all([load(), refresh.current?.()]);
          return;
        }
      } catch { /* (try again) */ }
      if (tries >= 30) { setWaiting(false); load(); return; }
      setTimeout(tick, 2000);
    };
    tick();
    return () => { stop = true; };
  }, [isAuthenticated, justPaid, load]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="ms-page ms-page--narrow">
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <h1 className="ms-h2">Your purchases</h1>
          <p className="ms-lede" style={{ margin: 0 }}>Log in to see your coin-pack orders and receipts.</p>
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
      {justPaid && !waiting && fresh?.status === 'paid' && <div className="ms-msg" role="status">Order {justPaid} is paid: ● {formatNumber(fresh.coins)} coins added. Stripe has emailed you a receipt. <Link to="/shop">To the shop</Link></div>}
      {justPaid && !waiting && fresh?.status === 'pending' && <div className="ms-msg" role="status">Stripe hasn't confirmed order {justPaid} yet. Some payments take a little longer; your coins arrive by themselves when it does. Reload this page to check.</div>}
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
      {!orders && !error && <p className="ms-note">Loading your orders…</p>}
      {orders?.length === 0 && <p className="ms-lede">No purchases yet. Coin packs are in the <Link to="/checkout">shop's checkout</Link>.</p>}

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
                  <td className="num">● {formatNumber(o.coins)}</td>
                  <td className="num">
                    {o.charged_cents != null ? money(o.charged_cents, o.charged_currency) : `${PACK[o.product_id]?.priceLabel ?? money(o.amount_cents, o.currency)}`}
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
      <span className="ms-note">Questions about an order? Contact us with its order number. Coins can't be cashed out; refunds follow the <Link to="/legal#sale">terms of sale</Link>.</span>
    </div>
  );
}
