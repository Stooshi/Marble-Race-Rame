import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ADDRESS, CONTACT_PATH, LEGAL_UPDATED, OPERATED_BY, company } from '../company';
import ProtectedEmail from '../ProtectedEmail';

/**
 * Terms of use, terms of sale, privacy, cookies and contact: the design's
 * draft text, for legal review before launch. [Brackets] are still to decide. The company's
 * details come from client/src/shared/company.json.
 */
export default function LegalPage() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  return (
    <div className="ms-page ms-page--narrow ms-legal">
      <div className="ms-msg ms-msg--bad">DRAFT for legal review before launch. Text in [brackets] still needs to be decided.</div>
      <span className="ms-note">Last updated {LEGAL_UPDATED} · {OPERATED_BY} · <a href="#contact">Contact details</a></span>
      <h1 id="use" className="ms-h2 ms-legal__h1">Terms of use</h1>
      <h2 className="ms-legal__h2">1. The game</h2>
      <p>Marble Spins is a free online marble racing game. Race results are decided by the game's physics. Every player's marble races at the same level, and nothing you buy changes how fast your marble is.</p>
      <h2 className="ms-legal__h2">2. Your account</h2>
      <p>You can race as a guest. To keep your progress you create an account. Keep your login details to yourself; you're responsible for what happens on your account. Players under [13] need a parent or guardian's approval.</p>
      <h2 className="ms-legal__h2">3. Fair play</h2>
      <p>No cheating, bots, automated play, exploiting bugs, or offensive player names. We may reset progress or close accounts that break these rules.</p>
      <h2 className="ms-legal__h2">4. Coins and marbles</h2>
      <p>Coins are the game's only currency. You earn them by racing or buy them in coin packs, and use them only in the shop; they can't be cashed out, exchanged for money or transferred. Scoreboards count only coins earned by racing. Marbles and other items are a licence to use them in the game; they have no cash value and aren't your property outside the game. [Trading between players, when introduced, will have its own rules.]</p>
      <h2 className="ms-legal__h2">5. Changes and availability</h2>
      <p>We keep improving the game, so tracks, items and features can change. We'll tell you about important changes to these terms before they apply.</p>
      <h1 id="sale" className="ms-h2 ms-legal__h1">Terms of sale</h1>
      <p>The seller is {company.name} (org.nr {company.orgNo}, VAT no. {company.vatNo}), {ADDRESS}. How to reach us: <a href="#contact">Contact</a>.</p>
      <h2 className="ms-legal__h2">1. What you buy</h2>
      <p>Coin packs: 5,000 coins for $5, 10,500 for $10, 27,500 for $25 and 57,500 for $50 (shown in your local currency, VAT included). Coins are used to buy cosmetic marbles, bags and limited editions in the shop. [Coins do / do not expire.]</p>
      <h2 className="ms-legal__h2">2. Payment</h2>
      <p>Payments on the website are handled by Stripe; we never see or store your card details. Your coins are added as soon as Stripe confirms the payment, and Stripe emails you a receipt. Each purchase has an order number, listed with its receipt on your Purchases page. In the iPhone and Android apps, purchases go through Apple or Google and follow their payment and refund rules.</p>
      <h2 className="ms-legal__h2">3. Right of withdrawal</h2>
      <p>Under EU consumer law you normally have 14 days to withdraw from an online purchase. For digital content delivered right away, that right ends once delivery starts, but only if you agreed to immediate delivery and confirmed that you lose the right. We ask for both at checkout.</p>
      <h2 className="ms-legal__h2">4. Refunds</h2>
      <p>Coins and items aren't refundable once delivered, except where the law requires it: for example a faulty delivery, a purchase made by a minor without a guardian's consent, or a successful chargeback. <Link to={CONTACT_PATH}>Contact us</Link> with your order number and we'll help. When a payment is refunded or reversed, the coins it added are removed from your account (only as many as are left, if some were already spent).</p>
      <h2 className="ms-legal__h2">5. Young players</h2>
      <p>Under 18? Ask a parent or guardian before buying. Parents can <Link to={CONTACT_PATH}>contact us</Link> about purchases made without their consent.</p>
      <h2 className="ms-legal__h2">6. Complaints</h2>
      <p><Link to={CONTACT_PATH}>Contact us</Link> first. You can also turn to the Swedish National Board for Consumer Disputes (ARN) or the EU's online dispute platform.</p>
      <h1 id="privacy" className="ms-h2 ms-legal__h1">Privacy policy</h1>
      <h2 className="ms-legal__h2">Who is responsible</h2>
      <p>{company.name} (org.nr {company.orgNo}), {ADDRESS}, is the data controller for the personal data handled in Marble Spins, on the website and in the apps. Questions about your data: <ProtectedEmail address={company.privacyEmail} />, or the <Link to={CONTACT_PATH}>contact form</Link>.</p>
      <h2 className="ms-legal__h2">What we collect</h2>
      <ul>
      <li>Account: player name, email, age group (under 13, 13–17, 18 or older), whether you want news by email, and sign-in provider if you use Google or Apple.</li>
      <li>Gameplay: races, results, coins, your Marble Bag, friends and rooms.</li>
      <li>Purchases: what you bought and when. Card details stay with Stripe; we never see them.</li>
      <li>Settings: your sound levels and similar choices, so they follow you to another device.</li>
      <li>Security: your IP address when you create an account, log in or buy coins. We use it only to protect accounts and to stop fraud, such as one person farming coins with many accounts or payment fraud. After 90 days we delete the IP address and keep only the country it came from.</li>
      <li>Website statistics and ad measurement, only if you allow them in the cookie banner (website only, never in the apps): which pages and features are used, and whether our ads led to a sign-up or purchase. Google and Meta get no name, email or player name from us; see the <Link to="/cookies">cookie policy</Link>.</li>
      <li>Support: what you send with the Help Centre's contact form (name, email, topic, order number, message and any screenshot), the device and browser it came from, and its IP address (to stop spam; deleted after 90 days like the others). We use it only to help you, and link it to your account so we can see your races and purchases.</li>
      </ul>
      <h2 className="ms-legal__h2">Why</h2>
      <p>To run the game and your account (contract), to handle purchases and bookkeeping (legal obligation), to keep play fair and stop fraud (legitimate interest), and to send optional news and measure the website's use and our ads only if you agree (consent; you can withdraw it at any time in "Cookie settings").</p>
      <h2 className="ms-legal__h2">Who helps us</h2>
      <p>Hosting and services from Vercel (website), Railway (game server and database) and Stripe (payments on the website) and Brevo (account emails such as password resets, and news emails if you agree; based in the EU). In the iPhone and Android apps, purchases are handled by Apple and Google. On the website only, and only if you allow it: Google Analytics (Google Ireland Ltd.) for statistics, and the Meta Pixel (Meta Platforms Ireland Ltd.) and Google's ad signals for measuring our ads; never for players under 13. The apps use no analytics, advertising or tracking services. Some are based outside the EU; we use the EU's standard contractual clauses or equivalent safeguards.</p>
      <h2 className="ms-legal__h2">How long</h2>
      <p>While your account is active, and [X months] after you close it. Purchase records are kept as long as bookkeeping law requires. IP addresses are kept for at most 90 days, then only the country.</p>
      <h2 className="ms-legal__h2">Your rights</h2>
      <p>You can ask to see, correct, export or delete your data, and object to some uses. In your account's Settings you can download your data, turn news emails on or off (every news email also has an unsubscribe link), and delete your account at once. Deleting removes your name, email, password, settings, email answers, support messages and IP addresses; race results stay under an anonymous name so other players' places don't change, and purchase records are kept without your name for as long as bookkeeping law requires (7 years in Sweden). For anything else, or to make a request about your data, email <ProtectedEmail address={company.privacyEmail} /> or use the <Link to={CONTACT_PATH}>contact form</Link>. You can also complain to the Swedish Authority for Privacy Protection (IMY).</p>
      <h1 id="cookies" className="ms-h2 ms-legal__h1">Cookies</h1>
      <p>To keep you logged in and remember your choices (such as sound levels), the website stores a few items in your browser; they are necessary for the game to work. Statistics cookies (Google Analytics) and marketing cookies (Meta Pixel) are used only if you allow them in the cookie banner, and you can change your choice any time with "Cookie settings" at the bottom of every page. The full list is in our <Link to="/cookies">cookie policy</Link>.</p>
      <h1 id="contact" className="ms-h2 ms-legal__h1">Contact</h1>
      <p>The quickest way to reach us is the contact form.</p>
      <div><Link to={CONTACT_PATH} className="ms-btn ms-btn--primary">CONTACT US</Link></div>
      <p>{OPERATED_BY}.</p>
      <address className="ms-legal__address">
        {company.name}<br />
        Org.nr {company.orgNo} · VAT no. {company.vatNo}<br />
        {company.street}<br />
        {company.postcode} {company.city}, {company.country}
      </address>
      <ul>
        <li>Support: <ProtectedEmail address={company.supportEmail} /></li>
        <li>Privacy and data requests: <ProtectedEmail address={company.privacyEmail} /></li>
      </ul>
      <p className="ms-note">The country of an IP address is looked up with GeoLite2 data created by MaxMind, available from maxmind.com.</p>
    </div>
  );
}
