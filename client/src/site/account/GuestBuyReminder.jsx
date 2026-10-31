import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import QuickSignup from './QuickSignup';

/**
 * The save reminder when a guest buys with coins (Moses, 31 Oct 2026): a reminder, never a block.
 * Before confirming a coin purchase: "You're playing as a guest. Save your account so this marble is yours
 * forever." with SAVE MY ACCOUNT (the quick sign-up, then the purchase goes through) and BUY ANYWAY. Right
 * after a guest's purchase: "<marble name> is yours! Save your account so you never lose it." with SAVE and
 * LATER. Saved accounts see nothing new. BUY ANYWAY and LATER always work (store rules: a guest is never
 * made to sign up to buy). Website and apps alike (the apps run this same page).
 */
export const GUEST_BUY = {
  before: "You're playing as a guest. Save your account so this marble is yours forever.",
  beforeBag: "You're playing as a guest. Save your account so these marbles are yours forever.",
  after: (name) => `${name} is yours! Save your account so you never lose it.`,
};

/** Before the purchase: shown in place of the confirm button, guests only. `onBuy()`: the purchase itself; `text`: a bag's "these marbles". */
export function GuestBuyBefore({ onBuy, busy = false, text = GUEST_BUY.before }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  if (saving) {
    return (
      <div className="ms-guestbuy ms-guestbuy--form">
        <QuickSignup heading="h3" title="Save your account" sub="Then your purchase goes through, kept with everything you won." onSaved={() => onBuy()} onDone={() => setSaving(false)} onLater={() => setSaving(false)} />
      </div>
    );
  }
  if (!user?.is_guest) return null;
  return (
    <div className="ms-guestbuy" role="note">
      <p>{text}</p>
      <div className="ms-guestbuy__buttons">
        <button type="button" className="ms-btn ms-btn--primary ms-btn--sm" onClick={() => setSaving(true)} disabled={busy}>SAVE MY ACCOUNT</button>
        <button type="button" className="ms-btn ms-btn--sm" onClick={() => onBuy()} disabled={busy}>{busy ? 'BUYING…' : 'BUY ANYWAY'}</button>
      </div>
    </div>
  );
}

/** Right after a guest's purchase. `name`: what was bought. Gone once the account is saved, or after LATER. */
export function GuestBuyAfter({ name }) {
  const { user } = useAuth();
  const [state, setState] = useState('ask'); // ask | form | later
  if (state === 'later') return null;
  if (state === 'form') {
    return (
      <div className="ms-guestbuy ms-guestbuy--form">
        <QuickSignup heading="h3" title="Save your account" onDone={() => setState('later')} onLater={() => setState('later')} />
      </div>
    );
  }
  if (!user?.is_guest) return null;
  return (
    <div className="ms-guestbuy" role="note">
      <p>{GUEST_BUY.after(name)}</p>
      <div className="ms-guestbuy__buttons">
        <button type="button" className="ms-btn ms-btn--primary ms-btn--sm" onClick={() => setState('form')}>SAVE</button>
        <button type="button" className="ms-btn ms-btn--sm" onClick={() => setState('later')}>LATER</button>
      </div>
    </div>
  );
}
