import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { adminApi, saveCsv } from './adminApi';
import { ITEM } from '../shared/marbles';
import MarbleBadge from '../site/marbles/MarbleBadge';
import { countryName } from '../site/country/countries';
import BillingDocument, { docMoney } from '../shared/billing/BillingDocument';
import company from '../shared/company.json';
import { EmailTemplates } from './CrmEmails';
import { SupportPage } from './CrmSupport';
import { MarketingRules, Newsletters, Onboarding } from './CrmMarketing';
import { DashboardPage } from './CrmDashboard';
import { TracksPage } from './CrmTracks';
import { TOOLS, ToolsPage } from './CrmTools';
import { DEVICE_FILTERS, deviceText } from './devices';
import './crm.css';

/**
 * The CRM (Moses, 16 Nov 2026; design approved at the preview, the plan: claude/crm-plan.md in the project):
 * /admin/crm/*, the back office's new layout. A sidebar; the customer page and Billing in two columns (a list on
 * the left, the chosen item on the right; phones: one at a time); Settings (admins and roles, company details,
 * the audit log). Each admin sees only what their role may do (`permissions`, from the server, which refuses the
 * rest either way). Since 17 Nov 2026 every page of the classic back office is here too (the Dashboard, Races &
 * tracks, Tools); the classic pages (/admin/dashboard …) keep working until Moses approves the move.
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
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  building: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  tools: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
};
export function Icon({ name, size = 20 }) {
  return (
    <svg className="crm-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

// ── Formatting ───────────────────────────────────────────────────────────────
export const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' }) : '—');
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Stockholm' }) : '—');
const num = (n) => Number(n ?? 0).toLocaleString('en-GB');
const money = docMoney;
const place = (n) => (n ? `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}` : '—');
const thisMonth = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' }).slice(0, 7);
const isPhone = () => window.matchMedia?.('(max-width: 820px)').matches;
export const toTop = () => { if (isPhone()) window.scrollTo(0, 0); };

export const BASE = '/admin/crm';
const ROLE_NAMES = { owner: 'Owner', finance: 'Finance', support: 'Support', marketing: 'Marketing', 'read-only': 'Read-only' };
const ROLE_TEXT = {
  owner: 'Everything, including admins and roles, the audit log and exports of email addresses.',
  finance: 'Customers (read), purchases, refunds, billing and its export.',
  support: 'Customers (read, rename, suspend, news off, security), the support inbox and names. No refunds, coins, exports or deletions.',
  marketing: 'Reports and gift codes (read). Campaigns come later. Never email addresses.',
  'read-only': 'The dashboard and reports.',
};

// The sidebar; `need` hides an item from a role that can't open it (a list: any one of them).
const NAV = [
  { to: 'dashboard', icon: 'dashboard', label: 'Dashboard', need: 'reports:read' },
  { to: 'customers', icon: 'customers', label: 'Customers', need: 'customers:read' },
  { to: 'billing', icon: 'billing', label: 'Billing', need: 'billing:read' },
  { to: 'support', icon: 'support', label: 'Support', need: 'support:read' },
  { to: 'marketing', icon: 'marketing', label: 'Marketing', need: ['marketing:read', 'emails:templates', 'gift-codes:read'] },
  { to: 'tracks', icon: 'tracks', label: 'Races & tracks', need: 'reports:read' },
  { to: 'tools', icon: 'tools', label: 'Tools', need: TOOLS.map((t) => t.need) },
  { to: 'settings', icon: 'settings', label: 'Settings', need: 'reports:read' },
];

/** The admin's permissions. A session from before roles (no list) shows everything; the server decides. */
function usePermissions(session) {
  const [me, setMe] = useState(session?.user ?? {});
  useEffect(() => { adminApi.session().then((r) => setMe(r.user), () => {}); }, []);
  const list = me.permissions;
  const can = useCallback((p) => !list || [].concat(p).some((x) => list.includes(x)), [list]);
  return { me, can };
}

export default function Crm({ session, onLogout }) {
  const { pathname } = useLocation();
  const { me, can } = usePermissions(session);
  const rest = pathname.slice(BASE.length).replace(/^\//, '');
  const [page, ...sub] = rest.split('/');
  const nav = NAV.filter((n) => can(n.need));
  const current = NAV.find((n) => n.to === page);
  if (!current) return <Navigate to={`${BASE}/${nav[0]?.to ?? 'settings'}`} replace />;
  return (
    <div className="crm">
      <aside className="crm-side">
        <div className="crm-brand"><span className="crm-logo" aria-hidden="true" /> Marble Spins</div>
        <nav className="crm-nav" aria-label="Back office">
          {nav.map((n) => (
            <NavLink key={n.to} to={`${BASE}/${n.to}`} className={({ isActive }) => (isActive ? 'is-on' : undefined)}>
              <Icon name={n.icon} /> <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="crm-side__foot">
          <a href="/help" className="crm-help"><Icon name="help" /> <span>Help</span></a>
          <div className="crm-me">
            <span className="crm-me__av" aria-hidden="true">{(me.username ?? 'A').slice(0, 1).toUpperCase()}</span>
            <span className="crm-me__txt"><b>{me.username ?? 'admin'}</b><small>{ROLE_NAMES[me.role] ?? 'Admin'} · <button type="button" onClick={onLogout}>Log out</button></small></span>
          </div>
        </div>
      </aside>
      <div className="crm-body">
        <header className="crm-top">
          <h1>{current.label}</h1>
          <span className="crm-grow" />
          <Link to="/admin/dashboard" className="crm-toplink">Classic back office</Link>
        </header>
        <main className="crm-main">
          {!can(current.need) && <p className="crm-alert">Your role ({ROLE_NAMES[me.role] ?? me.role}) can't open {current.label}.</p>}
          {can(current.need) && page === 'customers' && <Customers id={sub[0]} can={can} />}
          {can(current.need) && page === 'billing' && <Billing number={sub[0] ? decodeURIComponent(sub[0]) : null} can={can} />}
          {can(current.need) && page === 'settings' && <Settings tab={sub[0]} can={can} me={me} />}
          {can(current.need) && page === 'support' && <SupportPage id={sub[0]} can={can} me={me} />}
          {can(current.need) && page === 'marketing' && <Marketing tab={sub[0]} kind={sub[1]} can={can} />}
          {can(current.need) && page === 'dashboard' && <DashboardPage can={can} />}
          {can(current.need) && page === 'tracks' && <TracksPage tab={sub[0]} can={can} />}
          {can(current.need) && page === 'tools' && <ToolsPage tab={sub[0]} sub={sub[1]} can={can} />}
        </main>
      </div>
    </div>
  );
}

// ── Small parts ──────────────────────────────────────────────────────────────

export function Card({ title, children, actions }) {
  return (
    <section className="crm-card crm-block">
      {(title || actions) && <div className="crm-block__head"><h3>{title}</h3>{actions}</div>}
      {children}
    </section>
  );
}

export function Rows({ head, rows, empty = 'Nothing yet.', wrap = false }) {
  if (!rows.length) return <p className="crm-muted">{empty}</p>;
  return (
    <div className="crm-scroll">
      <table className={`crm-table${wrap ? ' crm-table--wrap' : ''}`}>
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, k) => <tr key={k}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export const Pill = ({ tone, children }) => <span className={`crm-pill${tone ? ` crm-pill--${tone}` : ''}`}>{children}</span>;
const statusTone = { paid: 'good', refunded: 'warn', pending: 'warn', failed: 'bad', new: 'bad', open: 'warn', answered: 'info', closed: undefined };

/**
 * An action that needs a reason (and maybe more fields), confirmed on the page: the button opens a small form;
 * "Confirm" runs `run(values)`; its answer (or error) shows under it.
 */
export function ReasonAction({ label, danger, fields = [], confirm = 'Confirm', run, done }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ reason: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const out = await run(v);
      setMsg({ ok: true, text: typeof out === 'string' ? out : 'Done.' });
      setOpen(false); setV({ reason: '' });
      done?.();
    } catch (err) { setMsg({ ok: false, text: err.message }); }
    setBusy(false);
  };
  return (
    <div className="crm-ra">
      {!open && <button type="button" className={`crm-btn${danger ? ' crm-btn--danger' : ''}`} onClick={() => { setOpen(true); setMsg(null); }}>{label}</button>}
      {open && (
        <form className="crm-form" onSubmit={submit}>
          {fields.map((f) => (
            <label key={f.key}>
              <span>{f.label}</span>
              {f.options
                ? <select value={v[f.key] ?? f.options[0][0]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}>{f.options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}</select>
                : <input value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} placeholder={f.placeholder} inputMode={f.inputMode} required={f.required} />}
            </label>
          ))}
          <label><span>Reason (kept in the audit log)</span><input value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} minLength={5} required placeholder="At least 5 characters" /></label>
          <div className="crm-actions">
            <button type="submit" className={`crm-btn ${danger ? 'crm-btn--danger' : 'crm-btn--primary'}`} disabled={busy || v.reason.trim().length < 5}>{busy ? 'Working…' : confirm}</button>
            <button type="button" className="crm-btn" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}
      {msg && <p className={msg.ok ? 'crm-ok' : 'crm-alert'} role="status">{msg.text}</p>}
    </div>
  );
}

// ── Customers ────────────────────────────────────────────────────────────────

const PROVIDER = { stripe: 'Website (Stripe)', google: 'Google Play', apple: 'App Store' };
const product = (p) => (p.product_id ?? '').replace(/^trackpack-/, 'Track pack: ').replace(/^coins-(\d+)/, (_, n) => `${num(n)} coins`).replace(/^holiday-pass-2026$/, 'Holiday Season Pass 2026');

/** GET /admin/players/:id in the customer page's shape. */
function customerOf(d) {
  const firstMarble = d.marbles.collection.find((m) => ITEM[m.item_slug]) ?? null;
  const docs = d.documents ?? [];
  const purchases = d.payments.map((p) => ({
    id: p.id,
    order_no: p.order_no ?? p.provider_ref ?? '—',
    item: product(p),
    provider: p.provider,
    status: p.status,
    test: Boolean(p.test), // (a test order: not charged, no receipt, in no total. Moses, 18 Nov 2026)
    refunded: p.refunded_cents || 0,
    charged: p.charged_cents ?? p.amount_cents,
    currency: (p.charged_currency ?? p.currency ?? '').toUpperCase(),
    tax: p.tax_cents,
    at: p.paid_at ?? p.created_at,
    receipt: docs.find((x) => x.payment_id === p.id && x.kind === 'receipt') ?? null,
    credits: docs.filter((x) => x.payment_id === p.id && x.kind === 'credit'),
  }));
  return {
    player: d.player,
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
    credits: docs.filter((x) => x.kind === 'credit').map((x) => ({ ...x, order_no: purchases.find((p) => p.id === x.payment_id)?.order_no ?? '—', of: purchases.find((p) => p.id === x.payment_id)?.receipt?.number ?? null })),
    support: d.messages.map((m) => ({ id: m.id, ref: m.ref, category: m.category, status: m.stage ?? (m.status === 'done' ? 'closed' : m.status), message: m.message, at: m.created_at, replies: m.replies })),
    consents: [
      { what: 'News by email', value: d.player.marketing_opt_in ? 'Yes' : 'No', how: d.consents[0] ? `Last change: ${d.consents[0].source}` : 'Never asked', at: d.consents[0]?.created_at },
      ...d.consents.slice(1, 6).map((c) => ({ what: 'News by email (earlier)', value: c.consent ? 'Yes' : 'No', how: c.source, at: c.created_at })),
    ],
    security: d.security.events,
    audit: d.audit.map((a) => ({ action: a.action, admin: a.admin, reason: a.reason, at: a.created_at })),
    emails: d.emails ?? [],
    devices: d.devices ?? null, // (null: a server from before 20 Nov 2026)
    overview: d.overview ?? { spend: [], website: [], sek: { cents: 0, paid: 0, refunded: 0, fees: 0, missing: 0, documents: [] }, packs: [], passes: [] },
  };
}

const SECTIONS = [
  { key: 'overview', icon: 'user', title: 'Overview' },
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
    case 'overview': return `${c.overview.spend.length ? `Spent ${c.overview.spend.map((x) => money(x.cents, x.currency)).join(' + ')}` : 'No purchases'} · ${c.overview.packs.length} pack${c.overview.packs.length === 1 ? '' : 's'}${c.overview.passes.length ? ' · pass' : ''}`;
    case 'races': return `${num(c.races.recent.length)} recent · ${c.races.last24h} in the last 24 h · last ${c.races.recent[0]?.track ?? 'none yet'}`;
    case 'coins': return `${num(c.player.coins)} now · ${num(c.player.coins_earned)} won · ${num(c.player.coins_bought)} bought`;
    case 'marbles': return `${c.marbles.length} marble${c.marbles.length === 1 ? '' : 's'}${c.marbles[0]?.slug ? ` · newest ${ITEM[c.marbles[0].slug]?.design.name ?? ''}` : ''}`;
    case 'purchases': return c.purchases.length ? `${c.purchases.length} purchase${c.purchases.length === 1 ? '' : 's'} · last ${c.purchases[0].item}` : 'No purchases';
    case 'refunds': return c.credits.length ? `${c.credits.length} credit note${c.credits.length === 1 ? '' : 's'}` : c.purchases.some((p) => p.refunded) ? 'Refunds from before credit notes' : 'None';
    case 'support': return c.support.length ? `${c.support.length} message${c.support.length === 1 ? '' : 's'} · ${c.support[0].ref} ${c.support[0].status}` : 'No messages';
    case 'emails': return c.emails.length ? `${c.emails.length} sent · last “${c.emails[0].subject}”` : 'None logged yet';
    case 'consents': return `News by email: ${c.consents[0]?.value ?? '—'}`;
    case 'security': return `${c.security.length} sign-in events · ${c.audit.length} admin actions`;
    default: return '';
  }
}

function alertsOf(c) {
  const out = [];
  if (c.player.suspended_at) out.push({ text: `Suspended since ${day(c.player.suspended_at)}.`, section: 'security' });
  if (c.player.deleted_at) out.push({ text: `Account deleted ${day(c.player.deleted_at)}.`, section: 'security' });
  const open = c.support.find((s) => s.status === 'new' || s.status === 'open');
  if (open) out.push({ text: `Support ${open.ref} is waiting for us.`, section: 'support' });
  const pending = c.purchases.find((p) => p.status === 'pending');
  if (pending) out.push({ text: `Order ${pending.order_no} is waiting for payment.`, section: 'purchases' });
  return out;
}

function Customers({ id, can }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState(null);
  const [cust, setCust] = useState(null);
  const [section, setSection] = useState('overview');
  const [detail, setDetail] = useState(false);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState(null);
  const [filters, setFilters] = useState({}); // (the players list's device filter, 20 Nov 2026)

  useEffect(() => {
    if (q.trim().length < 2) { setHits(null); return undefined; }
    const t = setTimeout(() => {
      // (An exact order, receipt, support reference or Marble ID opens its customer at once.)
      adminApi.players(q.trim()).then((r) => (r.exact ? open(r.players[0].id) : setHits(r.players.slice(0, 8))), (e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    if (!id) { setCust(null); return; }
    setError(null);
    try { setCust(customerOf(await adminApi.player(id))); } catch (e) { setError(e.message); }
  }, [id]);
  useEffect(() => { load(); setDetail(false); }, [load]);
  const filtered = Object.values(filters).some(Boolean);
  useEffect(() => { if (!id && !recent) adminApi.players('', filters).then((r) => setRecent(r.players.slice(0, filtered ? 50 : 12)), (e) => setError(e.message)); }, [id, recent, filters, filtered]);
  const filterBy = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setRecent(null); };

  const open = (pid) => { setHits(null); setQ(''); navigate(`${BASE}/customers/${pid}`); };
  const pick = (key) => { setSection(key); setDetail(true); toTop(); };

  return (
    <div className="crm-page">
      <div className="crm-search">
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, Marble ID, order (MS-1042), receipt (K-2026-00002) or support ref (S-1043)" aria-label="Find a customer" />
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
      {!id && (
        <Card title={filtered ? 'Players by device' : 'Players who played last'}>
          <div className="crm-filters" role="group" aria-label="Filter by device">
            {DEVICE_FILTERS.map(([key, label, options]) => (
              <select key={key} aria-label={label} value={filters[key] ?? ''} onChange={(e) => filterBy(key, e.target.value)}>
                <option value="">{label}: all</option>
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            {filtered && <button type="button" className="crm-btn" onClick={() => { setFilters({}); setRecent(null); }}>Clear</button>}
          </div>
          {!recent && <p className="crm-muted">Loading…</p>}
          {recent && recent.length === 0 && <p className="crm-muted">Nobody with that device.</p>}
          {recent && (
            <nav className="crm-list crm-list--flat" aria-label="Recent players">
              {recent.map((h) => (
                <button key={h.id} type="button" onClick={() => open(h.id)}>
                  <span className="crm-list__ico"><Icon name="user" /></span>
                  <span className="crm-list__txt"><b>{h.display_name || h.username}</b><small>@{h.username}{h.is_guest ? ' · guest' : ''} · {when(h.last_login_at)}{h.device ? ` · ${deviceText(h.device)}` : ''}</small></span>
                  <Icon name="chevron" size={18} />
                </button>
              ))}
            </nav>
          )}
        </Card>
      )}
      {id && !cust && !error && <p className="crm-muted">Loading…</p>}
      {cust && (
        <div className={`crm-cols${detail ? ' is-detail' : ''}`}>
          <div className="crm-left">
            <section className="crm-card crm-profile">
              <div className="crm-avatar">
                {cust.avatar ? <MarbleBadge slug={cust.avatar} size={96} still /> : <MarbleBadge marble={cust.plain ?? {}} size={96} still />}
              </div>
              <h2>{cust.player.display_name || cust.player.username}</h2>
              <p className="crm-muted">@{cust.player.username}{cust.player.email ? ` · ${cust.player.email}` : ''}</p>
              <dl className="crm-facts">
                <div><dt>Marble ID</dt><dd>{cust.marbleId ?? '—'}</dd></div>
                <div><dt>Account</dt><dd>{cust.player.is_guest ? 'Guest' : 'Saved'}{cust.player.age_group ? ` · ${cust.player.age_group}` : ''}</dd></div>
                <div><dt>Country</dt><dd>{cust.player.first_country ? countryName(cust.player.first_country) ?? cust.player.first_country : '—'}</dd></div>
                <div><dt>Coins</dt><dd>● {num(cust.player.coins)}</dd></div>
                <div><dt>Since</dt><dd>{day(cust.player.created_at)}</dd></div>
                <div><dt>Last played</dt><dd>{when(cust.player.last_login_at)}</dd></div>
                {cust.devices && <div><dt>Device</dt><dd>{deviceText(cust.devices[0])}</dd></div>}
              </dl>
            </section>
            {alertsOf(cust).map((a) => (
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
            <button type="button" className="crm-back" onClick={() => setDetail(false)}><Icon name="back" size={18} /> {cust.player.display_name || cust.player.username}</button>
            <h2 className="crm-h2">{SECTIONS.find((s) => s.key === section).title}</h2>
            <SectionDetail c={cust} section={section} can={can} reload={load} />
          </div>
        </div>
      )}
    </div>
  );
}

function DocLink({ d, can }) {
  if (!d) return '—';
  return can('billing:read') ? <Link to={`${BASE}/billing/${encodeURIComponent(d.number)}`}>{d.number}</Link> : d.number;
}

function SectionDetail({ c, section, can, reload }) {
  const p = c.player;
  switch (section) {
    case 'overview': {
      const o = c.overview;
      return (
        <>
          <div className="crm-stats">
            <div><b>{o.website?.length ? o.website.map((x) => money(x.cents, x.currency)).join(' + ') : '—'}</b><span>spent on the website, after refunds{o.website?.some((x) => x.refunded_cents) ? ` (paid ${o.website.map((x) => money(x.paid_cents, x.currency)).join(' + ')}, refunded ${o.website.map((x) => money(x.refunded_cents, x.currency)).join(' + ')})` : ''}</span></div>
            <div><b>{o.spend.reduce((n, x) => n + x.purchases, 0)}</b><span>purchases (website and apps)</span></div>
            <div><b>{o.packs.length}</b><span>track packs</span></div>
          </div>
          <Card title="Account">
            <dl className="crm-kv">
              <div><dt>Account</dt><dd>{p.is_guest ? 'Guest (no email)' : 'Saved'}{p.deleted_at ? ' · deleted' : ''}{p.suspended_at ? ' · suspended' : ''}{p.is_staff ? ' · staff' : ''}</dd></div>
              <div><dt>Age group</dt><dd>{p.age_group ?? '—'}{p.age_group === '13-17' ? ' (no marketing)' : ''}</dd></div>
              <div><dt>Country (first visit)</dt><dd>{p.first_country ? countryName(p.first_country) ?? p.first_country : '—'}</dd></div>
              <div><dt>Since</dt><dd>{day(p.created_at)}</dd></div>
              <div><dt>Last played</dt><dd>{when(p.last_login_at)}</dd></div>
              <div><dt>News by email</dt><dd>{p.marketing_opt_in ? 'Yes' : 'No'}</dd></div>
            </dl>
          </Card>
          <Card title="Spent">
            <Rows head={['Currency', 'Purchases', 'Paid', 'Refunded', 'Net', 'Last']} rows={o.spend.map((x) => [x.currency, x.purchases, money(x.paid_cents, x.currency), x.refunded_cents ? money(x.refunded_cents, x.currency) : '—', money(x.cents, x.currency), day(x.last_paid_at)])} empty="Nothing bought." />
            {o.sek.documents?.length > 0 && (
              <>
                <p className="crm-muted">In SEK, as Stripe booked it (its rate on each day): paid {money(o.sek.paid, 'SEK')}, refunded {money(o.sek.refunded, 'SEK')}, net {money(o.sek.cents, 'SEK')}; Stripe's fees {money(o.sek.fees, 'SEK')}. A refund is converted on its own day, so a fully refunded order can leave a small SEK difference.</p>
                <Rows head={['Document', 'Order', 'Amount', 'In SEK', 'SEK per unit']} rows={o.sek.documents.map((d) => [
                  <DocLink key={d.number} d={d} can={can} />, d.orderNo ?? '—', money(d.kind === 'receipt' ? d.cents : -Math.abs(d.cents), d.currency), d.sekCents == null ? 'waiting for Stripe' : money(d.sekCents, 'SEK'),
                  d.rate == null ? '—' : <span style={d.odd ? { color: 'var(--c-bad)', fontWeight: 700 } : undefined} title={d.odd ? 'This rate is unlikely: check the SEK amount against the balance transaction in Stripe' : undefined}>{d.rate.toFixed(2)}{d.odd ? ' · check' : ''}</span>,
                ])} />
              </>
            )}
            {o.sek.missing > 0 && <p className="crm-muted">{o.sek.missing} website document(s) still waiting for their SEK amount from Stripe.</p>}
            <p className="crm-muted">App purchases are in US dollars here (the stores' own amounts are in their reports).</p>
          </Card>
          {c.devices && (
            <Card title="Devices & browsers">
              <Rows head={['Device', 'System', 'Browser', 'App or web', 'First seen', 'Last seen']} rows={c.devices.map((d) => [{ phone: 'Phone', tablet: 'Tablet', computer: 'Computer' }[d.device] ?? d.device, d.os, d.browser, d.clientLabel, day(d.firstSeenAt), when(d.lastSeenAt)])} empty="None recorded yet (recorded at login and when the app or website opens, since 20 Nov 2026)." />
              <p className="crm-muted">The last 5, from what the browser says about itself: device type, system and browser with their main version, app or website. Never the full user agent.</p>
            </Card>
          )}
          <Card title="Owns">
            <Rows head={['What', 'Through', 'Since']} rows={[...o.packs.map((x) => [`${x.name} pack`, PROVIDER[x.provider] ?? x.provider, day(x.granted_at)]), ...o.passes.map((x) => [`Season pass (${x.season_key})`, PROVIDER[x.provider] ?? x.provider, day(x.granted_at)])]} empty="No packs or passes." />
          </Card>
        </>
      );
    }
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
          <Card
            title="Coin ledger"
            actions={can('coins:adjust') ? (
              <ReasonAction
                label="Adjust coins"
                fields={[{ key: 'amount', label: 'Coins (minus to take)', placeholder: 'e.g. 100 or -50', inputMode: 'numeric', required: true }]}
                run={async (v) => { const n = Math.trunc(Number(v.amount)); if (!n) throw new Error('Give a number of coins'); const r = await adminApi.coins(p.id, n, v.reason.trim()); return `Done: the balance is now ● ${num(r.balance)}.`; }}
                done={reload}
              />
            ) : null}
          >
            <Rows head={['When', 'Coins', 'What', 'Balance']} rows={c.coins.ledger.slice(0, 20).map((l) => [when(l.created_at), <span className={l.amount < 0 ? 'crm-neg' : 'crm-pos'}>{l.amount > 0 ? '+' : ''}{num(l.amount)}</span>, l.note ?? l.kind, num(l.balance_after)])} />
          </Card>
        </>
      );
    case 'marbles':
      return (
        <Card title={`${c.marbles.length} marbles`}>
          <div className="crm-marbles">
            {c.marbles.slice(0, 36).map((m, k) => (
              <div key={k} className="crm-marble">
                {m.slug ? <MarbleBadge slug={m.slug} size={56} still /> : <MarbleBadge marble={m.plain ?? {}} size={56} still />}
                <b>{m.slug ? `${ITEM[m.slug]?.design.name ?? m.slug}, ${ITEM[m.slug]?.shade.name ?? ''}` : m.plain?.name ?? 'Original'}</b>
                <small>{m.code ?? m.source}{m.at ? ` · ${day(m.at)}` : ''}</small>
              </div>
            ))}
          </div>
          <p className="crm-muted">Give or take marbles in the <Link to={`/admin/players/${p.id}`}>classic player page</Link>.</p>
        </Card>
      );
    case 'purchases':
      return (
        <>
          {c.purchases.map((o) => (
            <Card key={o.id} title={o.item} actions={o.test ? <Pill tone="info">Test · not charged</Pill> : <Pill tone={statusTone[o.status]}>{o.refunded && o.status === 'paid' ? 'part refunded' : o.status}</Pill>}>
              <dl className="crm-kv">
                <div><dt>Order</dt><dd>{o.order_no}</dd></div>
                <div><dt>Paid</dt><dd>{when(o.at)}</dd></div>
                <div><dt>Amount</dt><dd>{money(o.charged, o.currency)}{o.tax != null ? ` (VAT ${money(o.tax, o.currency)})` : ''}</dd></div>
                <div><dt>Through</dt><dd>{PROVIDER[o.provider] ?? o.provider}</dd></div>
                <div><dt>Receipt</dt><dd>{o.test ? 'None: a test order, not charged (left out of sales, VAT and the exports)' : o.receipt ? <DocLink d={o.receipt} can={can} /> : o.provider === 'stripe' ? (o.status === 'pending' ? 'When paid' : '— (issued at the next start-up)') : `${o.provider === 'google' ? 'Google' : 'Apple'}'s own (the store sells it)`}</dd></div>
                {o.refunded > 0 && <div><dt>Refunded</dt><dd>{money(o.refunded, o.currency)}{o.credits.length ? <> · {o.credits.map((x) => <DocLink key={x.number} d={x} can={can} />)}</> : ''}</dd></div>}
              </dl>
              {can('payments:refund') && !o.test && o.status === 'paid' && o.charged > o.refunded && (
                <ReasonAction
                  label="Refund…"
                  danger
                  confirm="Refund now"
                  fields={[{ key: 'amount', label: `Amount in ${o.currency} (empty: the rest, ${money(o.charged - o.refunded, o.currency)})`, placeholder: 'e.g. 4.99', inputMode: 'decimal' }]}
                  run={async (v) => {
                    const cents = v.amount?.trim() ? Math.round(Number(v.amount.replace(',', '.')) * 100) : null;
                    if (cents != null && !(cents > 0)) throw new Error('Give an amount, or leave it empty for the rest');
                    await adminApi.refund(o.id, v.reason.trim(), cents);
                    return o.provider === 'stripe' ? 'Refunded. The credit note is emailed to the customer.' : 'Refund asked for at the store.';
                  }}
                  done={reload}
                />
              )}
            </Card>
          ))}
          {!c.purchases.length && <p className="crm-muted">No purchases.</p>}
        </>
      );
    case 'refunds':
      return (
        <>
          {c.credits.map((r) => (
            <Card key={r.number} title={<DocLink d={r} can={can} />} actions={<Pill tone="warn">credit note</Pill>}>
              <dl className="crm-kv">
                <div><dt>Order</dt><dd>{r.order_no}</dd></div>
                <div><dt>Credits receipt</dt><dd>{r.of ?? '—'}</dd></div>
                <div><dt>Amount</dt><dd>{money(r.gross_cents, r.currency)}</dd></div>
                <div><dt>Issued</dt><dd>{when(r.issued_at)}{r.emailed_at ? ' · emailed' : ''}</dd></div>
                {r.reason && <div className="crm-kv--wide"><dt>Reason</dt><dd>{r.reason}</dd></div>}
              </dl>
            </Card>
          ))}
          {!c.credits.length && <p className="crm-muted">No credit notes.{c.purchases.some((p) => p.refunded) ? ' (Refunds from before credit notes are under Purchases and in the audit log.)' : ''}</p>}
          {can('payments:refund') && <p className="crm-muted">To refund, choose the purchase under Purchases & receipts.</p>}
        </>
      );
    case 'support':
      return (
        <>
          {c.support.map((s) => (
            <Card key={s.ref} title={`${s.ref} · ${s.category}`} actions={<Pill tone={statusTone[s.status]}>{s.status}</Pill>}>
              <p className="crm-quote">{s.message}</p>
              <p className="crm-muted">{when(s.at)} · {s.replies} repl{s.replies === 1 ? 'y' : 'ies'}</p>
              {can('support:read') && <div className="crm-actions"><Link className="crm-btn" to={`${BASE}/support/${s.id}`}>Open in support</Link></div>}
            </Card>
          ))}
          {!c.support.length && <p className="crm-muted">No support messages.</p>}
        </>
      );
    case 'emails':
      return (
        <Card title="Emails sent">
          <Rows head={['When', 'Kind', 'Subject', 'Status']} rows={c.emails.map((e) => [when(e.created_at), e.kind, e.subject, <Pill tone={e.status === 'failed' ? 'bad' : e.status === 'test' ? 'info' : 'good'}>{e.status}{e.template_version ? ` · v${e.template_version}` : ''}</Pill>])} empty="No emails logged yet (the log starts with the next deploy)." />
          <p className="crm-muted">Every email to this player since the log started; kept 24 months. No open or click tracking.</p>
        </Card>
      );
    case 'consents':
      return (
        <Card title="Consents and choices">
          <Rows head={['What', 'Now', 'How', 'When']} rows={c.consents.map((x) => [x.what, <b>{x.value}</b>, x.how, when(x.at)])} />
          {can('customers:edit') && p.marketing_opt_in && (
            <ReasonAction label="Turn news off" run={async (v) => { await adminApi.consentOff(p.id, v.reason.trim()); return 'News by email is off.'; }} done={reload} />
          )}
        </Card>
      );
    case 'security':
      return (
        <>
          <Card title="Sign-in and purchase events"><Rows head={['When', 'What', 'Country']} rows={c.security.map((e) => [when(e.at ?? e.created_at), e.kind, e.country ?? '—'])} /><p className="crm-muted">IP addresses stay on their own audited view{can('customers:security') ? <> (the <Link to={`/admin/players/${p.id}`}>classic player page</Link>'s Security tab)</> : ''}.</p></Card>
          <Card title="Admin actions on this account"><Rows head={['When', 'Admin', 'Action', 'Reason']} rows={c.audit.map((a) => [when(a.at), a.admin ?? '—', a.action, a.reason])} /></Card>
          {(can('customers:edit') || can('customers:delete')) && <p className="crm-muted">Rename, suspend or delete in the <Link to={`/admin/players/${p.id}`}>classic player page</Link>.</p>}
        </>
      );
    default:
      return null;
  }
}

// ── Billing ──────────────────────────────────────────────────────────────────

function Billing({ number, can }) {
  const navigate = useNavigate();
  const [month, setMonth] = useState(thisMonth);
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [sum, setSum] = useState(null);
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    const t = setTimeout(() => {
      adminApi.billingDocuments({ month: q.trim() ? '' : month, kind, q }).then((r) => setList(r.documents), (e) => setError(e.message));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [month, kind, q]);
  useEffect(() => { adminApi.billingSummary(month).then(setSum, (e) => setError(e.message)); }, [month]);
  useEffect(() => {
    if (!number) { setDoc(null); return; }
    adminApi.billingDocument(number).then((r) => setDoc(r.document), (e) => setError(e.message));
  }, [number]);

  const t = sum?.totals;
  const exportFile = async (file, reason) => {
    await saveCsv(await adminApi.billingCsv(month, file, reason), `marble-spins-${file === 'vat' ? 'vat-summary' : 'receipts-and-credit-notes'}-${month}.csv`);
    return 'Downloaded. The export is in the audit log.';
  };
  return (
    <div className={`crm-page${number ? ' has-detail' : ''}`}>
      <div className="crm-billtop">
      <div className="crm-toolbar">
        <label className="crm-field"><span>Month</span><input type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} /></label>
        <div className="crm-search crm-search--small">
          <Icon name="search" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Number, order, player or email (all months)" aria-label="Find a receipt or credit note" />
        </div>
      </div>
      {error && <p className="crm-alert">{error}</p>}
      <div className="crm-stats">
        <div><b>{t ? money(t.book_gross_cents, t.book_currency ?? 'SEK') : '…'}</b><span>{month}, in SEK, net of refunds{t?.book_missing ? ` (${t.book_missing} not yet from Stripe)` : ''}</span></div>
        <div><b>{t ? money(t.book_fee_cents, t.book_currency ?? 'SEK') : '…'}</b><span>Stripe fees</span></div>
        <div><b>{t ? `${t.receipts} · ${t.credits}` : '…'}</b><span>receipts · credit notes</span></div>
      </div>
      {can('billing:export') && (
        <Card title={`Export ${month} for the accountant`}>
          <div className="crm-actions crm-actions--wrap">
            <ReasonAction label="Receipts and credit notes (CSV)" confirm="Download" run={(v) => exportFile('documents', v.reason.trim())} />
            <ReasonAction label="VAT by country and rate (CSV)" confirm="Download" run={(v) => exportFile('vat', v.reason.trim())} />
          </div>
        </Card>
      )}
      {sum?.vat?.length > 0 && (
        <Card title="VAT by country and rate">
          <Rows head={['Country', 'Rate', 'Docs', 'Excl. VAT', 'VAT', 'Total', 'SEK']} rows={sum.vat.map((r) => [r.vat_country ?? '—', r.vat_rate == null ? '—' : `${Number(r.vat_rate)}%`, r.documents, money(r.net_cents, r.currency), money(r.vat_cents, r.currency), money(r.gross_cents, r.currency), r.book_gross_cents == null ? '—' : money(r.book_gross_cents, r.book_currency ?? 'SEK')])} />
        </Card>
      )}
      </div>
      <div className={`crm-cols${number ? ' is-detail' : ''}`}>
        <div className="crm-left">
          <div className="crm-chips" role="tablist" aria-label="Documents">
            {[['', 'All'], ['receipt', 'Receipts'], ['credit', 'Credit notes']].map(([k, label]) => (
              <button key={k || 'all'} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}>{label}</button>
            ))}
          </div>
          <nav className="crm-card crm-list" aria-label="Receipts and credit notes">
            {list?.map((d) => (
              <button key={d.number} type="button" className={number === d.number ? 'is-on' : undefined} onClick={() => { navigate(`${BASE}/billing/${encodeURIComponent(d.number)}`); toTop(); }}>
                <span className={`crm-list__ico${d.kind === 'credit' ? ' crm-list__ico--credit' : ''}`}><Icon name={d.kind === 'credit' ? 'refund' : 'receipt'} /></span>
                <span className="crm-list__txt"><b>{d.number}</b><small>{d.player ?? '—'} · {d.order_no}{d.test ? ' · Test · not charged' : ''} · {when(d.issued_at)}</small></span>
                <span className={`crm-amt${d.gross_cents < 0 ? ' crm-neg' : ''}`}>{money(d.gross_cents, d.currency)}</span>
                <Icon name="chevron" size={18} />
              </button>
            ))}
            {list && !list.length && <p className="crm-muted crm-pad">{q ? 'Nothing found.' : `No receipts or credit notes in ${month}.`}</p>}
            {!list && <p className="crm-muted crm-pad">Loading…</p>}
          </nav>
        </div>
        <div className="crm-right">
          <button type="button" className="crm-back" onClick={() => navigate(`${BASE}/billing`)}><Icon name="back" size={18} /> Documents</button>
          {!number && <p className="crm-muted">Choose a receipt or credit note.</p>}
          {number && !doc && !error && <p className="crm-muted">Loading…</p>}
          {doc && <DocumentPanel d={doc} can={can} />}
        </div>
      </div>
    </div>
  );
}

function DocumentPanel({ d, can }) {
  const credit = d.kind === 'credit';
  return (
    <>
      <BillingDocument doc={{ number: d.number, kind: d.kind, ...d.snapshot }} />
      <div className="crm-actions"><button type="button" className="crm-btn" onClick={() => adminApi.billingDocumentPdf(d.number)}>Download PDF</button></div>
      <Card title="For the books">
        <dl className="crm-kv">
          <div><dt>In SEK (Stripe)</dt><dd>{d.book_filled_at ? money(d.book_gross_cents, d.book_currency ?? 'SEK') : 'Not yet from Stripe'}</dd></div>
          <div><dt>Stripe fee</dt><dd>{d.book_filled_at ? money(d.book_fee_cents, d.book_currency ?? 'SEK') : '—'}</dd></div>
          <div><dt>VAT country, rate</dt><dd>{d.vat_country ?? '—'} · {d.vat_rate == null ? '—' : `${Number(d.vat_rate)}%`}</dd></div>
          <div><dt>Emailed</dt><dd>{d.emailed_at ? when(d.emailed_at) : 'Not yet'}</dd></div>
          <div><dt>Order</dt><dd>{d.order_no} · {d.test ? 'Test · not charged (left out of sales, VAT and the exports)' : d.payment_status}{d.refunded_cents ? `, ${money(d.refunded_cents, d.currency)} refunded` : ''}</dd></div>
          {credit && <div><dt>Credits</dt><dd>{d.credits_number ? <Link to={`${BASE}/billing/${encodeURIComponent(d.credits_number)}`}>{d.credits_number}</Link> : '—'}</dd></div>}
          {!credit && d.credited_by?.length > 0 && <div><dt>Credited by</dt><dd>{d.credited_by.map((n, k) => <span key={n}>{k ? ', ' : ''}<Link to={`${BASE}/billing/${encodeURIComponent(n)}`}>{n}</Link></span>)}</dd></div>}
        </dl>
        <div className="crm-actions">
          {d.user_id && can('customers:read') && <Link className="crm-btn" to={`${BASE}/customers/${d.user_id}`}>Open the customer</Link>}
        </div>
        {!credit && can('payments:refund') && d.payment_status === 'paid' && <p className="crm-muted">To refund, open the customer: Purchases & receipts.</p>}
      </Card>
    </>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'admins', icon: 'user', title: 'Admins and roles', need: 'admins:manage', text: 'Who can use the back office, and what each can do' },
  { key: 'company', icon: 'building', title: 'Company details', need: 'reports:read', text: 'What receipts and credit notes show' },
  { key: 'audit', icon: 'list', title: 'Audit log', need: 'audit:read', text: 'Every back-office action, with its reason' },
];

function Settings({ tab, can, me }) {
  const navigate = useNavigate();
  const tabs = TABS.filter((t) => can(t.need));
  const cur = tabs.find((t) => t.key === tab) ?? null;
  return (
    <div className="crm-page">
      <div className={`crm-cols${cur ? ' is-detail' : ''}`}>
        <div className="crm-left">
          <nav className="crm-card crm-list" aria-label="Settings">
            {tabs.map((t) => (
              <button key={t.key} type="button" className={cur?.key === t.key ? 'is-on' : undefined} onClick={() => { navigate(`${BASE}/settings/${t.key}`); toTop(); }}>
                <span className="crm-list__ico"><Icon name={t.icon} /></span>
                <span className="crm-list__txt"><b>{t.title}</b><small>{t.text}</small></span>
                <Icon name="chevron" size={18} />
              </button>
            ))}
          </nav>
          <Card title="Your role">
            <p><b>{ROLE_NAMES[me.role] ?? '—'}</b>: {ROLE_TEXT[me.role] ?? ''}</p>
          </Card>
        </div>
        <div className="crm-right">
          <button type="button" className="crm-back" onClick={() => navigate(`${BASE}/settings`)}><Icon name="back" size={18} /> Settings</button>
          {!cur && <p className="crm-muted">Choose a setting.</p>}
          {cur && <h2 className="crm-h2">{cur.title}</h2>}
          {cur?.key === 'admins' && <Admins me={me} />}
          {cur?.key === 'company' && <Company />}
          {cur?.key === 'audit' && <AuditLog />}
        </div>
      </div>
    </div>
  );
}

const ROLE_OPTIONS = Object.entries(ROLE_NAMES);

function Admins({ me }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => adminApi.admins().then(setD, (e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  return (
    <>
      {error && <p className="crm-alert">{error}</p>}
      {!d && !error && <p className="crm-muted">Loading…</p>}
      {d?.admins.map((a) => (
        <Card key={a.id} title={<>{a.display_name || a.username} <span className="crm-muted">@{a.username}</span></>} actions={<Pill tone={a.role === 'owner' ? 'info' : undefined}>{ROLE_NAMES[a.role] ?? a.role}</Pill>}>
          <dl className="crm-kv">
            <div><dt>Email</dt><dd>{a.email ?? '—'}</dd></div>
            <div><dt>2-step login</dt><dd>{a.two_step_since ? `since ${day(a.two_step_since)}` : 'Not set up yet'}</dd></div>
            <div><dt>Last in the back office</dt><dd>{when(a.last_seen_at)}</dd></div>
            {a.suspended_at && <div><dt>Suspended</dt><dd>{day(a.suspended_at)}</dd></div>}
          </dl>
          {a.id === me.id
            ? <p className="crm-muted">That's you: another owner can change your role.</p>
            : (
              <div className="crm-actions crm-actions--wrap">
                <ReasonAction label="Change role" fields={[{ key: 'role', label: 'New role', options: ROLE_OPTIONS.filter(([k]) => k !== a.role) }]} run={async (v) => { const role = v.role ?? ROLE_OPTIONS.find(([k]) => k !== a.role)[0]; await adminApi.setAdminRole(a.id, role, v.reason.trim()); return `Now ${ROLE_NAMES[role]}, at once.`; }} done={load} />
                <ReasonAction label="Remove from the back office" danger confirm="Remove" run={async (v) => { await adminApi.removeAdmin(a.id, v.reason.trim()); return 'Removed: a player again, and logged out of the back office.'; }} done={load} />
              </div>
            )}
        </Card>
      ))}
      {d && (
        <Card title="Add an admin">
          <p className="crm-muted">An existing saved account (its username or email). They log in to /admin with their own password and set up their 2-step code the first time.</p>
          <ReasonAction label="Add an admin…" confirm="Add" fields={[{ key: 'login', label: 'Username or email', required: true }, { key: 'role', label: 'Role', options: ROLE_OPTIONS.filter(([k]) => k !== 'owner').concat([['owner', 'Owner']]) }]} run={async (v) => { const r = await adminApi.addAdmin(v.login.trim(), v.role ?? 'finance', v.reason.trim()); return `${r.admin.username} added as ${ROLE_NAMES[r.admin.role]}.`; }} done={load} />
        </Card>
      )}
      <Card title="What each role can do">
        <Rows wrap head={['Role', 'Can']} rows={ROLE_OPTIONS.map(([k, n]) => [<b>{n}</b>, ROLE_TEXT[k]])} />
      </Card>
    </>
  );
}

function Company() {
  return (
    <>
      <Card title="Seller on receipts and credit notes">
        <dl className="crm-kv">
          <div><dt>Company</dt><dd>{company.name}</dd></div>
          <div><dt>Org. no</dt><dd>{company.orgNo}</dd></div>
          <div><dt>VAT no</dt><dd>{company.vatNo}</dd></div>
          <div className="crm-kv--wide"><dt>Address</dt><dd>{company.street}, {company.postcode} {company.city}, {company.country}</dd></div>
          <div><dt>Email</dt><dd>{company.supportEmail}</dd></div>
          <div><dt>F-skatt line</dt><dd>Not shown yet (waiting for the accountant, D2)</dd></div>
        </dl>
      </Card>
      <Card title="Numbering">
        <dl className="crm-kv">
          <div><dt>Receipts</dt><dd>K-{new Date().getFullYear()}-00001 …</dd></div>
          <div><dt>Credit notes</dt><dd>KR-{new Date().getFullYear()}-00001 …</dd></div>
        </dl>
        <p className="crm-muted">Unbroken per year, in Swedish time. Only website (Stripe) purchases get them; Google Play and the App Store issue their own. A document never changes once issued; a change here applies to the next ones. The receipt's fields and the export's columns are set in the code (src/billing/layout.js) and change when the accountant answers D1–D3.</p>
      </Card>
    </>
  );
}

const AUDIT_ACTIONS = ['admin-add', 'admin-remove', 'admin-role', 'audit-export', 'billing-export', 'coins', 'consent-export', 'consent-off', 'delete', 'gift-code-disable', 'gift-codes-create', 'item-grant', 'item-remove', 'name', 'name-reset', 'refund', 'rename', 'security-view', 'staff-off', 'staff-on', 'support-reply', 'support-status', 'suspend', 'track-off', 'track-on', 'unsuspend'];

function AuditLog() {
  const [f, setF] = useState({ admin: '', action: '', player: '', from: '', to: '' });
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setError(null);
    const t = setTimeout(() => adminApi.auditLog(f).then((r) => setRows(r.entries), (e) => setError(e.message)), 300);
    return () => clearTimeout(t);
  }, [f]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <Card title="Filters">
        <div className="crm-filters">
          <label className="crm-field"><span>Admin</span><input value={f.admin} onChange={set('admin')} placeholder="username" /></label>
          <label className="crm-field"><span>Action</span><input value={f.action} onChange={set('action')} list="crm-audit-actions" placeholder="all" /><datalist id="crm-audit-actions">{AUDIT_ACTIONS.map((a) => <option key={a} value={a} />)}</datalist></label>
          <label className="crm-field"><span>Player</span><input value={f.player} onChange={set('player')} placeholder="username or id" /></label>
          <label className="crm-field"><span>From</span><input type="date" value={f.from} onChange={set('from')} /></label>
          <label className="crm-field"><span>To</span><input type="date" value={f.to} onChange={set('to')} /></label>
        </div>
        <ReasonAction label="Export these (CSV)" confirm="Download" run={async (v) => { await saveCsv(await adminApi.auditCsv(f, v.reason.trim()), `audit-log-${new Date().toISOString().slice(0, 10)}.csv`); return 'Downloaded. The export itself is in the audit log.'; }} />
      </Card>
      {error && <p className="crm-alert">{error}</p>}
      <Card title={rows ? `${rows.length}${rows.length === 300 ? '+' : ''} entr${rows.length === 1 ? 'y' : 'ies'}` : 'Loading…'}>
        {rows && <Rows wrap head={['When', 'Admin', 'Action', 'Player', 'Reason']} rows={rows.map((a) => [when(a.created_at), a.admin ?? '—', a.action, a.player_id ? <Link to={`${BASE}/customers/${a.player_id}`}>{a.player}</Link> : '—', a.reason])} empty="Nothing matches." />}
      </Card>
    </>
  );
}

// ── Marketing ────────────────────────────────────────────────────────────────

const MARKETING_TABS = [
  { key: 'rules', title: 'Rules and switch', need: 'marketing:read' },
  { key: 'onboarding', title: 'Onboarding', need: 'marketing:read' },
  { key: 'newsletters', title: 'Newsletters', need: 'marketing:read' },
  { key: 'emails', title: 'Email templates', need: 'emails:templates' },
];

function Marketing({ tab, kind, can }) {
  const navigate = useNavigate();
  const tabs = MARKETING_TABS.filter((t) => can(t.need));
  const cur = tabs.find((t) => t.key === tab) ?? tabs[0];
  return (
    <div className="crm-page">
      <div className="crm-chips" role="tablist" aria-label="Marketing">
        {tabs.map((t) => <button key={t.key} type="button" role="tab" aria-selected={cur?.key === t.key} onClick={() => navigate(`${BASE}/marketing/${t.key}`)}>{t.title}</button>)}
        {can('gift-codes:read') && <Link to={`${BASE}/tools/gift-codes`} className="crm-btn crm-btn--sm">Gift codes</Link>}
      </div>
      {cur?.key === 'emails' && <EmailTemplates kind={kind} />}
      {cur?.key === 'rules' && <MarketingRules />}
      {cur?.key === 'onboarding' && <Onboarding />}
      {cur?.key === 'newsletters' && <Newsletters id={kind} can={can} />}
      {!cur && <p className="crm-muted">Gift codes are under Tools.</p>}
    </div>
  );
}
