import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

/**
 * /pass/reminder?confirm=<token> or ?cancel=<token>: the links in the pass reminder emails
 * (src/seasons/reminderMail.js). Confirming is the double opt-in; cancelling deletes the reminder.
 * Works without logging in. The page says the same whether or not the link was still valid.
 */
export default function PassReminderLink() {
  const [search] = useSearchParams();
  const confirm = search.get('confirm');
  const cancel = search.get('cancel');
  const [state, setState] = useState('working');

  useEffect(() => {
    const token = confirm || cancel;
    if (!token) { setState('bad'); return; }
    (confirm ? api.passReminderConfirm(token) : api.passReminderCancel(token))
      .then((r) => setState(confirm ? (r.confirmed ? 'confirmed' : 'gone') : 'cancelled'))
      .catch(() => setState('error'));
  }, [confirm, cancel]);

  const text = {
    working: 'One moment…',
    confirmed: "Thanks, your address is confirmed. We'll email you once, when the pass goes on sale.",
    gone: "This link doesn't work any more: the reminder was cancelled, or it's past its time. You can ask for a new one on the pass page.",
    cancelled: "Done: the reminder is cancelled and we won't email you about it.",
    bad: 'This link is incomplete. Copy the whole address from the email.',
    error: "Something went wrong. Please try the link again in a minute.",
  }[state];
  return (
    <div className="ms-page ms-page--narrow">
      <section className="ms-card" style={{ display: 'grid', gap: 12 }} aria-live="polite">
        <h1 className="ms-h2" style={{ margin: 0 }}>{cancel ? 'Pass reminder: cancel' : 'Pass reminder'}</h1>
        <p className="ms-lede" style={{ margin: 0 }}>{text}</p>
        <div className="ms-row"><Link to="/pass" className="ms-btn">To the pass</Link><Link to="/" className="ms-btn">Marble Spins</Link></div>
      </section>
    </div>
  );
}
