import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { adminApi } from './adminApi';
import { ITEM } from '../shared/marbles';
import MarbleBadge from '../site/marbles/MarbleBadge';
import { countryName } from '../site/country/countries';
import { SAMPLE_CUSTOMER, SAMPLE_DOCUMENTS, SELLER } from './crmSample';
import './crm.css';

/**
 * The CRM design preview (/admin/preview-crm; Moses, 16 Nov 2026; the plan: claude/crm-plan.md in the project).
 * Only the look: admins only, behind the back office's login, linked from nowhere; the live back office is
 * unchanged. A sidebar like a settings app, the customer page in two columns (profile, alerts and a list of
 * sections; the chosen section's cards), Billing the same way (documents; the chosen one). Real data where
 * the back office has it (search a player: their races, coins, marbles, purchases, support, consents,
 * security and audit), samples where it doesn't yet (receipts, credit notes, emails sent, alerts).
 * Nothing on these pages changes anything: every button is a placeholder.
 */

// ── Icons (simple strokes, 24 × 24) ─────────────────────────────────────────
const PATHS = {
  dashboard: 'M3 13h8V3H3zM13 21h8v-8h-8zM13 3v6h8V3zM3 21h8v-4H3z',
  customers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  billing: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2',
  support: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 3M12 14.5h.01',
  marketing: 'M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6',
  tracks: 'M4 19c4-1 3-7 8-8s4-6 8-7M4 19a1.5 1.5 0 1 0 0 .01M20 4a1.5 1.5 0 1 0 0 .01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 3M12 17h.01',
  races: 'M4 22V4M4 4h12l-2 4 2 4H4',
  coins: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2',
  marbles: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 9a4 4 0 0 1 4-3',
  receipt: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4',
  refund: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 8v8M9.5 10.5c.3-.8 1.2-1.3 2.5-1.3',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  check: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  chevron: 'M9 18l6-6-6-6',
  back: 'M15 18l-6-6 6-6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
};
function Icon({ name, size = 20 }) {
  return (
    <svg className="crm-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

// ── Formatting ───────────────────────────────────────────────────────────────
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' }) : '—');
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Stockholm' }) : '—');
const num = (n) => Number(n ?? 0).toLocaleString('en-GB');
const money = (cents, currency) => `${(Number(cents) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
const place = (n) => (n ? `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}` : '—');

const NAV = [
  { to: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: 'customers', icon: 'customers', label: 'Customers' },
  { to: 'billing', icon: 'billing', label: 'Billing' },
  { to: 'support', icon: 'support', label: 'Support' },
  { to: 'marketing', icon: 'marketing', label: 'Marketing' },
  { to: 'tracks', icon: 'tracks', label: 'Races & tracks' },
  { to: 'settings', icon: 'settings', label: 'Settings' },
];

export default function CrmPreview({ session, onLogout }) {
  const { pathname } = useLocation();
  const page = NAV.find((n) => pathname.startsWith(`/admin/preview-crm/${n.to}`))?.to ?? 'customers';
  const title = NAV.find((n) => n.to === page).label;
  const me = session?.user ?? {};
  return (
    <div className="crm">
      <aside className="crm-side">
        <div className="crm-brand"><span className="crm-logo" aria-hidden="true" /> Marble Spins</div>
        <nav className="crm-nav" aria-label="Back office (preview)">
          {NAV.map((n) => (
            <NavLink key={n.to} to={`/admin/preview-crm/${n.to}`} className={({ isActive }) => (isActive || (n.to === 'customers' && page === 'customers') ? 'is-on' : undefined)}>
              <Icon name={n.icon} /> <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="crm-side__foot">
          <a href="/help" className="crm-help"><Icon name="help" /> <span>Help</span></a>
          <div className="crm-me">
            <span className="crm-me__av" aria-hidden="true">{(me.username ?? 'A').slice(0, 1).toUpperCase()}</span>
            <span className="crm-me__txt"><b>{me.username ?? 'admin'}</b><small>Owner · <button type="button" onClick={onLogout}>Log out</button></small></span>
          </div>
        </div>
      </aside>
      <div className="crm-body">
        <header className="crm-top">
          <h1>{title}</h1>
          <span className="crm-grow" />
          <span className="crm-badge crm-badge--live">Stripe live</span>
          <span className="crm-badge">Design preview</span>
          <Link to="/admin/dashboard" className="crm-toplink">Live back office</Link>
        </header>
        <main className="crm-main">
          {page === 'customers' && <Customers />}
          {page === 'billing' && <Billing />}
          {page !== 'customers' && page !== 'billing' && <Later page={page} />}
        </main>
      </div>
    </div>
  );
}

// ── Customers ────────────────────────────────────────────────────────────────

/** A real player from GET /admin/players/:id, in the customer page's shape (samples for what doesn't exist yet). */
function fromApi(d) {
  const S = SAMPLE_CUSTOMER;
  const firstMarble = d.marbles.collection.find((m) => ITEM[m.item_slug]) ?? null;
  const product = (p) => (p.product_id ?? '').replace(/^trackpack-/, 'Track pack: ').replace(/^coins-(\d+)/, (_, n) => `${num(n)} coins`).replace(/^holiday-pass-2026$/, 'Holiday Season Pass 2026');
  const purchases = d.payments.map((p, k) => ({
    order_no: p.order_no ?? p.provider_ref ?? '—',
    item: product(p),
    provider: p.provider,
    status: p.status,
    refunded: p.refunded_cents || 0,
    charged: p.charged_cents ?? p.amount_cents,
    currency: (p.charged_currency ?? p.currency ?? '').toUpperCase(),
    tax: p.tax_cents,
    at: p.paid_at ?? p.created_at,
    receipt: p.provider === 'stripe' && p.status !== 'pending' ? `K-2026-${String(k + 1).padStart(5, '0')}` : null,
  }));
  return {
    sample: false,
    player: { ...d.player, email_verified: Boolean(d.player.email) },
    avatar: firstMarble?.item_slug ?? null,
    plain: firstMarble ? null : d.marbles.plain[0] ?? null,
    marbleId: firstMarble?.marble_code ?? null,
    races: { last24h: d.races.last24h, recent: d.races.recent },
    coins: d.coins,
    marbles: [
      ...d.marbles.collection.map((m) => ({ slug: m.item_slug, code: m.marble_code, source: m.source, at: m.acquired_at })),
      ...d.marbles.plain.map((m) => ({ plain: m, code: null, source: m.is_starter ? 'starter' : 'original', at: null })),
    ],
    purchases,
    refunds: purchases.filter((p) => p.refunded > 0).map((p, k) => ({ number: `KR-2026-${String(k + 1).padStart(5, '0')}`, order_no: p.order_no, of: p.receipt, amount: p.refunded, currency: p.currency, reason: '(the reason is in the audit log)', at: p.at, by: '—', sampleNumber: true })),
    support: d.messages.map((m) => ({ ref: m.ref, category: m.category, status: m.status === 'done' ? 'closed' : m.status, message: m.message, at: m.created_at, replies: m.replies })),
    emails: S.emails, // (no email log yet: a sample)
    consents: [
      { what: 'News by email', value: d.player.marketing_opt_in ? 'Yes' : 'No', how: d.consents[0] ? `Last change: ${d.consents[0].source}` : 'Never asked', at: d.consents[0]?.created_at },
      ...d.consents.slice(1, 6).map((c) => ({ what: 'News by email (earlier)', value: c.consent ? 'Yes' : 'No', how: c.source, at: c.created_at })),
    ],
    security: d.security.events,
    audit: d.audit.map((a) => ({ action: a.action, admin: a.admin, reason: a.reason, at: a.created_at })),
  };
}

const SECTIONS = [
  { key: 'races', icon: 'races', title: 'Races' },
  { key: 'coins', icon: 'coins', title: 'Coins' },
  { key: 'marbles', icon: 'marbles', title: 'Marbles' },
  { key: 'purchases', icon: 'receipt', title: 'Purchases & receipts' },
  { key: 'refunds', icon: 'refund', title: 'Refunds & credit notes' },
  { key: 'support', icon: 'support', title: 'Support' },
  { key: 'emails', icon: 'mail', title: 'Emails sent' },
  { key: 'consents', icon: 'check', title: 'Consents' },
  { key: 'security', icon: 'shield', title: 'Security & audit' },
];

function summary(c, key) {
  switch (key) {
    case 'races': return `${num(c.races.recent.length)} recent · ${c.races.last24h} in the last 24 h · last ${c.races.recent[0]?.track ?? 'none yet'}`;
    case 'coins': return `${num(c.player.coins)} now · ${num(c.player.coins_earned)} won · ${num(c.player.coins_bought)} bought`;
    case 'marbles': return `${c.marbles.length} marble${c.marbles.length === 1 ? '' : 's'}${c.marbles[0] && c.marbles[0].slug ? ` · newest ${ITEM[c.marbles[0].slug]?.design.name ?? ''}` : ''}`;
    case 'purchases': return c.purchases.length ? `${c.purchases.length} purchase${c.purchases.length === 1 ? '' : 's'} · last ${c.purchases[0].item}` : 'No purchases';
    case 'refunds': return c.refunds.length ? `${c.refunds.length} · ${c.refunds.some((r) => r.pending) ? 'one pending' : 'all settled'}` : 'None';
    case 'support': return c.support.length ? `${c.support.length} message${c.support.length === 1 ? '' : 's'} · ${c.support[0].ref} ${c.support[0].status}` : 'No messages';
    case 'emails': return `${c.emails.length} sent · last “${c.emails[0]?.subject}”`;
    case 'consents': return `News by email: ${c.consents[0]?.value ?? '—'} · in the game: on`;
    case 'security': return `${c.security.length} sign-in events · ${c.audit.length} admin actions`;
    default: return '';
  }
}

function alertsOf(c) {
  const out = [];
  for (const r of c.refunds) if (r.pending) out.push({ text: `Refund pending: ${r.order_no}, ${money(r.amount, r.currency)}. Stripe hasn't confirmed it yet; the credit note follows.`, section: 'refunds' });
  if (!c.player.is_guest && c.player.email && !c.player.email_verified) out.push({ text: 'Email not confirmed: receipts still go out; news can\'t until it is.', section: 'emails' });
  if (c.player.suspended_at) out.push({ text: `Suspended since ${day(c.player.suspended_at)}.`, section: 'security' });
  const open = c.support.find((s) => s.status === 'new' || s.status === 'open');
  if (open) out.push({ text: `Support ${open.ref} is waiting for us.`, section: 'support' });
  return out;
}

function Customers() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState(null);
  const [cust, setCust] = useState(SAMPLE_CUSTOMER);
  const [section, setSection] = useState('purchases');
  const [detail, setDetail] = useState(false); // (phones: the section's details instead of the list)
  const [error, setError] = useState(null);

  useEffect(() => {
    if (q.trim().length < 2) { setHits(null); return undefined; }
    const t = setTimeout(() => {
      adminApi.players(q.trim()).then((r) => setHits(r.players.slice(0, 8)), (e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const open = async (id) => {
    setError(null); setHits(null); setQ('');
    try { setCust(fromApi(await adminApi.player(id))); setDetail(false); } catch (e) { setError(e.message); }
  };
  const toTop = () => { if (window.matchMedia?.('(max-width: 820px)').matches) window.scrollTo(0, 0); };
  const pick = (key) => { setSection(key); setDetail(true); toTop(); };
  const alerts = alertsOf(cust);
  const p = cust.player;

  return (
    <div className="crm-page">
      <div className="crm-search">
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, Marble ID, order number (MS-1042), receipt (K-2026-00002) or support ref (S-1043)" aria-label="Find a customer" />
        {hits && (
          <ul className="crm-hits">
            {hits.length === 0 && <li className="crm-muted">Nobody found.</li>}
            {hits.map((h) => (
              <li key={h.id}><button type="button" onClick={() => open(h.id)}><b>{h.display_name || h.username}</b> <span className="crm-muted">@{h.username}{h.email ? ` · ${h.email}` : ''}{h.is_guest ? ' · guest' : ''}</span></button></li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="crm-alert">{error}</p>}
      {cust.sample && <p className="crm-note">Sample customer. Search above to open a real player: their races, coins, marbles, purchases, support, consents and audit are real; receipts, credit notes and emails sent are samples until billing and the email log are built.</p>}
      {!cust.sample && <p className="crm-note">Real player. Receipt and credit-note numbers, the email log and the alerts' wording are samples. <button type="button" className="crm-linkbtn" onClick={() => setCust(SAMPLE_CUSTOMER)}>Back to the sample</button></p>}

      <div className={`crm-cols${detail ? ' is-detail' : ''}`}>
        <div className="crm-left">
          <section className="crm-card crm-profile">
            <div className="crm-avatar">
              {cust.avatar ? <MarbleBadge slug={cust.avatar} size={96} still /> : <MarbleBadge marble={cust.plain ?? {}} size={96} still />}
            </div>
            <h2>{p.display_name || p.username}</h2>
            <p className="crm-muted">@{p.username}{p.email ? ` · ${p.email}` : ''}</p>
            <dl className="crm-facts">
              <div><dt>Marble ID</dt><dd>{cust.marbleId ?? '—'}</dd></div>
              <div><dt>Account</dt><dd>{p.is_guest ? 'Guest' : 'Saved'}{p.age_group ? ` · ${p.age_group}` : ''}</dd></div>
              <div><dt>Country</dt><dd>{p.first_country ? countryName(p.first_country) ?? p.first_country : '—'}</dd></div>
              <div><dt>Coins</dt><dd>● {num(p.coins)}</dd></div>
              <div><dt>Since</dt><dd>{day(p.created_at)}</dd></div>
              <div><dt>Last played</dt><dd>{when(p.last_login_at)}</dd></div>
            </dl>
          </section>
          {alerts.map((a) => (
            <button key={a.text} type="button" className="crm-strip" onClick={() => pick(a.section)}>
              <Icon name="alert" /> <span>{a.text}</span> <Icon name="chevron" size={18} />
            </button>
          ))}
          <nav className="crm-card crm-list" aria-label="Sections">
            {SECTIONS.map((s) => (
              <button key={s.key} type="button" className={section === s.key ? 'is-on' : undefined} onClick={() => pick(s.key)} aria-current={section === s.key ? 'true' : undefined}>
                <span className="crm-list__ico"><Icon name={s.icon} /></span>
                <span className="crm-list__txt"><b>{s.title}</b><small>{summary(cust, s.key)}</small></span>
                <Icon name="chevron" size={18} />
              </button>
            ))}
          </nav>
        </div>
        <div className="crm-right">
          <button type="button" className="crm-back" onClick={() => setDetail(false)}><Icon name="back" size={18} /> {p.display_name || p.username}</button>
          <h2 className="crm-h2">{SECTIONS.find((s) => s.key === section).title}</h2>
          <SectionDetail c={cust} section={section} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, actions }) {
  return (
    <section className="crm-card crm-block">
      {(title || actions) && <div className="crm-block__head"><h3>{title}</h3>{actions}</div>}
      {children}
    </section>
  );
}

function Rows({ head, rows, empty = 'Nothing yet.' }) {
  if (!rows.length) return <p className="crm-muted">{empty}</p>;
  return (
    <div className="crm-scroll">
      <table className="crm-table">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, k) => <tr key={k}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const Pill = ({ tone, children }) => <span className={`crm-pill${tone ? ` crm-pill--${tone}` : ''}`}>{children}</span>;
const statusTone = { paid: 'good', refunded: 'warn', pending: 'warn', failed: 'bad', new: 'bad', open: 'warn', answered: 'info', closed: undefined, delivered: 'good', opened: 'good', 'not opened': undefined };

function SectionDetail({ c, section }) {
  const p = c.player;
  switch (section) {
    case 'races':
      return (
        <>
          <div className="crm-stats"><div><b>{c.races.last24h}</b><span>races in 24 h</span></div><div><b>{num(p.coins_earned)}</b><span>coins won in all</span></div><div><b>{c.races.recent.filter((r) => r.finish_position && r.finish_position <= 3).length}</b><span>podiums (recent)</span></div></div>
          <Card title="Recent races"><Rows head={['When', 'Track', 'Place', 'Coins', 'Where']} rows={c.races.recent.map((r) => [when(r.finished_at), r.track, place(r.finish_position), num(r.coins_awarded), r.room ? 'Friend room' : 'Public'])} /></Card>
        </>
      );
    case 'coins':
      return (
        <>
          <div className="crm-stats"><div><b>● {num(p.coins)}</b><span>now</span></div><div><b>{num(p.coins_earned)}</b><span>won racing</span></div><div><b>{num(p.coins_bought)}</b><span>bought</span></div></div>
          <Card title="By kind"><Rows head={['Kind', 'Lines', 'Coins']} rows={c.coins.byKind.map((k) => [k.kind, num(k.lines), num(k.coins)])} /></Card>
          <Card title="Coin ledger" actions={<button type="button" className="crm-btn" disabled>Adjust coins</button>}><Rows head={['When', 'Coins', 'What', 'Balance']} rows={c.coins.ledger.slice(0, 12).map((l) => [when(l.created_at), <span className={l.amount < 0 ? 'crm-neg' : 'crm-pos'}>{l.amount > 0 ? '+' : ''}{num(l.amount)}</span>, l.note ?? l.kind, num(l.balance_after)])} /></Card>
        </>
      );
    case 'marbles':
      return (
        <Card title={`${c.marbles.length} marbles`} actions={<button type="button" className="crm-btn" disabled>Give a marble</button>}>
          <div className="crm-marbles">
            {c.marbles.slice(0, 24).map((m, k) => (
              <div key={k} className="crm-marble">
                {m.slug ? <MarbleBadge slug={m.slug} size={56} still /> : <MarbleBadge marble={m.plain ?? {}} size={56} still />}
                <b>{m.slug ? `${ITEM[m.slug]?.design.name ?? m.slug}, ${ITEM[m.slug]?.shade.name ?? ''}` : m.plain?.name ?? 'Original'}</b>
                <small>{m.code ?? m.source}{m.at ? ` · ${day(m.at)}` : ''}</small>
              </div>
            ))}
          </div>
        </Card>
      );
    case 'purchases':
      return (
        <>
          {c.purchases.map((o) => (
            <Card key={o.order_no} title={o.item} actions={<Pill tone={o.refund === 'pending' ? 'warn' : statusTone[o.status]}>{o.refund === 'pending' ? 'refund pending' : o.status}</Pill>}>
              <dl className="crm-kv">
                <div><dt>Order</dt><dd>{o.order_no}</dd></div>
                <div><dt>Paid</dt><dd>{when(o.at)}</dd></div>
                <div><dt>Amount</dt><dd>{money(o.charged, o.currency)}{o.tax != null ? ` (VAT ${money(o.tax, o.currency)})` : ''}</dd></div>
                <div><dt>Through</dt><dd>{o.provider === 'stripe' ? 'Website (Stripe)' : o.provider === 'google' ? 'Google Play' : o.provider === 'apple' ? 'App Store' : o.provider}</dd></div>
                <div><dt>Receipt</dt><dd>{o.receipt ? <Link to="/admin/preview-crm/billing">{o.receipt}</Link> : o.provider === 'stripe' ? '—' : `${o.provider === 'google' ? 'Google' : 'Apple'}'s own (the store sells it)`}</dd></div>
                {o.refunded > 0 && <div><dt>Refunded</dt><dd>{money(o.refunded, o.currency)}</dd></div>}
              </dl>
              {o.provider === 'stripe' && o.status === 'paid' && !o.refund && <div className="crm-actions"><button type="button" className="crm-btn" disabled>Email the receipt again</button><button type="button" className="crm-btn crm-btn--danger" disabled>Refund…</button></div>}
            </Card>
          ))}
          {!c.purchases.length && <p className="crm-muted">No purchases.</p>}
        </>
      );
    case 'refunds':
      return (
        <>
          {c.refunds.map((r) => (
            <Card key={r.order_no + (r.number ?? 'p')} title={r.number ?? 'Credit note follows'} actions={<Pill tone={r.pending ? 'warn' : 'good'}>{r.pending ? 'pending at Stripe' : 'refunded'}</Pill>}>
              <dl className="crm-kv">
                <div><dt>Order</dt><dd>{r.order_no}</dd></div>
                <div><dt>Credits receipt</dt><dd>{r.of ?? '—'}</dd></div>
                <div><dt>Amount</dt><dd>−{money(r.amount, r.currency)}</dd></div>
                <div><dt>When, by</dt><dd>{when(r.at)} · {r.by}</dd></div>
                <div className="crm-kv--wide"><dt>Reason</dt><dd>{r.reason}</dd></div>
                {r.coins != null && <div><dt>Coins taken back</dt><dd>{num(r.coins)}</dd></div>}
              </dl>
            </Card>
          ))}
          {!c.refunds.length && <p className="crm-muted">No refunds.</p>}
          <Card title="Refund a purchase"><p className="crm-muted">Choose the purchase under Purchases & receipts. Full or part, with a reason; Stripe refunds the money, the coins not yet spent are taken back, and a credit note (KR-) is emailed. Finance and owner only.</p></Card>
        </>
      );
    case 'support':
      return (
        <>
          {c.support.map((s) => (
            <Card key={s.ref} title={`${s.ref} · ${s.category}`} actions={<Pill tone={statusTone[s.status]}>{s.status}</Pill>}>
              <p className="crm-quote">{s.message}</p>
              <p className="crm-muted">{when(s.at)} · {s.replies} repl{s.replies === 1 ? 'y' : 'ies'}</p>
              <div className="crm-actions"><button type="button" className="crm-btn" disabled>Open in the inbox</button><button type="button" className="crm-btn" disabled>Reply with a saved reply</button></div>
            </Card>
          ))}
          {!c.support.length && <p className="crm-muted">No support messages.</p>}
        </>
      );
    case 'emails':
      return (
        <Card title="Emails sent" actions={c.sample ? null : <Pill>sample</Pill>}>
          <Rows head={['When', 'Kind', 'Subject', 'Status']} rows={c.emails.map((e) => [when(e.at), e.kind, e.subject, <Pill tone={statusTone[e.status]}>{e.status}</Pill>])} />
        </Card>
      );
    case 'consents':
      return (
        <Card title="Consents and choices">
          <Rows head={['What', 'Now', 'How', 'When']} rows={c.consents.map((x) => [x.what, <b>{x.value}</b>, x.how, when(x.at)])} />
          <div className="crm-actions"><button type="button" className="crm-btn" disabled>Turn news off (support)</button></div>
        </Card>
      );
    case 'security':
      return (
        <>
          <Card title="Sign-in and purchase events"><Rows head={['When', 'What', 'Country']} rows={c.security.map((e) => [when(e.at ?? e.created_at), e.kind, e.country ?? '—'])} /><p className="crm-muted">IP addresses stay on their own audited view (kept 90 days).</p></Card>
          <Card title="Admin actions on this account"><Rows head={['When', 'Admin', 'Action', 'Reason']} rows={c.audit.map((a) => [when(a.at), a.admin ?? '—', a.action, a.reason])} /></Card>
        </>
      );
    default:
      return null;
  }
}

// ── Billing ──────────────────────────────────────────────────────────────────

function Billing() {
  const [kind, setKind] = useState('all');
  const [sel, setSel] = useState(SAMPLE_DOCUMENTS[0].number);
  const [detail, setDetail] = useState(false);
  const docs = SAMPLE_DOCUMENTS.filter((d) => kind === 'all' || d.kind === kind);
  const doc = SAMPLE_DOCUMENTS.find((d) => d.number === sel);
  const totals = useMemo(() => SAMPLE_DOCUMENTS.reduce((t, d) => ({ sek: t.sek + d.sek, fee: t.fee + d.fee, n: t.n + 1 }), { sek: 0, fee: 0, n: 0 }), []);
  return (
    <div className="crm-page">
      <p className="crm-note">Sample documents: receipts and credit notes don't exist until billing is built (phase 1 of the plan).</p>
      <div className="crm-stats">
        <div><b>{money(totals.sek, 'SEK')}</b><span>November so far, net of refunds</span></div>
        <div><b>{money(totals.fee, 'SEK')}</b><span>Stripe fees</span></div>
        <div><b>{totals.n}</b><span>documents</span></div>
        <div className="crm-stats__act"><button type="button" className="crm-btn crm-btn--primary" disabled>Monthly export…</button></div>
      </div>
      <div className={`crm-cols${detail ? ' is-detail' : ''}`}>
        <div className="crm-left">
          <div className="crm-chips" role="tablist" aria-label="Documents">
            {[['all', 'All'], ['receipt', 'Receipts'], ['credit', 'Credit notes']].map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}>{label}</button>
            ))}
          </div>
          <nav className="crm-card crm-list" aria-label="Receipts and credit notes">
            {docs.map((d) => {
              const gross = d.lines.reduce((s, l) => s + l.gross, 0);
              return (
                <button key={d.number} type="button" className={sel === d.number ? 'is-on' : undefined} onClick={() => { setSel(d.number); setDetail(true); if (window.matchMedia?.('(max-width: 820px)').matches) window.scrollTo(0, 0); }}>
                  <span className={`crm-list__ico${d.kind === 'credit' ? ' crm-list__ico--credit' : ''}`}><Icon name={d.kind === 'credit' ? 'refund' : 'receipt'} /></span>
                  <span className="crm-list__txt"><b>{d.number}</b><small>{d.customer} · {d.order_no} · {when(d.at)}</small></span>
                  <span className={`crm-amt${gross < 0 ? ' crm-neg' : ''}`}>{money(gross, d.currency)}</span>
                  <Icon name="chevron" size={18} />
                </button>
              );
            })}
          </nav>
        </div>
        <div className="crm-right">
          <button type="button" className="crm-back" onClick={() => setDetail(false)}><Icon name="back" size={18} /> Documents</button>
          <Document d={doc} />
        </div>
      </div>
    </div>
  );
}

function Document({ d }) {
  const gross = d.lines.reduce((s, l) => s + l.gross, 0);
  const net = d.lines.reduce((s, l) => s + l.net, 0);
  const vat = d.lines.reduce((s, l) => s + l.vat, 0);
  const credit = d.kind === 'credit';
  return (
    <>
      <section className="crm-card crm-doc">
        <div className="crm-doc__head">
          <div>
            <span className="crm-doc__kind">{credit ? 'Credit note' : 'Receipt'}</span>
            <h2>{d.number}</h2>
            <p className="crm-muted">{day(d.at)} · order {d.order_no}{credit ? ` · credits ${d.of}` : ''}</p>
          </div>
          <div className="crm-doc__seller">
            <b>{SELLER.name}</b>
            <span>Org.nr {SELLER.orgNo} · VAT no {SELLER.vatNo}</span>
            <span>{SELLER.street}, {SELLER.postcode} {SELLER.city}, {SELLER.country}</span>
            <span>Godkänd för F-skatt</span>
          </div>
        </div>
        <dl className="crm-kv">
          <div><dt>Customer</dt><dd>{d.customer} · {d.email}</dd></div>
          <div><dt>Country (VAT)</dt><dd>{countryName(d.country) ?? d.country}</dd></div>
          <div><dt>Paid with</dt><dd>Card through Stripe</dd></div>
          {credit && <div className="crm-kv--wide"><dt>Reason</dt><dd>{d.reason}</dd></div>}
        </dl>
        <div className="crm-scroll">
          <table className="crm-table crm-table--doc">
            <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Excl. VAT</th><th className="num">VAT</th><th className="num">Total</th></tr></thead>
            <tbody>
              {d.lines.map((l) => (
                <tr key={l.item}><td>{l.item}</td><td className="num">{l.qty}</td><td className="num">{money(l.net, d.currency)}</td><td className="num">{l.rate ? `${l.rate}% · ${money(l.vat, d.currency)}` : '—'}</td><td className="num">{money(l.gross, d.currency)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="crm-doc__total">
          <span>Excl. VAT <b>{money(net, d.currency)}</b></span>
          <span>VAT <b>{money(vat, d.currency)}</b></span>
          <span className="crm-doc__grand">{credit ? 'To refund' : 'Total paid'} <b>{money(gross, d.currency)}</b></span>
        </div>
        {d.vatNote && <p className="crm-muted">{d.vatNote}</p>}
        <p className="crm-muted crm-doc__foot">Questions: {SELLER.supportEmail} · marblespins.com/purchases</p>
      </section>
      <Card title="For the books">
        <dl className="crm-kv">
          <div><dt>In SEK (Stripe)</dt><dd>{money(d.sek, 'SEK')}</dd></div>
          <div><dt>Stripe fee</dt><dd>{money(d.fee, 'SEK')}</dd></div>
          <div><dt>VAT country, rate</dt><dd>{d.country} · {d.lines[0].rate}%{d.country !== 'SE' && d.lines[0].rate ? ' (OSS)' : ''}</dd></div>
          <div><dt>Sent to the customer</dt><dd>{when(d.at)} · delivered</dd></div>
        </dl>
        <div className="crm-actions">
          <button type="button" className="crm-btn" disabled>Open as the customer sees it</button>
          <button type="button" className="crm-btn" disabled>Email again</button>
          <button type="button" className="crm-btn" disabled>Open the customer</button>
          {!credit && !d.refund && <button type="button" className="crm-btn crm-btn--danger" disabled>Refund…</button>}
        </div>
      </Card>
    </>
  );
}

// ── Pages not designed yet ───────────────────────────────────────────────────

const LATER = {
  dashboard: { text: 'Stays as today, in the new frame.', live: '/admin/dashboard' },
  support: { text: 'The inbox (new, open, answered, closed), saved replies, each message beside its customer: designed next, after Customers and Billing.', live: '/admin/support' },
  marketing: { text: 'Email templates (preview, test-send), onboarding, newsletters to segments, in-game messages: plan phases 5–7.', live: '/admin/emails' },
  tracks: { text: 'Race readiness and the economy, as today.', live: '/admin/readiness' },
  settings: { text: 'Admin users and roles (owner, finance, support, marketing, read-only), company details for receipts, the audit log.', live: '/admin/audit' },
};
function Later({ page }) {
  const l = LATER[page];
  return (
    <section className="crm-card crm-block crm-later">
      <h2>Not in this preview</h2>
      <p>{l.text}</p>
      <Link to={l.live} className="crm-btn">Open today's page</Link>
    </section>
  );
}
