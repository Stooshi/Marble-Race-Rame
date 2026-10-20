import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { lang as browserLang } from '../account/saveTexts';

/**
 * The home page's banner under the hero race (Moses, 20 Oct 2026): short and punchy, no explanations.
 * English, or Swedish for a Swedish browser (set after the first paint, so the pre-rendered page and
 * the app agree). The button does what "Play free" does.
 */
const TEXTS = {
  en: { h: 'Race. Earn. Collect.', points: ['Coins every race', '50 marbles to own', 'Your wins on record', 'Climb the season'], cta: "Start racing, it's free" },
  sv: { h: 'Tävla. Tjäna. Samla.', points: ['Mynt varje lopp', '50 kulor att äga', 'Dina vinster sparas', 'Klättra i säsongen'], cta: 'Börja tävla, det är gratis' },
};

const ICONS = [
  // A coin.
  <svg key="coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="currentColor" /><circle cx="12" cy="12" r="6" fill="none" stroke="var(--ms-ink)" strokeWidth="1.8" opacity=".3" /><path d="M9.6 9.3a6 6 0 0 1 3.6-1.1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".7" /></svg>,
  // A marble.
  <svg key="marble" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="M5 13c3-4 9-5 14-2" stroke="var(--ms-ink)" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".45" /><circle cx="9" cy="8.5" r="2" fill="#fff" opacity=".8" /></svg>,
  // A trophy.
  <svg key="trophy" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" fill="currentColor" /><path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" stroke="currentColor" strokeWidth="1.8" fill="none" /><path d="M12 13v4M8 20h8M9.5 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  // Climbing bars.
  <svg key="climb" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="14" width="4.5" height="7" rx="1" fill="currentColor" opacity=".55" /><rect x="9.75" y="9.5" width="4.5" height="11.5" rx="1" fill="currentColor" opacity=".8" /><rect x="16.5" y="4" width="4.5" height="17" rx="1" fill="currentColor" /></svg>,
];

export default function PromoBanner() {
  const [lang, setLang] = useState('en');
  useEffect(() => setLang(browserLang()), []);
  const t = TEXTS[lang];
  return (
    <section aria-labelledby="promo-h" className="ms-page ms-promo-wrap">
      <div className="ms-promo" lang={lang}>
        <h2 id="promo-h" className="ms-promo__h">{t.h}</h2>
        <ul className="ms-promo__points">
          {t.points.map((p, i) => <li key={p}>{ICONS[i]}<span>{p}</span></li>)}
        </ul>
        <Link to="/play/start?quick=1" className="ms-btn ms-btn--primary ms-btn--lg ms-promo__cta">{t.cta}</Link>
      </div>
    </section>
  );
}
