import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from './adminApi';
import { docMoney } from '../shared/billing/BillingDocument';
import { BASE, Card, Icon, Pill, Rows, toTop, when } from './Crm';

/**
 * Support in the CRM (Moses, 16 Nov 2026, CRM phase 4; plan: claude/crm-plan.md §4). Four stages: New, Open, Answered
 * (waiting for the player; closes by itself after 14 days), Closed. Views: Mine, Waiting on us, Waiting on player,
 * Closed, All. Each message beside its customer (spend, packs, pass); a reply starts from a saved reply if you like,
 * and is edited before sending; a reply makes it Answered. Players' answers to our emails still arrive in the support
 * mailbox (inbound replies: decision D13): open the message again here when they do.
 */
const STAGE_TONE = { new: 'bad', open: 'warn', answered: 'info', closed: undefined };
const STAGE_NAME = { new: 'New', open: 'Open', answered: 'Answered', closed: 'Closed' };
const VIEWS = [['waiting-us', 'Waiting on us'], ['mine', 'Mine'], ['waiting-player', 'Waiting on player'], ['closed', 'Closed'], ['', 'All']];

export function SupportPage({ id, can, me }) {
  const navigate = useNavigate();
  const [view, setView] = useState('waiting-us');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('inbox');
  const load = useCallback(() => adminApi.supportList({ view, q, category }).then(setList, (e) => setError(e.message)), [view, q, category]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);
  return (
    <div className="crm-page">
      <div className="crm-chips" role="tablist" aria-label="Support">
        <button type="button" role="tab" aria-selected={tab === 'inbox'} onClick={() => setTab('inbox')}>Inbox</button>
        <button type="button" role="tab" aria-selected={tab === 'saved'} onClick={() => setTab('saved')}>Saved replies</button>
      </div>
      {tab === 'saved' && <SavedReplies canEdit={can('support:answer')} />}
      {tab === 'inbox' && (
        <div className={`crm-cols${id ? ' is-detail' : ''}`}>
          <div className="crm-left">
            <div className="crm-chips" role="tablist" aria-label="Views">
              {VIEWS.map(([k, label]) => (
                <button key={k || 'all'} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}>
                  {label}{k && list?.views ? ` ${list.views[k]}` : ''}
                </button>
              ))}
            </div>
            <div className="crm-search crm-search--small">
              <Icon name="search" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, order, S-1043 or words" aria-label="Search messages" />
            </div>
            {list?.categories && (
              <label className="crm-field"><span>Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All</option>{list.categories.map((c) => <option key={c}>{c}</option>)}</select>
              </label>
            )}
            {error && <p className="crm-alert">{error}</p>}
            <nav className="crm-card crm-list" aria-label="Messages">
              {list?.messages.map((m) => (
                <button key={m.id} type="button" className={id === m.id ? 'is-on' : undefined} onClick={() => { navigate(`${BASE}/support/${m.id}`); toTop(); }}>
                  <span className="crm-list__ico"><Icon name="support" /></span>
                  <span className="crm-list__txt"><b>{m.ref} · {m.name}</b><small>{m.category} · {when(m.created_at)}{m.assigned ? ` · ${m.assigned}` : ''}</small></span>
                  <Pill tone={STAGE_TONE[m.stage]}>{STAGE_NAME[m.stage]}</Pill>
                </button>
              ))}
              {list && !list.messages.length && <p className="crm-muted crm-pad">Nothing here.</p>}
              {!list && <p className="crm-muted crm-pad">Loading…</p>}
            </nav>
          </div>
          <div className="crm-right">
            <button type="button" className="crm-back" onClick={() => navigate(`${BASE}/support`)}><Icon name="back" size={18} /> Messages</button>
            {!id && <p className="crm-muted">Choose a message.</p>}
            {id && <SupportMessage key={id} id={id} can={can} me={me} onChanged={load} />}
          </div>
        </div>
      )}
    </div>
  );
}

const fillReply = (text, m) => text.replace(/\{\{\s*name\s*\}\}/g, m.name ?? '').replace(/\{\{\s*ref\s*\}\}/g, m.ref ?? '').replace(/\{\{\s*order_no\s*\}\}/g, m.order_no ?? 'your order');

function SupportMessage({ id, can, me, onChanged }) {
  const [d, setD] = useState(null);
  const [saved, setSaved] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [shot, setShot] = useState(null);
  const load = useCallback(() => adminApi.supportMessage(id).then(setD, (e) => setMsg({ ok: false, text: e.message })), [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    adminApi.savedReplies().then((r) => setSaved(r.replies), () => {});
    adminApi.supportAssignees().then((r) => setAssignees(r.admins), () => {});
  }, []);
  if (!d) return <p className="crm-muted">{msg?.text ?? 'Loading…'}</p>;
  const m = d.message;
  const act = async (fn, ok) => {
    setBusy(true); setMsg(null);
    try { await fn(); await load(); onChanged(); if (ok) setMsg({ ok: true, text: ok }); } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };
  const answer = can('support:answer');
  const c = d.customer;
  return (
    <>
      <div className="crm-row">
        <h2 className="crm-h2" style={{ margin: 0 }}>{m.ref} · {m.category}</h2>
        <Pill tone={STAGE_TONE[m.stage]}>{STAGE_NAME[m.stage]}</Pill>
      </div>
      <Card title="From">
        <dl className="crm-kv">
          <div><dt>Name</dt><dd>{m.name}</dd></div>
          <div><dt>Email</dt><dd>{m.email}</dd></div>
          <div><dt>Player</dt><dd>{m.player_id ? <Link to={`${BASE}/customers/${m.player_id}`}>{m.player}</Link> : 'Not linked'}{m.player_guest ? ' (guest)' : ''}</dd></div>
          <div><dt>Order</dt><dd>{m.order_no ?? '—'}</dd></div>
          <div><dt>Sent</dt><dd>{when(m.created_at)}</dd></div>
          {c && <div><dt>Spent</dt><dd>{c.spend.length ? c.spend.map((x) => docMoney(x.cents, x.currency)).join(' + ') : 'Nothing'}</dd></div>}
          {c && <div><dt>Owns</dt><dd>{[...c.packs.map((x) => `${x.name} pack`), ...c.passes.map((x) => `pass ${x.season_key}`)].join(', ') || '—'}</dd></div>}
          {c && c.spend[0] && <div><dt>Last purchase</dt><dd>{when(c.spend.map((x) => x.last_paid_at).sort().at(-1))}</dd></div>}
        </dl>
      </Card>
      <Card title="Message">
        <p className="crm-quote" style={{ whiteSpace: 'pre-wrap' }}>{m.message}</p>
        {m.has_screenshot && !shot && <button type="button" className="crm-btn crm-btn--sm" onClick={async () => setShot(URL.createObjectURL(await adminApi.supportScreenshot(id)))}>Show the screenshot</button>}
        {shot && <img src={shot} alt="The player's screenshot" style={{ maxWidth: '100%', borderRadius: 10 }} />}
      </Card>
      {d.replies.length > 0 && (
        <Card title="Replies">
          {d.replies.map((r) => (
            <div key={r.id} className="crm-reply">
              <small className="crm-muted">{r.admin ?? '—'} · {when(r.created_at)} · {r.emailed_at ? 'emailed' : 'not emailed'}</small>
              <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{r.body}</p>
            </div>
          ))}
        </Card>
      )}
      {answer && (
        <Card title="Reply" actions={saved.length ? (
          <select className="crm-select" value="" onChange={(e) => { const r = saved.find((x) => x.id === e.target.value); if (r) setText(fillReply(r.body, m)); }} aria-label="Start from a saved reply">
            <option value="">Start from a saved reply…</option>
            {saved.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        ) : null}>
          <textarea className="crm-textarea" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Hi ${m.name},`} />
          <div className="crm-actions">
            <button type="button" className="crm-btn crm-btn--primary" disabled={busy || text.trim().length < 2} onClick={() => act(async () => { const r = await adminApi.supportReply(id, text.trim()); setText(''); if (!r.emailed) throw new Error(`Saved, but not emailed${r.emailError ? `: ${r.emailError}` : ' (email is off)'}`); }, 'Sent. The message is Answered: waiting for the player.')}>{d.emailOn ? 'Send the reply' : 'Save the reply (email is off)'}</button>
          </div>
        </Card>
      )}
      {answer && (
        <Card title="Stage and who is on it">
          <div className="crm-actions crm-actions--wrap">
            {['new', 'open', 'answered', 'closed'].filter((s) => s !== m.stage).map((s) => (
              <button key={s} type="button" className="crm-btn crm-btn--sm" disabled={busy} onClick={() => act(() => adminApi.supportStage(id, s), `Now ${STAGE_NAME[s]}.`)}>{s === 'open' && m.stage !== 'new' ? 'Reopen' : `Mark ${STAGE_NAME[s]}`}</button>
            ))}
            <select className="crm-select" value={m.assigned_to ?? ''} disabled={busy} onChange={(e) => act(() => adminApi.supportAssign(id, e.target.value || null), e.target.value ? 'Assigned.' : 'Unassigned.')} aria-label="Assigned to">
              <option value="">Nobody</option>
              {assignees.map((a) => <option key={a.id} value={a.id}>{a.id === me.id ? `${a.username} (me)` : a.username}</option>)}
            </select>
          </div>
        </Card>
      )}
      {msg && <p className={msg.ok ? 'crm-ok' : 'crm-alert'} role="status">{msg.text}</p>}
      <Card title="History">
        <Rows head={['When', 'Admin', 'What', 'Reason']} rows={d.audit.map((a) => [when(a.created_at), a.admin ?? '—', a.action.replace('support-', '') + (a.details?.to ? ` → ${a.details.to}` : ''), a.reason])} />
      </Card>
    </>
  );
}

function SavedReplies({ canEdit }) {
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = useCallback(() => adminApi.savedReplies().then((r) => setList(r.replies), (e) => setMsg({ ok: false, text: e.message })), []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    try { await adminApi.saveSavedReply(edit.id ?? null, edit.title, edit.body); setEdit(null); setMsg({ ok: true, text: 'Saved.' }); load(); } catch (e) { setMsg({ ok: false, text: e.message }); }
  };
  return (
    <>
      <p className="crm-muted" style={{ margin: 0 }}>Texts to start a reply from. {'{{name}}'}, {'{{ref}}'} and {'{{order_no}}'} are filled in from the message, and you edit the reply before sending.</p>
      {canEdit && !edit && <div><button type="button" className="crm-btn crm-btn--primary" onClick={() => setEdit({ title: '', body: 'Hi {{name}},\n\n' })}>New saved reply</button></div>}
      {edit && (
        <Card title={edit.id ? 'Edit saved reply' : 'New saved reply'}>
          <div className="crm-form crm-form--wide">
            <label><span>Title</span><input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
            <label><span>Text</span><textarea className="crm-textarea" rows={8} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></label>
          </div>
          <div className="crm-actions"><button type="button" className="crm-btn crm-btn--primary" onClick={save}>Save</button><button type="button" className="crm-btn" onClick={() => setEdit(null)}>Cancel</button></div>
        </Card>
      )}
      {msg && <p className={msg.ok ? 'crm-ok' : 'crm-alert'}>{msg.text}</p>}
      {list?.map((r) => (
        <Card key={r.id} title={r.title} actions={canEdit ? <div className="crm-actions"><button type="button" className="crm-btn crm-btn--sm" onClick={() => setEdit(r)}>Edit</button><button type="button" className="crm-btn crm-btn--sm crm-btn--danger" onClick={async () => { await adminApi.archiveSavedReply(r.id); load(); }}>Remove</button></div> : null}>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{r.body}</p>
        </Card>
      ))}
      {list && !list.length && <p className="crm-muted">No saved replies yet.</p>}
    </>
  );
}
