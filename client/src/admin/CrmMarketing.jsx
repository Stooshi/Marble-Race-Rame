import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from './adminApi';
import { BASE, Card, Icon, Pill, ReasonAction, Rows, toTop, when } from './Crm';
import { BlocksEditor, EmailPreview } from './CrmEmails';

/**
 * Marketing (Moses, 16 Nov 2026, CRM phase 6; server: src/marketing). SENDING IS OFF until Moses approves the texts
 * and sets MARKETING_SENDING=on: until then the back office only drafts, previews, test-sends to your own address and
 * counts. The rules (src/marketing/audience.js): 18+ only, agreed to news (or a buyer, once the purchase pages have
 * their "Don't send me news" box: MARKETING_SOFT_OPT_IN_FROM), never after a no, asleep after 12 months without
 * playing; the one-click unsubscribe in every email; no open or click tracking.
 */
const OFF_NOTE = 'Sending is OFF: nothing goes to players until Moses approves the texts and sets MARKETING_SENDING=on.';

export function MarketingRules() {
  const [s, setS] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { adminApi.marketingStatus().then(setS, (e) => setError(e.message)); }, []);
  if (error) return <p className="crm-alert">{error}</p>;
  if (!s) return <p className="crm-muted">Loading…</p>;
  return (
    <>
      <p className={s.sendingOn ? 'crm-ok' : 'crm-alert'}>{s.sendingOn ? 'Sending is ON (MARKETING_SENDING=on).' : OFF_NOTE}</p>
      <div className="crm-stats">
        <div><b>{s.allowed}</b><span>players the rules allow today</span></div>
        <div><b>{s.softOptInFrom ? `Since ${when(s.softOptInFrom)}` : 'Off'}</b><span>buyers without a yes (soft opt-in)</span></div>
      </div>
      <Card title="Who may get marketing email">
        <ul className="crm-points">
          <li>A saved account with an email address, aged <b>18 or over</b>. Never 13–17, never under 13.</li>
          <li>Who said <b>yes</b> to news (the unticked box), or, once the purchase pages have the "Don't send me news" box, a <b>buyer</b> who didn't tick it (soft opt-in).</li>
          <li>Never after a no (an unsubscribe, the box in Settings, support turning it off).</li>
          <li>Played in the last 12 months; after that it sleeps until they play again.</li>
          <li>Not suspended, deleted or an admin. Every email has the one-click unsubscribe. No open or click tracking.</li>
        </ul>
      </Card>
      <Card title="Waiting for Moses's approval">
        <ul className="crm-points">
          <li>The purchase box "Don't send me news" and its line (website and apps).</li>
          <li>The account box's exact words, "Send me news about new tracks and marbles" (unticked).</li>
          <li>The privacy policy addition (soft opt-in, segments, the 12-month stop, Brevo for marketing email).</li>
          <li>The four onboarding emails' texts (Email templates) and the switch MARKETING_SENDING.</li>
        </ul>
        <p className="crm-muted">Drafts: the project doc claude/marketing-texts-draft.md.</p>
      </Card>
    </>
  );
}

export function Onboarding() {
  const [s, setS] = useState(null);
  useEffect(() => { adminApi.marketingStatus().then(setS, () => {}); }, []);
  return (
    <>
      <p className={s?.sendingOn ? 'crm-ok' : 'crm-alert'}>{s?.sendingOn ? 'Sending is ON.' : OFF_NOTE}</p>
      <Card title="Four emails after saving an account">
        <p className="crm-muted">Day 1, 3, 7 and 10 after a player saves an account, in the Swedish morning; only to players who said yes to news and are 18+; it stops at their first purchase (buyers get the newsletters instead). A step more than 3 days late is skipped.</p>
        <Rows head={['Email', 'Day', 'Would go out today', '']} rows={(s?.onboarding ?? []).map((x) => [x.kind.replace('onboarding-', 'Email '), x.day, s.sendingOn ? x.due : `${x.due} (not sent: off)`, <Link to={`${BASE}/marketing/emails/${x.kind}`} className="crm-btn crm-btn--sm">Edit the email</Link>])} />
      </Card>
    </>
  );
}

const SEG_BUYERS = [['', 'Everyone allowed'], ['any', 'Buyers (anything)'], ['coins', 'Coin buyers'], ['pass', 'Pass holders'], ['pack', 'Pack owners'], ['none', 'Not bought anything']];
const BLANK = { name: '', subject: 'News from Marble Spins', preheader: '', title: 'News from Marble Spins', blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'text', text: '' }], segment: {} };

export function Newsletters({ id, can }) {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const load = useCallback(() => adminApi.newsletters().then(setList, () => {}), []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className={`crm-cols${id ? ' is-detail' : ''}`}>
      <div className="crm-left">
        {list && !list.sendingOn && <p className="crm-alert">{OFF_NOTE}</p>}
        <div><button type="button" className="crm-btn crm-btn--primary" onClick={() => navigate(`${BASE}/marketing/newsletters/new`)}>New newsletter</button></div>
        <nav className="crm-card crm-list" aria-label="Newsletters">
          {list?.newsletters.map((n) => (
            <button key={n.id} type="button" className={id === n.id ? 'is-on' : undefined} onClick={() => { navigate(`${BASE}/marketing/newsletters/${n.id}`); toTop(); }}>
              <span className="crm-list__ico"><Icon name="mail" /></span>
              <span className="crm-list__txt"><b>{n.name}</b><small>{n.subject} · {when(n.updated_at)}</small></span>
              <Pill tone={n.status === 'sent' ? 'good' : n.status === 'sending' ? 'info' : undefined}>{n.status}{n.sent_count ? ` · ${n.sent_count}` : ''}</Pill>
            </button>
          ))}
          {list && !list.newsletters.length && <p className="crm-muted crm-pad">No newsletters yet.</p>}
        </nav>
      </div>
      <div className="crm-right">
        <button type="button" className="crm-back" onClick={() => navigate(`${BASE}/marketing/newsletters`)}><Icon name="back" size={18} /> Newsletters</button>
        {!id && <p className="crm-muted">Choose a newsletter or start a new one.</p>}
        {id && <NewsletterEditor key={id} id={id === 'new' ? null : id} can={can} onSaved={(nid) => { load(); navigate(`${BASE}/marketing/newsletters/${nid}`); }} />}
      </div>
    </div>
  );
}

function NewsletterEditor({ id, can, onSaved }) {
  const [n, setN] = useState(id ? null : BLANK);
  const [meta, setMeta] = useState({ status: 'draft', sendingOn: false });
  const [reach, setReach] = useState(null);
  const [preview, setPreview] = useState(null);
  const [problem, setProblem] = useState(null);
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  useEffect(() => {
    if (!id) return;
    adminApi.newsletter(id).then((r) => { setN({ ...r.newsletter, preheader: r.newsletter.preheader ?? '' }); setMeta({ status: r.newsletter.status, sendingOn: r.sendingOn, sent: r.newsletter.sent_count }); setReach(r.reach); }, (e) => setProblem(e.message));
  }, [id]);
  useEffect(() => {
    if (!n) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      adminApi.previewNewsletter(n).then((p) => { setPreview(p); setProblem(null); }, (e) => setProblem(e.message));
      adminApi.newsletterReach(n.segment).then((r) => setReach(r.reach), () => {});
    }, 400);
    return () => clearTimeout(timer.current);
  }, [n]);
  if (!n) return <p className="crm-muted">{problem ?? 'Loading…'}</p>;
  const draft = meta.status === 'draft';
  const set = (patch) => { setN({ ...n, ...patch }); setMsg(null); };
  const seg = (patch) => set({ segment: Object.fromEntries(Object.entries({ ...n.segment, ...patch }).filter(([, v]) => v !== '' && v != null && v !== false)) });
  const save = async () => { try { const r = await adminApi.saveNewsletter({ ...n, id: id ?? undefined }); setMsg({ ok: true, text: 'Saved.' }); onSaved(r.id); } catch (e) { setMsg({ ok: false, text: e.message }); } };
  const test = async () => { try { const r = await adminApi.testNewsletter(n); setMsg({ ok: true, text: `Test sent to ${r.sentTo}.` }); } catch (e) { setMsg({ ok: false, text: e.message }); } };
  return (
    <>
      <div className="crm-row"><h2 className="crm-h2" style={{ margin: 0 }}>{n.name || 'New newsletter'}</h2><Pill>{meta.status}</Pill></div>
      <Card title="The newsletter">
        <div className="crm-form crm-form--wide">
          <label><span>Name (only in the back office)</span><input value={n.name} onChange={(e) => set({ name: e.target.value })} disabled={!draft} /></label>
          <label><span>Subject</span><input value={n.subject} onChange={(e) => set({ subject: e.target.value })} disabled={!draft} /></label>
          <label><span>Preheader (optional)</span><input value={n.preheader} onChange={(e) => set({ preheader: e.target.value })} disabled={!draft} /></label>
          <label><span>Title</span><input value={n.title} onChange={(e) => set({ title: e.target.value })} disabled={!draft} /></label>
        </div>
        <p className="crm-muted">Placeholder: <code className="crm-code">{'{{name}}'}</code>. No buy-now pressure: news about tracks, marbles and seasons.</p>
      </Card>
      {draft && <Card title="Blocks"><BlocksEditor blocks={n.blocks} onChange={(blocks) => set({ blocks })} /></Card>}
      <Card title={`Who gets it: ${reach ?? '…'} players today (under the rules)`}>
        <div className="crm-filters">
          <label className="crm-field"><span>Buyers</span><select value={n.segment.buyers ?? ''} onChange={(e) => seg({ buyers: e.target.value })} disabled={!draft}>{SEG_BUYERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="crm-field"><span>Not seen for</span><select value={n.segment.lapsedDays ?? ''} onChange={(e) => seg({ lapsedDays: e.target.value ? Number(e.target.value) : '' })} disabled={!draft}><option value="">—</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select></label>
          <label className="crm-field"><span>New players</span><select value={n.segment.newDays ?? ''} onChange={(e) => seg({ newDays: e.target.value ? 30 : '' })} disabled={!draft}><option value="">—</option><option value="30">Saved in the last 30 days</option></select></label>
          <label className="crm-field"><span>Country (first visit)</span><input value={n.segment.country ?? ''} onChange={(e) => seg({ country: e.target.value.toUpperCase().slice(0, 2) })} placeholder="SE" disabled={!draft} /></label>
        </div>
        <p className="crm-muted">A segment only narrows the rules: 18+, said yes to news (or a buyer once the purchase box is live), not unsubscribed, played in the last 12 months.</p>
      </Card>
      {problem && <p className="crm-alert">{problem}</p>}
      <EmailPreview preview={preview} />
      <Card title="Save, test, send">
        <div className="crm-actions crm-actions--wrap">
          {draft && <button type="button" className="crm-btn crm-btn--primary" disabled={Boolean(problem) || n.name.trim().length < 2} onClick={save}>Save the draft</button>}
          <button type="button" className="crm-btn" disabled={Boolean(problem)} onClick={test}>Send me a test</button>
          {draft && id && can('marketing:send') && (meta.sendingOn
            ? <ReasonAction label={`Send to ${reach ?? '…'} players`} danger confirm="Start sending" run={async (v) => { await adminApi.sendNewsletter(id, v.reason.trim()); return 'Sending: 300 every 10 minutes.'; }} />
            : <span className="crm-muted">Send is off: {OFF_NOTE}</span>)}
        </div>
        {meta.status !== 'draft' && <p className="crm-muted">{meta.status === 'sent' ? `Sent to ${meta.sent} players.` : `Sending: ${meta.sent} so far.`}</p>}
        {msg && <p className={msg.ok ? 'crm-ok' : 'crm-alert'} role="status">{msg.text}</p>}
      </Card>
    </>
  );
}
