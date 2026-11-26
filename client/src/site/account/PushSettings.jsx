/**
 * Push notifications on screen (in the apps only, once src/shared/push.json is on):
 *   - PushAsk: after the first finished race, our own question before the phone's dialog
 *     (never at first launch); "Not now" is remembered and not asked again;
 *   - PushSettings: Settings → Notifications, the three switches. Season news is marketing: off until
 *     the player turns it on, and not offered to guests (under-13s can only be guests).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { enablePush, markAsked, permission, pushOn, raceFinished, shouldAsk } from '../../app/push';

export function PushAsk() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [news, setNews] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    raceFinished();
    let live = true;
    // (Only if the phone hasn't been asked yet: not after a "Don't allow" in its own dialog.)
    if (shouldAsk()) permission().then((p) => { if (live && (p === 'prompt' || p === 'prompt-with-rationale')) setShow(true); });
    return () => { live = false; };
  }, []);
  if (!show || !pushOn()) return null;
  const canNews = user && !user.is_guest;
  const yes = async () => {
    setBusy(true);
    markAsked('yes');
    const state = await enablePush({ navigate }).catch(() => 'denied');
    if (state === 'granted') await api.setPushSettings({ roomInvites: true, ...(canNews && { seasonNews: news }) }).catch(() => {});
    setShow(false);
  };
  const no = () => { markAsked('no'); setShow(false); };
  return (
    <div className="ms-card" role="dialog" aria-labelledby="push-ask-h" style={{ display: 'grid', gap: 10, marginTop: 12 }}>
      <h2 id="push-ask-h" className="ms-h3" style={{ margin: 0 }}>Get a ping when a friend wants to race?</h2>
      <p style={{ margin: 0, color: 'var(--ms-soft)' }}>We'll tell you when a friend invites you to their room. Nothing else unless you choose it, and you can change it any time in Settings.</p>
      {canNews && (
        <label className="ms-check"><input type="checkbox" checked={news} onChange={(e) => setNews(e.target.checked)} /> Also tell me when a new season starts or the season pass goes on sale</label>
      )}
      <div className="ms-row">
        <button type="button" className="ms-btn ms-btn--primary" onClick={yes} disabled={busy}>Yes, notify me</button>
        <button type="button" className="ms-btn" onClick={no} disabled={busy}>Not now</button>
      </div>
    </div>
  );
}

function Switch({ id, label, sub, checked, disabled, onChange }) {
  return (
    <label className="ms-check" htmlFor={id} style={{ alignItems: 'flex-start' }}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span><b style={{ color: 'var(--ms-text)' }}>{label}</b>{sub && <><br /><span style={{ fontSize: '0.9rem' }}>{sub}</span></>}</span>
    </label>
  );
}

export function PushSettings() {
  const navigate = useNavigate();
  const [s, setS] = useState(null);
  const [perm, setPerm] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!pushOn()) return;
    api.pushSettings().then(setS).catch((e) => setError(e.message));
    permission().then(setPerm);
  }, []);
  if (!pushOn()) return null;
  const set = (k) => async (v) => {
    setError(null);
    try { setS(await api.setPushSettings({ [k]: v })); } catch (e) { setError(e.message); }
  };
  const allow = async () => setPerm(await enablePush({ navigate }).catch(() => 'denied'));
  return (
    <section className="ms-card" style={{ display: 'grid', gap: 10 }} aria-labelledby="push-h">
      <h2 id="push-h" className="ms-h3" style={{ margin: 0 }}>Notifications</h2>
      {perm === 'denied' && <p className="ms-note">Notifications are off for Marble Spins on this phone. To get them, turn them on in your phone's Settings → Marble Spins → Notifications.</p>}
      {(perm === 'prompt' || perm === 'prompt-with-rationale') && <div className="ms-row"><span>Notifications aren't on for this phone yet.</span><button type="button" className="ms-btn ms-btn--sm" onClick={allow}>Turn on</button></div>}
      {s && (
        <>
          <Switch id="push-invites" label="Friend room invites" sub="When a friend invites you to race in their room." checked={s.roomInvites} onChange={set('roomInvites')} />
          <Switch id="push-goal" label="Daily goal reminder" sub="In the evening, if your daily goal isn't done yet." checked={s.dailyGoal} onChange={set('dailyGoal')} />
          {s.seasonNewsAllowed
            ? <Switch id="push-news" label="Season news" sub="When a new season starts or the season pass goes on sale." checked={s.seasonNews} onChange={set('seasonNews')} />
            : <p className="ms-note">Season news is for saved accounts.</p>}
        </>
      )}
      {error && <p className="ms-msg ms-msg--bad" role="alert" style={{ margin: 0 }}>{error}</p>}
    </section>
  );
}
