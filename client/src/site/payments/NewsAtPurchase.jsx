import TEXT from '../../shared/payments/newsAtPurchase.json';
import { api } from '../../api/client';

/**
 * The box at a purchase (Moses approved 19 Nov 2026): unticked, "Don't send me news about new tracks and marbles", with
 * the soft opt-in line under it. Only for saved accounts of 18 and over (nobody younger ever gets marketing email), on
 * the coin checkout, the pass and the track packs, on the website and in the apps.
 */
export const showsNewsBox = (user) => Boolean(user && !user.is_guest && user.age_group === '18+');

export default function NewsAtPurchase({ user, checked, onChange }) {
  if (!showsNewsBox(user)) return null;
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />
      <span style={{ display: 'grid', gap: 4 }}>
        <span>{TEXT.box}</span>
        <span className="ms-note">{TEXT.line}</span>
      </span>
    </label>
  );
}

/** Before the purchase starts: a ticked box is a no to news, recorded on the account (never blocks the purchase). */
export async function newsChoiceAtPurchase(user, noNews) {
  if (!noNews || !showsNewsBox(user)) return;
  await api.purchaseNews({ optOut: true }).catch(() => {});
}
