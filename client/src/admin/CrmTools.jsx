import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi, saveCsv } from './adminApi';
import { BASE, Card, Icon, Pill, ReasonAction, Rows, when } from './Crm';

/**
 * The CRM's Tools (Moses, 17 Nov 2026: the rest of the classic back office, moved): four tabs, each behind its own
 * permission (src/admin/permissions.js), every change with a reason kept in the audit log, as on the classic pages.
 *   names       Name reports (names:moderate): reported names, names the filter would block, resolved
 *   gift-codes  Gift codes (gift-codes:read; making and switching off: gift-codes:make)
 *   economy     Economy (reports:read): coins earned, bought and spent, sales, possible farming
 *   emails      Email list (emails:read): who said yes to news by email; the CSV export is audited
 */
export const TOOLS = [
  { key: 'names', title: 'Name reports', need: 'names:moderate' },
  { key: 'gift-codes', title: 'Gift codes', need: 'gift-codes:read' },
  { key: 'economy', title: 'Economy', need: 'reports:read' },
  { key: 'emails', title: 'Email list', need: 'emails:read' },
];
const n = (v) => Number(v ?? 0).toLocaleString('en-GB');
const customer = (id, label) => <Link to={`${BASE}/customers/${id}`}>{label}</Link>;

/** Loads `fn` and reloads on `deps`; { data, error, reload }. */
function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null });
  const reload = useCallback(() => fn().then((data) => setState({ data, error: null }), (e) => setState((s) => ({ ...s, error: e.message }))), deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

export function ToolsPage({ tab, sub, can }) {
  const navigate = useNavigate();
  const tabs = TOOLS.filter((t) => can(t.need));
  const cur = tabs.find((t) => t.key === tab) ?? tabs[0];
  return (
    <div className="crm-page">
      <div className="crm-chips" role="tablist" aria-label="Tools">
        {tabs.map((t) => <button key={t.key} type="button" role="tab" aria-selected={cur?.key === t.key} onClick={() => navigate(`${BASE}/tools/${t.key}`)}>{t.title}</button>)}
      </div>
      {!cur && <p className="crm-muted">Your role can't open any of the tools.</p>}
      {cur?.key === 'names' && <NameReports />}
      {cur?.key === 'gift-codes' && (sub ? <GiftCode id={sub} can={can} /> : <GiftCodes can={can} />)}
      {cur?.key === 'economy' && <Economy />}
      {cur?.key === 'emails' && <EmailList />}
    </div>
  );
}

// ── Name reports ─────────────────────────────────────────────────────────────

function NameActions({ row, onDone, flagged = false }) {
  const go = (action) => ({ reason }) => adminApi.resolveName(row.player_id, action, reason.trim()).then(() => 'Done.');
  return (
    <div className="crm-actions crm-actions--wrap">
      <ReasonAction label={row.is_guest ? 'Clear the name' : 'Rename'} danger confirm={row.is_guest ? 'Clear the name' : 'Rename to PlayerNNNN'} run={go('rename')} done={onDone} />
      {!flagged && row.hidden && <ReasonAction label="Keep hidden" run={go('keep-hidden')} done={onDone} />}
      {!flagged && <ReasonAction label={row.hidden ? 'Restore the name' : 'Dismiss'} run={go('restore')} done={onDone} />}
    </div>
  );
}

function NameReports() {
  const list = useLoad(() => adminApi.nameReports(), []);
  const d = list.data;
  const shown = (r) => (r.display_name ? `${r.display_name} (@${r.username})` : `@${r.username}`);
  return (
    <>
      <Card title="Name reports">
        <p className="crm-muted">
          Players report names from the scoreboards, race results and rooms. A name reported by 3 different players (on 3 different connections) is
          <b> hidden</b> at once: others see guest_12345 or Player_12345, and the player is asked to choose a new name. <b>Restore the name</b> brings
          it back and dismisses the reports; <b>Keep hidden</b> closes the reports and leaves it hidden until the player chooses a new one; <b>Rename</b> gives
          the account a neutral name (PlayerNNNN; a guest&apos;s shown name is cleared); <b>Dismiss</b> closes the reports and keeps the name.
        </p>
        {list.error && <p className="crm-alert">{list.error}</p>}
        {!d && !list.error && <p className="crm-muted">Loading…</p>}
        {d && <h3 className="crm-h3">Open reports ({d.open.length})</h3>}
        {d && (
          <Rows
            wrap
            empty="None."
            head={['Player', 'Reported name', 'Reporters', 'Where', 'Last report', '']}
            rows={d.open.map((r) => [
              <span key="p">{customer(r.player_id, shown(r))} {r.is_guest && <Pill>guest</Pill>} {r.hidden && <Pill tone="warn">hidden {when(r.hidden_at)}</Pill>} {r.changed && <Pill tone="info">new name chosen</Pill>}</span>,
              r.hidden_name ?? r.names_shown.join(', '),
              `${n(r.reporters)}${r.addresses < r.reporters ? ` (${n(r.addresses)} connections)` : ''}`,
              r.places.join(', '),
              when(r.last_at),
              <NameActions key="a" row={r} onDone={list.reload} />,
            ])}
          />
        )}
      </Card>
      {d && (
        <Card title={`Names the filter would block (${d.flagged.length})`}>
          <p className="crm-muted">Names chosen before the filter (or set by an admin) that it would refuse today.</p>
          <Rows wrap empty="None." head={['Player', 'Matched', '']} rows={d.flagged.map((r) => [customer(r.player_id, shown(r)), `${r.word} (${r.lang})`, <NameActions key="a" row={r} onDone={list.reload} flagged />])} />
        </Card>
      )}
      {d?.resolved.length > 0 && (
        <Card title="Resolved, last 30 days">
          <Rows head={['Player (now)', 'Outcome', 'Reports', 'When']} rows={d.resolved.map((r) => [customer(r.player_id, `@${r.username}`), r.resolution, n(r.reports), when(r.resolved_at)])} />
        </Card>
      )}
    </>
  );
}

// ── Gift codes ───────────────────────────────────────────────────────────────

const CODE_STATE = { active: ['Active', 'good'], expired: ['Expired', undefined], 'used-up': ['Used up', 'info'], disabled: ['Switched off', 'bad'] };
const giftWhat = (c) => (c.kind === 'coins' ? `${n(c.coins)} coins` : `${c.season_name ?? c.season_key} pass`);
const inDays = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const State = ({ s }) => <Pill tone={CODE_STATE[s]?.[1]}>{CODE_STATE[s]?.[0] ?? s}</Pill>;

function MadeCodes({ codes, onClose }) {
  const text = codes.map((c) => c.code).join('\n');
  const csv = () => {
    const rows = [['code', 'gives', 'uses', 'expires', 'tag'], ...codes.map((c) => [c.code, giftWhat(c), c.max_uses, c.expires_at, c.tag])];
    const blob = new Blob([rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    saveCsv({ blob: async () => blob }, `gift-codes-${codes[0].tag}-${codes[0].created_at.slice(0, 10)}.csv`);
  };
  return (
    <div className="crm-form crm-form--wide">
      <b>{codes.length === 1 ? 'Code made' : `${codes.length} codes made`}: {giftWhat(codes[0])}, tag “{codes[0].tag}”</b>
      <textarea className="crm-textarea crm-code" readOnly rows={Math.min(10, codes.length)} value={text} onFocus={(e) => e.target.select()} />
      <div className="crm-actions">
        <button type="button" className="crm-btn" onClick={() => navigator.clipboard?.writeText(text).catch(() => {})}>Copy</button>
        <button type="button" className="crm-btn" onClick={csv}>Download CSV</button>
        <button type="button" className="crm-btn" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function MakeCodes({ seasons, onMade }) {
  const [f, setF] = useState({ kind: 'coins', coins: 5000, season_key: '', uses: 'single', max_uses: 100, count: 1, expires: inDays(30), tag: '', code: '', note: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const single = f.uses === 'single';
  const batch = single && Number(f.count) > 1;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await adminApi.makeGiftCodes({
        kind: f.kind,
        ...(f.kind === 'coins' ? { coins: Number(f.coins) } : { season_key: f.season_key || seasons[0]?.key }),
        max_uses: single ? 1 : Number(f.max_uses),
        ...(batch ? { count: Number(f.count) } : {}),
        ...(!batch && f.code.trim() ? { code: f.code.trim() } : {}),
        expires_at: `${f.expires}T23:59:59+01:00`, // (the end of the chosen day, Swedish time)
        tag: f.tag.trim(), note: f.note.trim() || undefined, reason: f.reason.trim(),
      });
      onMade(r.codes);
      setF((x) => ({ ...x, code: '', reason: '' }));
    } catch (err) { setError(err.message); }
    setBusy(false);
  };
  return (
    <form className="crm-form crm-form--wide" onSubmit={submit}>
      <b>Make codes</b>
      <div className="crm-filters">
        <label className="crm-field"><span>Gives</span><select value={f.kind} onChange={set('kind')}><option value="coins">Coins</option><option value="pass" disabled={!seasons.length}>A season pass</option></select></label>
        {f.kind === 'coins'
          ? <label className="crm-field"><span>Coins</span><input type="number" min={1} max={100000} value={f.coins} onChange={set('coins')} required /></label>
          : <label className="crm-field"><span>Season</span><select value={f.season_key || seasons[0]?.key} onChange={set('season_key')}>{seasons.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></label>}
        <label className="crm-field"><span>Uses</span><select value={f.uses} onChange={set('uses')}><option value="single">Single-use</option><option value="multi">Multi-use, up to</option></select></label>
        {single
          ? <label className="crm-field"><span>How many codes</span><input type="number" min={1} max={500} value={f.count} onChange={set('count')} required /></label>
          : <label className="crm-field"><span>Limit</span><input type="number" min={2} max={100000} value={f.max_uses} onChange={set('max_uses')} required /></label>}
        <label className="crm-field"><span>Expires (end of day)</span><input type="date" value={f.expires} min={inDays(0)} onChange={set('expires')} required /></label>
      </div>
      <label><span>Creator or campaign (tag)</span><input value={f.tag} onChange={set('tag')} required minLength={2} maxLength={64} placeholder="e.g. creator-marblejoe or launch-giveaway" /></label>
      {!batch && <label><span>Own code (optional)</span><input value={f.code} onChange={(e) => setF((x) => ({ ...x, code: e.target.value.toUpperCase() }))} maxLength={24} placeholder="e.g. MARBLEJOE" /></label>}
      <label><span>Note (optional)</span><input value={f.note} onChange={set('note')} maxLength={500} placeholder="What it's for, who it went to" /></label>
      <label><span>Reason (kept in the audit log)</span><input value={f.reason} onChange={set('reason')} required minLength={5} maxLength={500} placeholder="At least 5 characters" /></label>
      {error && <p className="crm-alert">{error}</p>}
      <div className="crm-actions">
        <button type="submit" className="crm-btn crm-btn--primary" disabled={busy || f.reason.trim().length < 5}>{busy ? 'Making…' : batch ? `Make ${f.count} codes` : 'Make code'}</button>
      </div>
      <small className="crm-muted">Single-use codes are 12 random letters and digits; an own code is for a multi-use creator code. Each account can use a code once.</small>
    </form>
  );
}

function GiftCodes({ can }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState({ q: '', tag: '' });
  const [made, setMade] = useState(null);
  const list = useLoad(() => adminApi.giftCodes(filter), [filter.q, filter.tag]);
  const d = list.data;
  return (
    <>
      <Card title="Gift codes">
        {d && !d.enabled && <p className="crm-note">Redeeming is <b>switched off</b> for players (client/src/shared/giftCodes.json). Codes made now work once it&apos;s switched on.</p>}
        {list.error && <p className="crm-alert">{list.error}</p>}
        {can('gift-codes:make') && (made ? <MadeCodes codes={made} onClose={() => setMade(null)} /> : d && <MakeCodes seasons={d.seasons} onMade={(c) => { setMade(c); list.reload(); }} />)}
      </Card>
      {d?.tags.length > 0 && (
        <Card title="By creator or campaign">
          <Rows
            head={['Tag', 'Codes', 'Redeemed', 'Coins given', 'Passes given', 'Last made']}
            rows={d.tags.map((t) => [<button key="t" type="button" className="crm-linkbtn" onClick={() => setFilter({ q: '', tag: t.tag })}>{t.tag}</button>, n(t.codes), n(t.redemptions), n(t.coins_given), n(t.passes_given), when(t.last_made)])}
          />
        </Card>
      )}
      <Card title="Codes">
        <form className="crm-actions" onSubmit={(e) => { e.preventDefault(); setFilter({ q: q.trim(), tag: '' }); }}>
          <div className="crm-search crm-search--small"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="A code, or words from its tag or note" aria-label="Search codes" /></div>
          <button type="submit" className="crm-btn crm-btn--primary">Search</button>
          {(filter.tag || filter.q) && <button type="button" className="crm-btn" onClick={() => { setQ(''); setFilter({ q: '', tag: '' }); }}>Show all{filter.tag ? ` (now: ${filter.tag})` : ''}</button>}
        </form>
        {d && (
          <Rows
            empty="No codes."
            head={['Code', 'Gives', 'Used', 'Expires', 'Tag', 'State', 'Made']}
            rows={d.codes.map((c) => [
              <button key="c" type="button" className="crm-linkbtn crm-code" onClick={() => navigate(`${BASE}/tools/gift-codes/${c.id}`)}>{c.code}</button>,
              giftWhat(c), `${n(c.uses)} / ${n(c.max_uses)}`, when(c.expires_at), c.tag, <State key="s" s={c.state} />, `${when(c.created_at)} ${c.created_by_name ?? ''}`,
            ])}
          />
        )}
      </Card>
    </>
  );
}

function GiftCode({ id, can }) {
  const one = useLoad(() => adminApi.giftCode(id), [id]);
  const c = one.data?.code;
  return (
    <>
      <Link to={`${BASE}/tools/gift-codes`} className="crm-back"><Icon name="back" size={16} /> Gift codes</Link>
      {one.error && <p className="crm-alert">{one.error}</p>}
      {c && (
        <Card title={<span className="crm-code">{c.code}</span>}>
          <dl className="crm-kv">
            <div><dt>Gives</dt><dd>{giftWhat(c)}</dd></div>
            <div><dt>Used</dt><dd>{n(c.uses)} of {n(c.max_uses)} <State s={c.state} /></dd></div>
            <div><dt>Expires</dt><dd>{when(c.expires_at)}</dd></div>
            <div><dt>Tag</dt><dd>{c.tag}</dd></div>
            {c.note && <div className="crm-kv--wide"><dt>Note</dt><dd>{c.note}</dd></div>}
            <div><dt>Made</dt><dd>{when(c.created_at)} by {c.created_by_name ?? '–'}{c.batch_id ? ' (in a batch)' : ''}</dd></div>
            {c.disabled_at && <div><dt>Switched off</dt><dd>{when(c.disabled_at)}</dd></div>}
          </dl>
          {!c.disabled_at && can('gift-codes:make') && (
            <ReasonAction label="Switch off" danger confirm="Switch the code off" run={({ reason }) => adminApi.disableGiftCode(id, reason.trim()).then(() => 'Switched off: no more redemptions; what was redeemed stays.')} done={one.reload} />
          )}
        </Card>
      )}
      {one.data && (
        <Card title="Redeemed by">
          <Rows empty="Nobody yet." head={['When', 'Player', 'Got']} rows={one.data.redemptions.map((r) => [when(r.redeemed_at), customer(r.player_id, `@${r.player}`), r.coins ? `${n(r.coins)} coins` : `pass${r.pass_revoked_at ? ' (since taken back)' : ''}`])} />
        </Card>
      )}
    </>
  );
}

// ── Economy ──────────────────────────────────────────────────────────────────

function Bars({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => [Number(r.earned), Number(r.bought), Number(r.spent)]));
  const w = 760; const h = 180; const bw = w / Math.max(1, rows.length);
  const y = (v) => h - (Number(v) / max) * (h - 10);
  const third = Math.max(1, bw / 3 - 1);
  return (
    <div className="crm-scroll">
      <svg viewBox={`0 0 ${w} ${h + 22}`} className="crm-chart" role="img" aria-label="Coins earned, bought and spent per day">
        {rows.map((r, i) => {
          const x = i * bw;
          return (
            <g key={r.day}>
              <rect x={x} y={y(r.earned)} width={third} height={h - y(r.earned)} className="crm-chart__a"><title>{`${String(r.day).slice(0, 10)}: earned ${n(r.earned)}`}</title></rect>
              <rect x={x + third} y={y(r.bought)} width={third} height={h - y(r.bought)} className="crm-chart__b"><title>{`${String(r.day).slice(0, 10)}: bought ${n(r.bought)}`}</title></rect>
              <rect x={x + 2 * third} y={y(r.spent)} width={third} height={h - y(r.spent)} className="crm-chart__c"><title>{`${String(r.day).slice(0, 10)}: spent ${n(r.spent)}`}</title></rect>
              {i % Math.ceil(rows.length / 8) === 0 && <text x={x} y={h + 16}>{String(r.day).slice(5, 10)}</text>}
            </g>
          );
        })}
      </svg>
      <p className="crm-muted crm-legend"><i className="crm-key crm-chart__a" />earned racing <i className="crm-key crm-chart__b" />bought <i className="crm-key crm-chart__c" />spent in the shop</p>
    </div>
  );
}

function Economy() {
  const [days, setDays] = useState(30);
  const d = useLoad(() => adminApi.economy(days), [days]);
  const e = d.data;
  const sum = (k) => (e ? e.daily.reduce((s, r) => s + Number(r[k] || 0), 0) : 0);
  return (
    <>
      <Card title="Economy" actions={<div className="crm-chips" role="group" aria-label="Period">{[7, 30, 90, 365].map((v) => <button key={v} type="button" aria-pressed={days === v} onClick={() => setDays(v)}>{v} days</button>)}</div>}>
        {d.error && <p className="crm-alert">{d.error}</p>}
        {!e && !d.error && <p className="crm-muted">Loading…</p>}
        {e && (
          <div className="crm-stats">
            <div><b>{n(e.totals.in_circulation)}</b><span>coins in players&apos; bags</span></div>
            <div><b>{n(sum('earned'))}</b><span>earned racing ({days} d)</span></div>
            <div><b>{n(sum('bought'))}</b><span>bought ({days} d)</span></div>
            <div><b>{n(sum('gifted'))}</b><span>from gift codes ({days} d; counted as bought, never on scoreboards)</span></div>
            <div><b>{n(sum('spent'))}</b><span>spent in the shop ({days} d)</span></div>
            <div><b>{n(sum('support'))}</b><span>given by support ({days} d)</span></div>
            <div><b>{n(sum('races'))}</b><span>races ({days} d)</span></div>
            <div><b>{n(e.players.accounts)}</b><span>accounts: {n(e.players.saved)} saved · {n(e.players.guests)} guests</span></div>
            <div><b>{n(e.players.adults)}</b><span>18+ · {n(e.players.age_13_17)} 13–17 · {n(e.players.under_13)} under 13</span></div>
            <div><b>{n(e.players.email_ok)}</b><span>news by email · {n(e.players.suspended)} suspended accounts</span></div>
          </div>
        )}
      </Card>
      {e && (
        <>
          <Card title="Coins per day"><Bars rows={e.daily} /></Card>
          <Card title="Per day">
            <Rows head={['Day', 'Players', 'New accounts', 'Races', 'Earned', 'Bought', 'Gift codes', 'Refunded', 'Spent', 'Support']} rows={[...e.daily].reverse().map((r) => [String(r.day).slice(0, 10), n(r.players), n(r.new_accounts), n(r.races), n(r.earned), n(r.bought), n(r.gifted), n(r.refunded), n(r.spent), n(r.support)])} />
          </Card>
          <div className="crm-cols crm-cols--even">
            <div className="crm-blocks">
              <Card title={`Marbles sold (${days} d)`}><Rows empty="None." head={['Marble', 'Rarity', 'Copies', 'Coins']} rows={e.sales.map((s) => [s.name, s.rarity ?? '–', n(s.copies), n(s.coins)])} /></Card>
              <Card title={`Coin packs paid (${days} d)`}><Rows empty="None paid in this period." head={['Pack', 'Provider', 'Paid', 'Amount']} rows={e.coinPacks.map((p) => [p.product_id, p.provider, n(p.paid), `${(p.cents / 100).toFixed(2)} ${p.currency}`])} /></Card>
            </div>
            <div className="crm-blocks">
              <Card title="Possible coin farming (last 7 days)">
                <p className="crm-muted">One address with 3 or more accounts. Check before acting: a family or a school shares one address.</p>
                <Rows empty="None." head={['IP', 'Country', 'Accounts', 'Last seen']} rows={e.possibleFarming.map((f) => [<code key="ip">{f.ip}</code>, f.country ?? '–', f.accounts, when(f.last_seen)])} />
              </Card>
              <Card title="Top earners (last 7 days)"><Rows head={['Player', 'Earned']} rows={e.topEarners7d.map((t) => [<span key="p">{customer(t.id, `@${t.username}`)}{t.is_guest ? ' (guest)' : ''}</span>, n(t.earned)])} /></Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Email list ───────────────────────────────────────────────────────────────

function EmailList() {
  const d = useLoad(() => adminApi.consents(), []);
  const exportCsv = async ({ reason }) => {
    await saveCsv(await adminApi.consentsCsv(reason.trim()), `email-consents-${new Date().toISOString().slice(0, 10)}.csv`);
    return 'Downloaded. The export is in the audit log.';
  };
  return (
    <Card title="Email list">
      <p className="crm-muted">Saved players who said yes to news by email (not suspended, not under 13). Each player can say no at any time; send only to this list.</p>
      {d.error && <p className="crm-alert">{d.error}</p>}
      {d.data && <p><b>{n(d.data.count)}</b> players.</p>}
      <ReasonAction label="Export the list (CSV)" confirm="Export" run={exportCsv} />
      {d.data && <Rows head={['Email', 'Player', 'Age', 'Since']} rows={d.data.players.map((p) => [p.email, `@${p.username}`, p.age_group ?? '–', when(p.since)])} />}
    </Card>
  );
}
