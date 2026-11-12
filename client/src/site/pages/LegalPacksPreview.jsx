import LegalPage from './LegalPage';

/**
 * DRAFT preview (Moses, 12 Nov 2026): the full terms with the track-pack section of the terms of sale and the
 * sentences it changes highlighted, for Moses's review. /preview/legal-packs: noindex like every /preview page,
 * linked from nowhere. The live /legal page is unchanged until he approves.
 */
export default function LegalPacksPreview() {
  return (
    <>
      <div className="ms-page ms-page--narrow" style={{ paddingBottom: 0 }}>
        <div className="ms-mock-banner" role="note">
          <b>Draft for review</b> The terms of sale with the new track-pack section. New and changed text is <mark className="ms-legal__new">highlighted</mark>. Not in effect: the live terms are at <a href="/legal#sale">/legal</a>.
        </div>
        <a href="#track-packs" className="ms-btn ms-btn--sm" style={{ justifySelf: 'start' }}>Go to the new section</a>
      </div>
      <LegalPage proposed={{ section: <TrackPacksSection /> }} />
    </>
  );
}

/**
 * DRAFT (12 Nov 2026, for Moses's review; not on /legal): the terms of sale's section on track packs. The same
 * text is in the project, claude/legal-track-packs-draft.md.
 */
function TrackPacksSection() {
  return (
    <section className="ms-legal__newblock" aria-label="New: track packs (draft)">
      <h2 id="track-packs" className="ms-legal__h2">3. Track packs</h2>
      <p>A track pack unlocks every track of one series for your account, for example the Grand Prix pack. Each pack has its own page in the shop listing the tracks it unlocks. A pack costs $7.99 on the website (shown in your local currency, VAT included). In the apps, the App Store or Google Play shows its own price, in your currency. It is one payment, not a subscription.</p>
      <p><b>Paying partly with coins.</b> You may pay part of a pack's price with coins: at most 25% of the price (1,990 coins on the website, where the rest is $5.99). The rest is always paid with money; a pack can't be bought with coins alone. The checkout shows how many coins and how much money you pay. On the website the coins are taken from your account when you continue to payment, and given back automatically if the payment isn't completed. In the apps they are set aside when you open the App Store's or Google Play's purchase, and given back if you close it without buying, or within 2 hours if no purchase is made.</p>
      <p><b>Yours for life.</b> A pack belongs to the saved Marble Spins account that bought it, for as long as the account exists and we run Marble Spins, on the website and in the apps. With it you can race the pack's tracks at any time, and when you host a friend room or a league, everyone in it races them, pack or not. Tracks that are free stay free for everyone. New tracks added to a pack later are included at no extra cost. We may improve a track's layout or looks; if we ever remove a track from a pack, we'll replace it with another track from the same series where we can. A pack has no cash value and, like every purchase, belongs to the account that bought it: it can't be transferred, sold, traded, gifted or moved to another account (terms of use, section 4). Like everything in the game, it never changes how fast a marble is. Paid leagues can race any track, including tracks in packs you don't have.</p>
      <p><b>Unlocked at once.</b> A pack is unlocked as soon as the payment is confirmed: on the website when Stripe confirms it, in the apps when the App Store or Google Play confirms it and we have checked it. At checkout you ask for the pack to be unlocked right away and confirm, by ticking the box, that your 14-day right of withdrawal (section 5) ends when it is unlocked. In the apps, the App Store's or Google Play's own purchase terms also apply.</p>
      <p><b>Refunds.</b> A pack isn't refundable once unlocked, except where the law requires it (section 6). If a pack payment is refunded in full, the pack is removed from your account and the coins you paid towards it are given back. If a payment is reversed by a chargeback, the pack is removed and the coins aren't given back. Packs bought in the apps are refunded by Apple or Google under their rules; when they tell us of the refund, the pack is removed the same way.</p>
    </section>
  );
}
