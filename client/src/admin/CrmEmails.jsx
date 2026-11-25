import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from './adminApi';
import { BASE, Card, Icon, Pill, ReasonAction, Rows, toTop, when } from './Crm';

/**
 * The email templates (Moses, 16 Nov 2026, CRM phase 5; server: src/email/library.js): every email's subject,
 * preheader, title and blocks; the locked part (figures, legal texts, links) stays as the code makes it. Saving makes
 * a new version; nothing changes for players until a version is published (with a reason, audited). A preview with
 * sample values at phone and computer widths, and a test-send to your own address only.
 */
const BLOCK_LABEL = { heading: 'Heading', text: 'Text', button: 'Button', divider: 'Divider', image: 'Picture', core: 'Locked part' };
const NEW_BLOCK = { heading: { type: 'heading', text: '' }, text: { type: 'text', text: '' }, button: { type: 'button', text: '', href: 'https://marblespins.com' }, divider: { type: 'divider' }, image: { type: 'image', src: 'https://', alt: '' } };

export function EmailTemplates({ kind }) {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => adminApi.emailTemplates().then(setList, (e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className={`crm-cols${kind ? ' is-detail' : ''}`}>
      <div className="crm-left">
        {error && <p className="crm-alert">{error}</p>}
        {list && !list.sending && <p className="crm-note">Email isn't set up on this server: previews work, test-sends don't.</p>}
        {['service', 'marketing'].map((g) => (
          <section key={g} style={{ display: 'grid', gap: 8 }}>
            <h3 className="crm-h3">{g === 'service' ? 'Service emails' : 'Marketing emails (sending off)'}</h3>
            <nav className="crm-card crm-list" aria-label={g}>
              {(list?.kinds ?? []).filter((k) => k.group === g).map((k) => (
                <button key={k.kind} type="button" className={kind === k.kind ? 'is-on' : undefined} onClick={() => { navigate(`${BASE}/marketing/emails/${k.kind}`); toTop(); }}>
                  <span className="crm-list__ico"><Icon name="mail" /></span>
                  <span className="crm-list__txt"><b>{k.name}</b><small>{k.published ? `Version ${k.published} live since ${when(k.publishedAt)}` : 'The email in code'}{k.latest && k.latest !== k.published ? ` · version ${k.latest} saved` : ''}</small></span>
                  <Icon name="chevron" size={18} />
                </button>
              ))}
            </nav>
          </section>
        ))}
      </div>
      <div className="crm-right">
        <button type="button" className="crm-back" onClick={() => navigate(`${BASE}/marketing/emails`)}><Icon name="back" size={18} /> Emails</button>
        {!kind && <p className="crm-muted">Choose an email.</p>}
        {kind && <TemplateEditor key={kind} kind={kind} onChanged={load} />}
      </div>
    </div>
  );
}

function TemplateEditor({ kind, onChanged }) {
  const [d, setD] = useState(null);
  const [t, setT] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(null);
  const [problem, setProblem] = useState(null);
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    const r = await adminApi.emailTemplate(kind);
    setD(r);
    const e = r.editing;
    setT({ subject: e.subject, preheader: e.preheader ?? '', title: e.title, blocks: e.blocks });
    setDirty(false);
  }, [kind]);
  useEffect(() => { load().catch((e) => setProblem(e.message)); }, [load]);
  useEffect(() => {
    if (!t) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      adminApi.previewTemplate(kind, t).then((p) => { setPreview(p); setProblem(null); }, (e) => setProblem(e.message));
    }, 350);
    return () => clearTimeout(timer.current);
  }, [kind, t]);

  if (!d || !t) return <p className="crm-muted">{problem ?? 'Loading…'}</p>;
  const edit = (patch) => { setT({ ...t, ...patch }); setDirty(true); setMsg(null); };
  const latest = d.versions[0]?.version ?? null;
  const save = async () => {
    try {
      const r = await adminApi.saveTemplate(kind, t);
      setMsg({ ok: true, text: `Saved as version ${r.version}. Not live until you publish it.` });
      await load();
      onChanged();
    } catch (e) { setMsg({ ok: false, text: e.message }); }
  };
  const test = async () => {
    try { const r = await adminApi.testTemplate(kind, t); setMsg({ ok: true, text: `Test sent to ${r.sentTo}.` }); } catch (e) { setMsg({ ok: false, text: e.message }); }
  };

  return (
    <>
      <h2 className="crm-h2">{d.name}</h2>
      <p className="crm-muted" style={{ margin: 0 }}>{d.about}</p>
      <div className="crm-row">
        {d.liveVersion ? <Pill tone="good">Version {d.liveVersion} is live</Pill> : <Pill>The email in code is live</Pill>}
        {d.group === 'marketing' && <Pill tone="warn">Marketing: sending off</Pill>}
        {dirty && <Pill tone="info">Changed, not saved</Pill>}
      </div>
      <Card title="The email">
        <div className="crm-form crm-form--wide">
          <label><span>Subject</span><input value={t.subject} onChange={(e) => edit({ subject: e.target.value })} /></label>
          <label><span>Preheader (the line after the subject in the inbox; optional)</span><input value={t.preheader} onChange={(e) => edit({ preheader: e.target.value })} /></label>
          <label><span>Title</span><input value={t.title} onChange={(e) => edit({ title: e.target.value })} /></label>
        </div>
        <p className="crm-muted" style={{ margin: '10px 0 4px' }}>Placeholders: {d.placeholders.map((p) => <code key={p.key} className="crm-code" title={`${p.about} (e.g. ${p.sample})`}>{`{{${p.key}}}`}</code>)}</p>
      </Card>
      <Card title="Blocks">
        <BlocksEditor blocks={t.blocks} onChange={(blocks) => edit({ blocks })} />
        <div className="crm-actions"><button type="button" className="crm-btn crm-btn--sm" onClick={() => { setT({ ...d.defaults, preheader: '' }); setDirty(true); }}>Start from today's email</button></div>
      </Card>
      {problem && <p className="crm-alert">{problem}</p>}
      <EmailPreview preview={preview} />
      <Card title="Save, test, publish">
        <div className="crm-actions crm-actions--wrap">
          <button type="button" className="crm-btn crm-btn--primary" disabled={!dirty || Boolean(problem)} onClick={save}>Save as a new version</button>
          <button type="button" className="crm-btn" disabled={Boolean(problem)} onClick={test}>Send me a test</button>
          {latest && latest !== d.liveVersion && !dirty && (
            <ReasonAction label={`Publish version ${latest}`} confirm="Publish" run={async (v) => { await adminApi.publishTemplate(kind, latest, v.reason.trim()); return `Version ${latest} is live: the next ${d.name.toLowerCase()} emails use it.`; }} done={() => { load(); onChanged(); }} />
          )}
          {d.liveVersion && <ReasonAction label="Back to the email in code" danger confirm="Unpublish" run={async (v) => { await adminApi.unpublishTemplate(kind, v.reason.trim()); return 'The email in code is live again.'; }} done={() => { load(); onChanged(); }} />}
        </div>
        {msg && <p className={msg.ok ? 'crm-ok' : 'crm-alert'} role="status">{msg.text}</p>}
      </Card>
      <Card title="Versions">
        <Rows
          head={['Version', 'Saved', 'By', 'Live', '']}
          rows={d.versions.map((v) => [
            v.version, when(v.created_at), v.created_by ?? '—', v.version === d.liveVersion ? <Pill tone="good">live</Pill> : v.published_at ? 'earlier' : '—',
            <button type="button" className="crm-btn crm-btn--sm" onClick={() => { setT({ subject: v.subject, preheader: v.preheader ?? '', title: v.title, blocks: v.blocks }); setDirty(true); }}>Open</button>,
          ])}
          empty="No saved versions yet: the email in code is sent."
        />
        <p className="crm-muted">Open an earlier version, save it as a new one and publish it to go back to it.</p>
      </Card>
    </>
  );
}

/** An email's blocks: edit, move, remove, add (the locked part only moves). */
export function BlocksEditor({ blocks, onChange }) {
  const setBlock = (i, patch) => onChange(blocks.map((b, k) => (k === i ? { ...b, ...patch } : b)));
  const move = (i, by) => { const b = [...blocks]; const [x] = b.splice(i, 1); b.splice(i + by, 0, x); onChange(b); };
  const remove = (i) => onChange(blocks.filter((_, k) => k !== i));
  const add = (type) => onChange([...blocks, { ...NEW_BLOCK[type] }]);
  return (
    <>
      <div className="crm-blocks">
        {blocks.map((b, i) => (
          <div key={i} className={`crm-blk${b.type === 'core' ? ' crm-blk--core' : ''}`}>
            <div className="crm-blk__head">
              <b>{BLOCK_LABEL[b.type]}</b>
              <span className="crm-grow" />
              <button type="button" className="crm-btn crm-btn--sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button type="button" className="crm-btn crm-btn--sm" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              {b.type !== 'core' && <button type="button" className="crm-btn crm-btn--sm crm-btn--danger" onClick={() => remove(i)} aria-label="Remove">✕</button>}
            </div>
            {b.type === 'core' && <p className="crm-muted" style={{ margin: 0 }}>Filled by the code: the figures, legal wording and links. It can be moved, not changed.</p>}
            {(b.type === 'heading' || b.type === 'button') && <input value={b.text} onChange={(e) => setBlock(i, { text: e.target.value })} placeholder={b.type === 'button' ? "The button's words" : 'Heading'} />}
            {b.type === 'text' && <textarea rows={Math.min(8, Math.max(2, b.text.split('\n').length + 1))} value={b.text} onChange={(e) => setBlock(i, { text: e.target.value })} />}
            {b.type === 'button' && <input value={b.href} onChange={(e) => setBlock(i, { href: e.target.value })} placeholder="https://… or {{…_url}}" />}
            {b.type === 'image' && <><input value={b.src} onChange={(e) => setBlock(i, { src: e.target.value })} placeholder="https://… (the picture's address)" /><input value={b.alt} onChange={(e) => setBlock(i, { alt: e.target.value })} placeholder="What it shows" /></>}
          </div>
        ))}
      </div>
      <div className="crm-actions">
        {['heading', 'text', 'button', 'divider', 'image'].map((k) => <button key={k} type="button" className="crm-btn crm-btn--sm" onClick={() => add(k)}>+ {BLOCK_LABEL[k]}</button>)}
      </div>
    </>
  );
}

/** An email preview in a frame, at phone or computer width. */
export function EmailPreview({ preview }) {
  const [width, setWidth] = useState(390);
  return (
    <Card
      title="Preview (sample values)"
      actions={<div className="crm-chips" role="tablist">{[[390, 'Phone'], [680, 'Computer']].map(([w, l]) => <button key={w} type="button" role="tab" aria-selected={width === w} onClick={() => setWidth(w)}>{l}</button>)}</div>}
    >
      {preview && <p className="crm-muted" style={{ margin: '0 0 8px' }}><b>Subject:</b> {preview.subject}</p>}
      <div className="crm-preview"><iframe title="Email preview" sandbox="" srcDoc={preview?.html ?? ''} style={{ width: `min(100%, ${width}px)` }} /></div>
    </Card>
  );
}
