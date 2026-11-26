import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import settings from '../../shared/support.json';
import { CONTACT_CATEGORIES } from './faq';

const { limits } = settings;
const MAX_SIDE = 2000; // px: bigger screenshots are scaled down before sending
const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('The image could not be read.'));
  r.readAsDataURL(blob);
});

/**
 * A chosen image → a data URL to send: kept as it is when small enough, otherwise scaled down
 * (longest side MAX_SIDE) as a JPEG. Throws a readable Error when it isn't a usable image.
 */
export async function prepareScreenshot(file) {
  if (!file) return null;
  if (!/^image\//.test(file.type)) throw new Error('The screenshot must be an image (PNG or JPEG).');
  const small = file.size <= 1.5 * 1048576 && settings.screenshotTypes.includes(file.type);
  if (small) return readAsDataUrl(file);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (file.size <= limits.screenshotBytes && settings.screenshotTypes.includes(file.type)) return readAsDataUrl(file);
    throw new Error('That image could not be opened. Try a PNG or JPEG screenshot.');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob || blob.size > limits.screenshotBytes) throw new Error(`The screenshot is too big (at most ${limits.screenshotBytes / 1048576} MB).`);
  return readAsDataUrl(blob);
}

const empty = { name: '', email: '', category: '', order_no: '', message: '', website: '' };

/** "Still need help?": the contact form at the end of the Help Centre. Saved in the back office's support inbox. */
export default function ContactForm() {
  const id = useId();
  const { user } = useAuth();
  const saved = user && !user.is_guest;
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(null);
  const fileInput = useRef(null);

  const freshToken = () => api.supportForm().then((f) => { setToken(f.token); return f.token; }).catch(() => null);
  useEffect(() => { freshToken(); }, []);
  // A saved account fills in its name and email.
  useEffect(() => {
    if (!saved) return;
    setForm((f) => ({ ...f, name: f.name || user.display_name || user.username || '', email: f.email || user.email || '' }));
  }, [saved, user]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const pickFile = (e) => {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f && !/^image\//.test(f.type)) { setError('The screenshot must be an image (PNG or JPEG).'); e.target.value = ''; return; }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };
  const dropFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const screenshot = await prepareScreenshot(file);
      const body = { ...form, token: token ?? await freshToken(), screenshot: screenshot ?? undefined, order_no: form.order_no.trim() || undefined };
      let res;
      try {
        res = await api.sendSupport(body);
      } catch (err) {
        if (err.details?.token !== 'expired') throw err;
        res = await api.sendSupport({ ...body, token: await freshToken() }); // (the form was open a long time)
      }
      setSent({ ref: res.ref, email: form.email });
      setForm(saved ? { ...empty, name: form.name, email: form.email } : empty);
      dropFile();
      freshToken();
    } catch (err) {
      setError(err.status === 0 ? "We can't reach our server right now. Please try again in a moment." : err.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="ms-msg" role="status" style={{ display: 'grid', gap: 8 }}>
        <strong>Thanks, your message is in{sent.ref ? ` (reference ${sent.ref})` : ''}.</strong>
        <span>We'll answer by email at {sent.email}. We aim to reply within 2 working days.</span>
        <div><button type="button" className="ms-linkbtn" style={{ padding: 0 }} onClick={() => setSent(null)}>Send another message</button></div>
      </div>
    );
  }

  const left = limits.messageMax - form.message.length;
  return (
    <form className="ms-form ms-help-form" onSubmit={submit} noValidate={false}>
      <div className="ms-help-form__two">
        <label>Your name
          <input value={form.name} onChange={set('name')} required maxLength={limits.name} autoComplete="name" />
        </label>
        <label>Email
          <input type="email" value={form.email} onChange={set('email')} required maxLength={limits.email} autoComplete="email" inputMode="email" />
        </label>
      </div>
      <div className="ms-help-form__two">
        <label>What is it about?
          <select value={form.category} onChange={set('category')} required>
            <option value="" disabled>Choose a topic</option>
            {CONTACT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label><span>Order number <span className="ms-help-form__opt">(optional)</span></span>
          <input value={form.order_no} onChange={set('order_no')} maxLength={limits.orderNo} placeholder="e.g. MS-1001" autoCapitalize="characters" />
        </label>
      </div>
      <label>Message
        <textarea value={form.message} onChange={set('message')} required minLength={limits.messageMin} maxLength={limits.messageMax} rows={6}
          placeholder="What happened, when, and on which device? For a player you want to report: their name and the race time." aria-describedby={`${id}-left`} />
        <span id={`${id}-left`} className="ms-note" style={{ fontWeight: 400 }}>{left < 500 ? `${left} characters left` : 'Your player name helps us find your account.'}</span>
      </label>
      <div className="ms-help-form__file">
        <span style={{ fontWeight: 600 }}>Screenshot <span className="ms-help-form__opt">(optional)</span></span>
        {preview ? (
          <div className="ms-row" style={{ gap: 12 }}>
            <img src={preview} alt="Your screenshot" className="ms-help-form__thumb" />
            <button type="button" className="ms-btn ms-btn--sm" onClick={dropFile}>Remove</button>
          </div>
        ) : (
          <label className="ms-btn ms-btn--sm ms-help-form__pick">
            Add a screenshot
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/*" onChange={pickFile} className="ms-visually-hidden" />
          </label>
        )}
      </div>
      {/* People never see or fill this one; bots do. */}
      <div className="ms-help-form__hp" aria-hidden="true">
        <label>Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} name="website" /></label>
      </div>
      <span className="ms-note">
        {user ? `Sent with your ${user.is_guest ? 'guest ' : ''}account${user.is_guest ? '' : ` @${user.username}`}, so we can look up your races and purchases.` : 'Logged in? Then we can find your account by itself.'}
        {' '}We use your message only to answer you; see our <Link to="/legal#privacy">privacy policy</Link>.
      </span>
      {error && <div className="ms-msg ms-msg--bad" role="alert">{error}</div>}
      <div><button type="submit" className="ms-btn ms-btn--primary" disabled={busy}>{busy ? 'SENDING…' : 'SEND MESSAGE'}</button></div>
    </form>
  );
}
