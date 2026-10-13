import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Terms of use, terms of sale, privacy, cookies and contact: the design's
 * draft text, for legal review before launch. [Brackets] are still to decide.
 */
export default function LegalPage() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  return (
    <div className="ms-page ms-page--narrow ms-legal">
      <div className="ms-msg ms-msg--bad">DRAFT for legal review before launch. Text in [brackets] still needs to be decided.</div>
      <span className="ms-note">Last updated [date] · Marble Spins is run by [COMPANY NAME AB], org. no. [XXXXXX-XXXX], [address], Sweden.</span>
      <h1 id="use" className="ms-h2 ms-legal__h1">Terms of use</h1>
      <h2 className="ms-legal__h2">1. The game</h2>
      <p>Marble Spins is a free online marble racing game. Race results are decided by the game's physics and each player's skill rating. Nothing you buy changes how fast your marble is.</p>
      <h2 className="ms-legal__h2">2. Your account</h2>
      <p>You can race as a guest. To keep your progress you create an account. Keep your login details to yourself; you're responsible for what happens on your account. Players under [13] need a parent or guardian's approval.</p>
      <h2 className="ms-legal__h2">3. Fair play</h2>
      <p>No cheating, bots, automated play, exploiting bugs, or offensive player names. We may reset progress or close accounts that break these rules.</p>
      <h2 className="ms-legal__h2">4. Coins and marbles</h2>
      <p>Coins are the game's only currency. You earn them by racing or buy them in coin packs, and use them only in the shop; they can't be cashed out, exchanged for money or transferred. Scoreboards count only coins earned by racing. Marbles and other items are a licence to use them in the game; they have no cash value and aren't your property outside the game. [Trading between players, when introduced, will have its own rules.]</p>
      <h2 className="ms-legal__h2">5. Changes and availability</h2>
      <p>We keep improving the game, so tracks, items and features can change. We'll tell you about important changes to these terms before they apply.</p>
      <h1 id="sale" className="ms-h2 ms-legal__h1">Terms of sale</h1>
      <h2 className="ms-legal__h2">1. What you buy</h2>
      <p>Coin packs: 5,000 coins for $5, 10,500 for $10, 27,500 for $25 and 57,500 for $50 (shown in your local currency, VAT included). Coins are used to buy cosmetic marbles, bags and limited editions in the shop. [Coins do / do not expire.]</p>
      <h2 className="ms-legal__h2">2. Payment</h2>
      <p>Payments on the website are handled by Stripe. In the iPhone and Android apps, purchases go through Apple or Google and follow their payment and refund rules.</p>
      <h2 className="ms-legal__h2">3. Right of withdrawal</h2>
      <p>Under EU consumer law you normally have 14 days to withdraw from an online purchase. For digital content delivered right away, that right ends once delivery starts, but only if you agreed to immediate delivery and confirmed that you lose the right. We ask for both at checkout.</p>
      <h2 className="ms-legal__h2">4. Refunds</h2>
      <p>Coins and items aren't refundable once delivered, except where the law requires it: for example a faulty delivery, a purchase made by a minor without a guardian's consent, or a successful chargeback. Contact us at [support email] and we'll help.</p>
      <h2 className="ms-legal__h2">5. Young players</h2>
      <p>Under 18? Ask a parent or guardian before buying. Parents can contact us about purchases made without their consent.</p>
      <h2 className="ms-legal__h2">6. Complaints</h2>
      <p>Contact us first. You can also turn to the Swedish National Board for Consumer Disputes (ARN) or the EU's online dispute platform.</p>
      <h1 id="privacy" className="ms-h2 ms-legal__h1">Privacy policy</h1>
      <h2 className="ms-legal__h2">What we collect</h2>
      <ul>
      <li>Account: player name, email, year of birth, and sign-in provider if you use Google or Apple.</li>
      <li>Gameplay: races, results, coins, your Marble Bag, friends and rooms.</li>
      <li>Purchases: what you bought and when. Card details stay with Stripe; we never see them.</li>
      <li>Technical: device and browser type, and anonymous usage statistics to improve the game.</li>
      </ul>
      <h2 className="ms-legal__h2">Why</h2>
      <p>To run the game and your account (contract), to handle purchases and bookkeeping (legal obligation), to keep play fair and improve the game (legitimate interest), and to send optional news only if you agree (consent).</p>
      <h2 className="ms-legal__h2">Who helps us</h2>
      <p>Hosting and services from [Vercel, Railway, Stripe, email provider, analytics]. Some are based outside the EU; we use the EU's standard contractual clauses or equivalent safeguards.</p>
      <h2 className="ms-legal__h2">How long</h2>
      <p>While your account is active, and [X months] after you close it. Purchase records are kept as long as bookkeeping law requires.</p>
      <h2 className="ms-legal__h2">Your rights</h2>
      <p>You can ask to see, correct, export or delete your data, and object to some uses. Contact [privacy email]. You can also complain to the Swedish Authority for Privacy Protection (IMY).</p>
      <h1 id="cookies" className="ms-h2 ms-legal__h1">Cookies</h1>
      <p>We use necessary cookies to keep you logged in and the game working. [Analytics cookies only with your consent, via the cookie banner.]</p>
      <h1 id="contact" className="ms-h2 ms-legal__h1">Contact</h1>
      <p>[support email] · [COMPANY NAME AB], [address], Sweden</p>
    </div>
  );
}
