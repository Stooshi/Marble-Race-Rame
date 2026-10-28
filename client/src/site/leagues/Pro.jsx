import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import CONSENT from '../../shared/payments/consent.json';
import { formatNumber } from '../../utils/format';
import MarbleBadge from '../marbles/MarbleBadge';
import { STORE_NAME, buyCredits, shownPrice, storeProvider, useStorePrices } from '../payments';
import { useLeaguesStatus } from './status';

/**
 * Pro Leagues and credits, the website's and the apps' side (Leagues part 2, behind the server's
 * LEAGUES_PRO switch: useLeaguesStatus().pro; off, none of this shows). The screens of the plan
 * "Pro League and Credits" (27 Oct 2026):
 *   KindPick         create: League or Pro League, with what it costs this player (screens 1, 2)
 *   GetCreditsSheet  the credit packs, sold only here on the league pages, "for Pro Leagues" (3)
 *   ProPassCard      the 30-day Pro pass for 5 credits, a second tap naming the amount; "Starts on" (4)
 *   LeagueMarbleCard a Pro League's page: the marble for the winner, progress to 3 ranked players (5)
 *   ProEndCard       the end: the winner's marble, or why there is none (6)
 *   WalletPage       /wallet in the account menu: coins and credits side by side, the one-way swap,
 *                    the pass and every credits change (8)
 * The certificate's League wins (7) is in ../marbles/Certificate.jsx; the PRO mark in My leagues (9) in
 * LeaguesPages.jsx.
 */

export const LEAGUE_MARBLE = 'racing-stripes-pro';
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const DAY_TIME = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const day = (iso) => DAY.format(new Date(iso));
const plural = (n, one, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

/** "Go pro" while Pro is on (the approved wording; never how often, when, or what is won). */
export const GO_PRO_ON = 'Go pro: join a Pro League and race your way to the Marble Spins Major League. Date to be announced.';

/** The player's wallet (GET /api/credits) while Pro is on for them: { wallet, reload, setWallet }. */
export function useWallet() {
  const { user } = useAuth();
  const status = useLeaguesStatus();
  const on = Boolean(status?.pro && user && !user.is_guest);
  const [wallet, setWallet] = useState(null);
  const reload = useCallback(async () => {
    if (!on) return null;
    try { const w = await api.credits(); setWallet(w); return w; } catch { return null; }
  }, [on]);
  useEffect(() => { reload(); }, [reload, user?.id]);
  return { wallet, reload, setWallet, on, status };
}

/** What a Pro League costs this player now → { how: 'pass'|'credits'|'short', have, price, until }. */
export function proCost(wallet, prices) {
  const price = prices?.proLeague ?? 2;
  if (!wallet) return { how: 'credits', have: null, price };
  const pass = wallet.pass && new Date(wallet.pass.starts_at) <= new Date() ? wallet.pass : null;
  if (pass) return { how: 'pass', have: wallet.balance, price, until: pass.ends_at };
  return { how: wallet.balance >= price ? 'credits' : 'short', have: wallet.balance, price };
}

/** "◆ 7 credits · for Pro Leagues": the credits balance as the league pages show it (never the top bar). */
export function CreditsChip({ balance }) {
  if (balance === null || balance === undefined) return null;
  return <span className="ms-pill ms-credits-chip">◆ {plural(balance, 'credit')} · for Pro Leagues</span>;
}

/** The PRO mark. */
export const ProMark = () => <span className="ms-pro-mark" aria-label="Pro League">PRO</span>;

/** Create: League or Pro League side by side (stacked on small phones), with what Pro costs this player. */
export function KindPick({ kind, onKind, wallet, prices, tracks = 5, proTracks = 10 }) {
  const cost = proCost(wallet, prices);
  const proLine = cost.how === 'pass'
    ? <span className="ms-pro-included">included in your Pro pass</span>
    : cost.how === 'short' && cost.have !== null
      ? `${cost.price} credits · you have ${cost.have}`
      : `${cost.price} credits`;
  return (
    <div className="ms-league-kinds" role="radiogroup" aria-label="League type">
      <button type="button" role="radio" aria-checked={kind === 'league'} className="ms-league-kind ms-league-kind--pick" onClick={() => onKind('league')}>
        <b>League</b>
        <span>{tracks} tracks · free · for fun</span>
      </button>
      <button type="button" role="radio" aria-checked={kind === 'pro'} className="ms-league-kind ms-league-kind--pick ms-league-kind--pro" onClick={() => onKind('pro')}>
        <b>Pro League <ProMark /></b>
        <span>{proTracks} tracks · league marble for the winner · counts toward the Major League · {proLine}</span>
      </button>
    </div>
  );
}

// ── Get credits ───────────────────────────────────────────────────────────

/**
 * The credit packs (5, 10, 25), sold only on the league pages, labelled "for Pro Leagues". Website:
 * Stripe Checkout, back to this page (`back`) afterwards; apps: the store's own sheet and price.
 * Saved accounts only. `onPaid(balance)` once paid here (a test payment, or a store purchase).
 */
export function GetCreditsSheet({ wallet, prices, back, onClose, onPaid }) {
  const { user } = useAuth();
  const provider = storeProvider();
  const web = provider === 'stripe' || provider === 'test';
  const packs = wallet?.packs ?? [];
  const storePrices = useStorePrices(packs);
  const [pick, setPick] = useState(packs.find((p) => p.popular)?.id ?? packs[0]?.id ?? null);
  const [withdrawal, setWithdrawal] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [stripeMode, setStripeMode] = useState(null);
  const panel = useRef(null);
  useEffect(() => { panel.current?.focus(); }, []);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  useEffect(() => { if (web) api.paymentOptions().then((o) => setStripeMode(o.stripeMode ?? 'off')).catch(() => {}); }, [web]);
  const pack = packs.find((p) => p.id === pick) ?? null;
  const priceOf = (p) => shownPrice(p.id, `$${(p.amountCents / 100).toLocaleString('en-US')}`, storePrices, provider);
  const pay = async () => {
    if (!pack) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await buyCredits(pack, { consent: withdrawal && terms, back });
      setResult(r);
      if (r.status === 'paid') onPaid?.(r.credits);
    } catch (e) {
      setResult({ status: 'error', message: e.message });
    } finally {
      setBusy(false);
    }
  };
  const ready = pack && (!web || (withdrawal && terms)) && !busy;
  const saved = Boolean(user && !user.is_guest);
  return (
    <div className="ms-sheet" role="presentation" onClick={onClose}>
      <div ref={panel} tabIndex={-1} className="ms-sheet__panel ms-credits-sheet" role="dialog" aria-modal="true" aria-labelledby="credits-h" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ms-sheet__close" aria-label="Close" onClick={onClose}>×</button>
        <div className="ms-credits-sheet__head">
          <h2 id="credits-h" className="ms-sheet__name">Get credits</h2>
          <CreditsChip balance={wallet?.balance ?? null} />
        </div>
        <span className="ms-eyebrow" style={{ color: 'var(--ms-yellow)' }}>for Pro Leagues</span>
        <p className="ms-note" style={{ margin: 0 }}>{prices?.proLeague ?? 2} credits a Pro League, or {prices?.proPass ?? 5} for a {prices?.passDays ?? 30}-day Pro pass. Credits never expire.</p>
        {!saved ? (
          <div className="ms-msg" role="status">Credits are for saved accounts, so they stay yours on every device. <Link to="/signup" onClick={onClose}>Save your marble first</Link>: it's free.</div>
        ) : (
          <>
            <div className="ms-credit-packs" role="radiogroup" aria-label="Credit packs">
              {packs.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={pick === p.id} className={`ms-credit-pack${p.popular ? ' is-popular' : ''}`} onClick={() => setPick(p.id)}>
                  <span className="ms-credit-pack__what"><b>{p.credits} credits</b><span className="ms-note">{p.line}{p.popular ? ' · popular' : ''}</span></span>
                  <span className="ms-credit-pack__price">{priceOf(p) ?? '…'}</span>
                </button>
              ))}
            </div>
            {web && (
              <>
                <label className="ms-credits-check">
                  <input type="checkbox" checked={withdrawal} onChange={(e) => setWithdrawal(e.target.checked)} />
                  <span>{CONSENT.creditsWithdrawal}</span>
                </label>
                <label className="ms-credits-check">
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                  <span>{CONSENT.terms.replace(/the terms of sale\.$/, '')}<Link to="/legal#sale" onClick={onClose}>the terms of sale</Link>.</span>
                </label>
              </>
            )}
            {result?.status === 'paid' && <div className="ms-msg" role="status">Paid: ◆ {pack?.credits} credits added. You have ◆ {result.credits ?? '…'} now.</div>}
            {result?.status === 'redirecting' && <div className="ms-msg" role="status">Taking you to Stripe's secure payment page…</div>}
            {(result?.status === 'pending' || result?.status === 'cancelled') && <div className="ms-msg" role="status">{result.message ?? 'Payment cancelled: nothing was charged.'}</div>}
            {(result?.status === 'unavailable' || result?.status === 'error') && <div className="ms-msg ms-msg--bad" role="alert">{result.message}</div>}
            {result?.status !== 'paid' && (
              <button type="button" className="ms-btn ms-btn--primary ms-btn--lg ms-sheet__buy" disabled={!ready} onClick={pay}>
                {busy ? 'ONE MOMENT…' : pack ? (priceOf(pack) ? `PAY ${priceOf(pack)}` : 'PAY') : 'PICK A PACK'}
              </button>
            )}
            {result?.status === 'paid' && <button type="button" className="ms-btn ms-btn--primary ms-btn--lg ms-sheet__buy" onClick={onClose}>DONE</button>}
            <span className="ms-note">
              {web ? 'Card payment by Stripe: card, Apple Pay or Google Pay. The price is shown in your currency there, VAT included.' : `You pay with ${STORE_NAME[provider]}, in your currency.`}
            </span>
            {web && stripeMode === 'test' && <span className="ms-note" role="note">TEST MODE: no real money is taken. Use Stripe's test card 4242 4242 4242 4242, any future date, any CVC.</span>}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Back from Stripe with ?paid=MS-1042 (or ?credits=cancelled): a line saying so, and the wallet reloaded
 * (the credits come from Stripe's webhook, a moment after: asked again a few times).
 */
export function CreditsReturn({ reload }) {
  const [search, setSearch] = useSearchParams();
  const paid = search.get('paid');
  const cancelled = search.get('credits') === 'cancelled';
  const [seen, setSeen] = useState(null);
  useEffect(() => {
    if (!paid) return undefined;
    let n = 0;
    let stop = false;
    const again = async () => {
      if (stop) return;
      const w = await reload();
      const got = w?.lines?.find((l) => l.order_no === paid);
      if (got) { setSeen(got); return; }
      n += 1;
      if (n < 8) setTimeout(again, 1500);
    };
    again();
    return () => { stop = true; };
  }, [paid, reload]);
  if (!paid && !cancelled) return null;
  const close = () => { const s = new URLSearchParams(search); s.delete('paid'); s.delete('session_id'); s.delete('credits'); setSearch(s, { replace: true }); };
  return (
    <div className="ms-msg ms-league-new" role="status">
      <span>{cancelled ? 'Payment cancelled: nothing was charged.' : seen ? `Paid (${paid}): ◆ ${seen.amount} credits added. You have ◆ ${seen.balance_after}.` : `Paid (${paid}): your credits are on their way…`}</span>
      <button type="button" className="ms-btn ms-btn--sm ms-btn--ghost" onClick={close}>OK</button>
    </div>
  );
}

// ── The Pro pass ──────────────────────────────────────────────────────────

/** The 30-day Pro pass for 5 credits: a second tap names the amount; bought while one runs, it's queued. */
export function ProPassCard({ wallet, prices, onWallet, onGetCredits }) {
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  if (!wallet) return null;
  const price = prices?.proPass ?? 5;
  const days = prices?.passDays ?? 30;
  const running = wallet.pass && new Date(wallet.pass.starts_at) <= new Date() ? wallet.pass : null;
  const starts = new Date(wallet.nextPassStarts ?? Date.now());
  const later = starts.getTime() > Date.now() + 60_000;
  const ends = new Date(starts.getTime() + days * 86_400_000);
  const short = wallet.balance < price;
  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      const w = await api.creditsPass();
      onWallet?.(w);
      setDone(w.bought);
      setSure(false);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="ms-card ms-pro-pass" aria-labelledby="pass-h">
      <span className="ms-eyebrow" style={{ color: 'var(--ms-orange)' }}>Pro pass</span>
      <div className="ms-pro-pass__card">
        <h3 id="pass-h" className="ms-pro-pass__h">Pro pass · {days} days</h3>
        <span style={{ color: 'var(--ms-soft)' }}>Unlimited Pro Leagues for {days} days. Doesn't renew by itself.</span>
        <div className="ms-row" style={{ justifyContent: 'space-between' }}><b className="ms-tab">{price} credits</b><span className="ms-note">You have {wallet.balance}</span></div>
        {running && <span className="ms-ok">Your Pro pass runs until {DAY_TIME.format(new Date(running.ends_at))}.</span>}
      </div>
      {done && <div className="ms-msg" role="status">Done: your Pro pass {new Date(done.starts_at) > new Date() ? `starts on ${day(done.starts_at)}` : 'runs from now'} until {DAY_TIME.format(new Date(done.ends_at))}.</div>}
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error.message}</div>}
      {short
        ? <button type="button" className="ms-btn ms-btn--primary" onClick={onGetCredits}>GET CREDITS</button>
        : !sure
          ? <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" onClick={() => { setSure(true); setDone(null); }}>GET THE PRO PASS · {price} CREDITS</button>
          : (
            <div className="ms-card ms-confirm" role="group" aria-label="Confirm the Pro pass">
              <b>Spend {price} credits on the Pro pass?</b>
              {later
                ? <span className="ms-note"><b className="ms-pro-starts">Starts on {day(starts)}</b>, when your current pass ends, and runs {days} days. {wallet.balance - price} credits left after.</span>
                : <span className="ms-note">From now until {DAY_TIME.format(ends)}. {wallet.balance - price} credits left after.</span>}
              <div className="ms-two-btns">
                <button type="button" className="ms-btn ms-btn--primary" disabled={busy} onClick={buy}>{busy ? 'ONE MOMENT…' : `YES, SPEND ${price}`}</button>
                <button type="button" className="ms-btn" disabled={busy} onClick={() => setSure(false)}>CANCEL</button>
              </div>
            </div>
          )}
    </section>
  );
}

// ── A Pro League's page ───────────────────────────────────────────────────

/** The marble for the winner, and how far the league is toward the 3-player rule (while it runs). */
export function LeagueMarbleCard({ league, tracks }) {
  const need = league.min_ranked ?? 3;
  const have = Math.min(league.ranked ?? 0, need);
  return (
    <section className="ms-card ms-pro-marble" aria-label="The league marble">
      <div className="ms-row" style={{ gap: 12, flexWrap: 'nowrap', alignItems: 'center' }}>
        <MarbleBadge slug={LEAGUE_MARBLE} size={56} label="Racing Stripes, the league marble" />
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <b>Winner gets Racing Stripes</b>
          <span className="ms-note">The league marble: only league winners have it. Needs at least {need} players who finish all {tracks} tracks.</span>
        </div>
      </div>
      <div className="ms-pro-meter" role="meter" aria-valuemin={0} aria-valuemax={need} aria-valuenow={have} aria-label="Players who finished every track"><i style={{ width: `${(100 * have) / need}%` }} /></div>
      <span className="ms-note">{league.ranked ?? 0} of {need} players have finished all {tracks} tracks.</span>
    </section>
  );
}

/** The end of a Pro League: the winner's marble, or why there's none this time. */
export function ProEndCard({ league, scoreboard, userId, tracks }) {
  const first = scoreboard.find((r) => r.place === 1);
  if (league.winner) {
    const me = league.winner.id === userId;
    return (
      <section className="ms-card ms-pro-end" aria-label="The winner">
        <div className="ms-row" style={{ gap: 14, flexWrap: 'nowrap', alignItems: 'center' }}>
          <MarbleBadge slug={LEAGUE_MARBLE} size={84} label="Racing Stripes, the league marble" />
          <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
            <h2 className="ms-pro-end__h">{me ? 'You won' : `${league.winner.name} won`} {league.name}</h2>
            <span className="ms-note">Racing Stripes is {me ? 'yours' : 'theirs'}: League wins {league.winner.league_wins ?? 1}. {league.ranked} players finished all {tracks} tracks.</span>
            {league.winner.marble_code && <Link to={`/certificate/${league.winner.marble_code}`} className="ms-league-link">See the certificate →</Link>}
          </div>
        </div>
      </section>
    );
  }
  if (league.no_winner_reason === 'too_few_finishers') {
    return (
      <section className="ms-card" aria-label="No winner's marble">
        <b>No winner's marble this time</b>
        <span className="ms-note">A Pro League needs at least {league.min_ranked ?? 3} players who finish every track for a winner's marble. {league.ranked === 1 ? 'Only 1 did.' : `Only ${league.ranked ?? 0} did.`}{first ? ` ${first.name} is first on the scoreboard.` : ''}</span>
      </section>
    );
  }
  return null;
}

// ── The wallet ────────────────────────────────────────────────────────────

const KIND_LINE = {
  'credit-pack': (l) => `${l.amount} credits bought${l.order_no ? ` (${l.order_no})` : ''}`,
  'pack-refund': (l) => `Refund${l.order_no ? ` (${l.order_no})` : ''}`,
  'pro-league': (l) => `Pro League${l.league_name ? ` ${l.league_name}` : ''}`,
  'pro-pass': () => 'Pro pass',
  swap: (l) => l.note ?? 'Swapped into coins',
  admin: (l) => l.note ?? 'From Marble Spins support',
};

/** /wallet (in the account menu): coins and credits side by side, the one-way swap, the pass, the credits history. */
export function WalletPage({ NotFound }) {
  const { user, refreshUser } = useAuth();
  const { wallet, reload, setWallet, on, status } = useWallet();
  const [selling, setSelling] = useState(false);
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [swapped, setSwapped] = useState(null);
  if (status === null) return <div className="ms-page"><p className="ms-note">Loading…</p></div>;
  if (!status?.pro) return NotFound ? <NotFound /> : null;
  if (!user || user.is_guest) {
    return (
      <div className="ms-page">
        <h1 className="ms-h1 ms-wallet__h1">Wallet</h1>
        <div className="ms-msg" role="status">Save your marble first: your coins and credits then stay yours on every device. <Link to="/signup">Save my marble</Link></div>
      </div>
    );
  }
  const prices = status.prices;
  const rate = prices?.swapRate ?? 1000;
  const swap = async () => {
    setBusy(true);
    setError(null);
    try {
      const w = await api.creditsSwap(count);
      setWallet(w);
      setSwapped({ credits: count, coins: count * rate });
      setSelling(false);
      refreshUser?.();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ms-page ms-page--narrow ms-wallet">
      <h1 className="ms-h1 ms-wallet__h1">Wallet</h1>
      <CreditsReturn reload={reload} />
      {!wallet && on && <p className="ms-note">Loading…</p>}
      {wallet && (
        <>
          <div className="ms-wallet__two">
            <section className="ms-card ms-wallet__box" aria-label="Coins">
              <span className="ms-note">Coins</span>
              <span className="ms-wallet__n">● {formatNumber(wallet.coins)}</span>
              <span className="ms-note">for marbles and bags in the shop</span>
            </section>
            <section className="ms-card ms-wallet__box ms-wallet__box--credits" aria-label="Credits">
              <span className="ms-note">Credits</span>
              <span className="ms-wallet__n">◆ {formatNumber(wallet.balance)}</span>
              <span className="ms-note">for Pro Leagues · never expire</span>
            </section>
          </div>

          {swapped && <div className="ms-msg" role="status">Swapped: {plural(swapped.credits, 'credit')} into ● {formatNumber(swapped.coins)} coins.</div>}
          {wallet.balance > 0 && (
            <section className="ms-card ms-wallet__swap" aria-labelledby="swap-h">
              <h2 id="swap-h" className="ms-wallet__h2">Swap credits into coins</h2>
              <span className="ms-note">{formatNumber(rate)} coins for each credit. One way only: coins can't be swapped into credits.</span>
              {!selling ? (
                <div className="ms-row" style={{ gap: 8 }}>
                  <label className="ms-form ms-wallet__count">
                    <span className="ms-visually-hidden">Credits to swap</span>
                    <input type="number" min={1} max={wallet.balance} value={count} onChange={(e) => setCount(Math.max(1, Math.min(wallet.balance, Math.round(Number(e.target.value) || 1))))} inputMode="numeric" />
                  </label>
                  <button type="button" className="ms-btn" onClick={() => setSelling(true)}>SWAP {count} {count === 1 ? 'CREDIT' : 'CREDITS'}</button>
                </div>
              ) : (
                <div className="ms-card ms-confirm" role="group" aria-label="Confirm the swap">
                  <b>Swap {plural(count, 'credit')} into {formatNumber(count * rate)} coins?</b>
                  <span className="ms-note"><b style={{ color: 'var(--ms-text)' }}>Swapped credits can't be refunded.</b> You can't swap coins back into credits.</span>
                  <div className="ms-two-btns">
                    <button type="button" className="ms-btn ms-btn--primary" disabled={busy} onClick={swap}>{busy ? 'ONE MOMENT…' : `SWAP ${count} ${count === 1 ? 'CREDIT' : 'CREDITS'}`}</button>
                    <button type="button" className="ms-btn" disabled={busy} onClick={() => setSelling(false)}>KEEP MY CREDITS</button>
                  </div>
                </div>
              )}
              {error && <div className="ms-msg ms-msg--bad" role="alert">{error.message}</div>}
            </section>
          )}

          <section className="ms-card ms-wallet__history" aria-labelledby="hist-h">
            <div className="ms-row" style={{ justifyContent: 'space-between' }}>
              <h2 id="hist-h" className="ms-wallet__h2">Credits</h2>
              {wallet.pass ? <span className="ms-ok">Pro pass until {day(wallet.pass.ends_at)}</span> : <span className="ms-note">No Pro pass</span>}
            </div>
            {wallet.lines.length ? (
              <ul className="ms-wallet__lines">
                {wallet.lines.map((l, k) => (
                  <li key={`${l.created_at}-${k}`}>
                    <span>{DAY.format(new Date(l.created_at))} · {(KIND_LINE[l.kind] ?? ((x) => x.kind))(l)}</span>
                    <span className={`ms-tab ${l.amount > 0 ? 'ms-ok' : ''}`}>{l.amount > 0 ? `+${l.amount}` : `−${-l.amount}`}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="ms-note" style={{ margin: 0 }}>No credits yet. Credits are sold on the league pages, for Pro Leagues.</p>}
            <Link to="/leagues?credits=get" className="ms-btn">GET CREDITS</Link>
            <span className="ms-note">Your purchases, with their order numbers and receipts: <Link to="/purchases">Purchases</Link>.</span>
          </section>
        </>
      )}
    </div>
  );
}
