import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from './adminApi';
import { docMoney } from '../shared/billing/BillingDocument';
import { countryName } from '../site/country/countries';
import { BASE, Card, Pill, Rows, when } from './Crm';

/**
 * The CRM's start page (Moses, 17 Nov 2026): five cards for today (Swedish time), then everything the classic
 * Dashboard has: the period, players and races, the first-visit funnel, the chart, new players by country, and
 * where players come from. Numbers only (GET /admin/today and /admin/dashboard, reports:read); who bought what
 * only for a role that may see payments, open support linked only for a role that may read it.
 */
const PERIODS = [['today', 'Today'], ['6h', 'Last 6 hours'], ['24h', 'Last 24 hours'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['mtd', 'Month to date'], ['lastmonth', 'Last month']];
const n = (v) => (v === null || v === undefined ? '–' : Number(v).toLocaleString('en-GB'));
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
const land = (code) => (code ? countryName(code) ?? code : '–');
const PROVIDER = { stripe: 'Website', google: 'Google Play', apple: 'App Store' };
const product = (id) => (id ?? '').replace(/^trackpack-/, 'Track pack: ').replace(/^coins-(\d+)/, (_, c) => `${n(c)} coins`).replace(/^holiday-pass-2026$/, 'Holiday Season Pass 2026');

export function DashboardPage({ can }) {
  const [today, setToday] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { adminApi.today().then(setToday, (e) => setError(e.message)); }, []);
  const sales = today?.sales ?? [];
  return (
    <div className="crm-page">
      {error && <p className="crm-alert">{error}</p>}
      <div className="crm-stats crm-today" aria-label="Today">
        <div><b>{today ? (sales.length ? sales.map((s) => docMoney(s.cents, s.currency)).join(' + ') : '—') : '…'}</b><span>sales today{sales.length ? ` · ${n(sales.reduce((t, s) => t + s.purchases, 0))} purchase(s), after refunds` : ''}</span></div>
        <div><b>{today ? n(today.newPlayers) : '…'}</b><span>new players today</span></div>
        <div><b>{today ? n(today.signUps) : '…'}</b><span>sign-ups today (saved accounts)</span></div>
        <div>
          <b>{today ? n(today.openSupport) : '…'}</b>
          <span>{can('support:read') ? <Link to={`${BASE}/support`}>open support messages</Link> : 'open support messages'}</span>
        </div>
      </div>
      {today?.latest && (
        <Card title="Latest purchases" actions={can('billing:read') ? <Link to={`${BASE}/billing`} className="crm-btn crm-btn--sm">Billing</Link> : null}>
          <Rows
            empty="No purchases yet."
            head={['When', 'Order', 'Item', 'Where', 'Amount', 'Customer']}
            rows={today.latest.map((p) => [
              when(p.paid_at), p.order_no ?? '—', product(p.product_id), PROVIDER[p.provider] ?? p.provider,
              <span key="a">{docMoney(p.cents, p.currency)}{p.refunded_cents ? <> <Pill tone="warn">refunded {docMoney(p.refunded_cents, p.currency)}</Pill></> : null}</span>,
              can('customers:read') ? <Link key="c" to={`${BASE}/customers/${p.player_id}`}>@{p.player}</Link> : `@${p.player}`,
            ])}
          />
        </Card>
      )}
      <Dashboard />
      <Devices />
    </div>
  );
}

const DEVICE_NAMES = { phone: 'Phone', tablet: 'Tablet', computer: 'Computer' };

/**
 * Devices & browsers (Moses, 20 Nov 2026; GET /admin/devices, src/devices): the players seen in the last 30 days, each
 * counted once by their latest device, as shares by device type, app or website, system and browser. Staff left out.
 */
function Devices() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  // (A server from before 20 Nov 2026 has no such address: the card waits for the deploy.)
  useEffect(() => { adminApi.devices(30).then(setD, (e) => setError(e.status === 404 ? 'old-server' : e.message)); }, []);
  if (error === 'old-server') return null;
  const Share = ({ title, rows, names = {} }) => (
    <div>
      <h3 className="crm-h3">{title}</h3>
      <div className="crm-funnel crm-shares">
        {rows.map((r) => (
          <div key={r.key}>
            <span>{names[r.key] ?? r.key}</span>
            <b>{pct(r.players, d.players)}</b>
            <i style={{ width: `${Math.max(2, Math.round((r.players / d.players) * 100))}%` }} aria-hidden="true" />
            <small>{n(r.players)} player{r.players === 1 ? '' : 's'}</small>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <Card title="Devices & browsers">
      {error && <p className="crm-alert">{error}</p>}
      {!d && !error && <p className="crm-muted">Loading…</p>}
      {d && d.players === 0 && <p className="crm-muted">No devices recorded yet. They are recorded when a player logs in or opens the game, from the server of 20 Nov 2026 on.</p>}
      {d && d.players > 0 && (
        <>
          <p className="crm-muted">The {n(d.players)} players seen in the last {d.days} days, each counted once by their latest device. Staff left out. Taken from what the browser says about itself (coarse only).</p>
          <div className="crm-cols crm-cols--even">
            <Share title="Device" rows={d.device} names={DEVICE_NAMES} />
            <Share title="App or website" rows={d.client} />
          </div>
          <div className="crm-cols crm-cols--even">
            <Share title="System" rows={d.os} />
            <Share title="Browser" rows={d.browser} />
          </div>
        </>
      )}
    </Card>
  );
}

function Dashboard() {
  const [period, setPeriod] = useState('today');
  const [x, setX] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { setX(null); adminApi.dashboard(period).then(setX, (e) => setError(e.message)); }, [period]);
  return (
    <>
      <Card title="Players and races" actions={(
        <select className="crm-select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
          {PERIODS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      )}>
        {error && <p className="crm-alert">{error}</p>}
        {!x && !error && <p className="crm-muted">Loading…</p>}
        {x && (
          <>
            <p className="crm-muted">{x.label}: {when(x.from)} to {when(x.to)} (Swedish time). Staff and computer players left out.</p>
            <div className="crm-stats">
              <div><b>{n(x.players.newGuests)}</b><span>new guests</span></div>
              <div><b>{n(x.players.newSaved)}</b><span>new saved accounts (signed up, or a guest saved)</span></div>
              <div><b>{n(x.players.finishedPlayers)}</b><span>finished at least 1 race</span></div>
              <div><b>{n(x.players.returningPlayers)}</b><span>returning players (a race on a later day than they joined)</span></div>
              <div><b>{n(x.races.finished)}</b><span>races finished</span></div>
              <div><b>{x.races.perActivePlayer.toLocaleString('en-GB')}</b><span>races per active player (average)</span></div>
            </div>
          </>
        )}
      </Card>
      {x && (
        <>
          <Card title="New guests: the first visit"><Funnel f={x.funnel} /></Card>
          <div className="crm-cols crm-cols--even">
            <Card title={`New guests and players who finished a race, per ${x.bucket}`}><Chart rows={x.chart} bucket={x.bucket} /></Card>
            <Card title="New players by country">
              <Rows empty="None in this period." head={['Country (detected)', 'New players']} rows={x.countries.map((c) => [c.country === '–' ? 'Unknown' : land(c.country), n(c.players)])} />
            </Card>
          </div>
          <Origins o={x.origins} />
        </>
      )}
    </>
  );
}

const SOURCE_NAMES = { quick: 'Quick race / Play', solo: 'Race solo', friends: 'Race with friends', room: 'Joined a room', unknown: 'Unknown' };

/** Tapped Play → joined a race → saw GO → finished a race, with % of the first step and of the step before. */
function Funnel({ f }) {
  if (!f.tapped) return <p className="crm-muted">No new guest tapped Play in this period (taps are counted from 2 Nov 2026).</p>;
  const steps = [['Tapped Play', f.tapped], ['Joined a race', f.joined], ['Saw GO', f.sawGo], ['Finished a race', f.finished]];
  return (
    <>
      <div className="crm-funnel">
        {steps.map(([label, v], i) => (
          <div key={label}>
            <span>{label}</span>
            <b>{n(v)}</b>
            <i style={{ width: `${Math.max(2, (v / f.tapped) * 100)}%` }} />
            <small>{pct(v, f.tapped)} of those who tapped{i > 0 ? ` · ${pct(v, steps[i - 1][1])} of the step before` : ''}</small>
          </div>
        ))}
      </div>
      <p className="crm-muted">Tapped: {Object.entries(f.bySource).map(([k, v]) => `${SOURCE_NAMES[k] ?? k} ${n(v)}`).join(' · ')}</p>
    </>
  );
}

/** Two lines over the period: new guests, and players who finished a race. */
function Chart({ rows, bucket }) {
  if (!rows.length) return <p className="crm-muted">No data.</p>;
  const W = 640; const H = 200; const L = 34; const B = 24; const T = 10;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.newGuests, r.finishedPlayers)));
  const step = rows.length > 1 ? (W - L - 10) / (rows.length - 1) : 0;
  const xAt = (i) => L + i * step;
  const yAt = (v) => T + (H - T - B) * (1 - v / max);
  const line = (key) => rows.map((r, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(r[key]).toFixed(1)}`).join(' ');
  const every = Math.max(1, Math.ceil(rows.length / 8));
  const label = (at) => (bucket === 'hour' ? at.slice(11, 16) : at.slice(5, 10));
  return (
    <div className="crm-scroll">
      <svg className="crm-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="New guests and players who finished a race">
        {[0, Math.round(max / 2), max].map((t) => <g key={t}><line x1={L} x2={W - 10} y1={yAt(t)} y2={yAt(t)} className="crm-chart__grid" /><text x={L - 6} y={yAt(t) + 4} textAnchor="end">{t}</text></g>)}
        {rows.map((r, i) => (i % every === 0 ? <text key={r.at} x={xAt(i)} y={H - 6} textAnchor="middle">{label(r.at)}</text> : null))}
        <path d={line('newGuests')} className="crm-chart__line crm-chart__line--a" />
        <path d={line('finishedPlayers')} className="crm-chart__line crm-chart__line--b" />
      </svg>
      <p className="crm-muted crm-legend"><i className="crm-key crm-chart__a" />New guests <i className="crm-key crm-chart__b" />Players who finished a race</p>
    </div>
  );
}

/** Where players come from (src/origins): per source, the new players of the last 7 or 30 days and how far they got. */
function Origins({ o }) {
  const [days, setDays] = useState('7d');
  const rows = o?.[days] ?? [];
  const total = rows.reduce((t, r) => ({ newPlayers: t.newPlayers + r.newPlayers, finishedRace: t.finishedRace + r.finishedRace, threeRaces: t.threeRaces + r.threeRaces, saved: t.saved + r.saved }), { newPlayers: 0, finishedRace: 0, threeRaces: 0, saved: 0 });
  const cell = (v, of) => `${n(v)}${of ? ` (${pct(v, of)})` : ''}`;
  const row = (label, r) => [label, cell(r.newPlayers), cell(r.finishedRace, r.newPlayers), cell(r.threeRaces, r.newPlayers), cell(r.saved, r.newPlayers)];
  return (
    <Card title="Where players come from" actions={<div className="crm-chips" role="group" aria-label="Window">{[['7d', 'Last 7 days'], ['30d', 'Last 30 days']].map(([k, label]) => <button key={k} type="button" aria-pressed={days === k} onClick={() => setDays(k)}>{label}</button>)}</div>}>
      <Rows
        empty="No new players in this window."
        head={['Source', 'New players', 'Finished a race', '3+ races', 'Saved accounts']}
        rows={rows.length ? [...rows.map((r) => row(r.source === '(direct or unknown)' ? 'Direct or unknown' : r.source, r)), row(<b key="all">All</b>, total)] : []}
      />
      <p className="crm-muted">The utm_source of the address a new player arrived on, else the referring site; recorded from 13 Nov 2026 (earlier players are Direct or unknown). No cookies: kept in the page&apos;s memory from arrival until the guest account is made.</p>
    </Card>
  );
}
