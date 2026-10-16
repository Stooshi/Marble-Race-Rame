import { Link } from 'react-router-dom';
import { CATEGORIES, STORAGE_LIST, openCookieSettings, readConsent } from '../consent/consent';
import { META_PIXEL_ID, GA4_ID } from '../consent/tracking';
import { ADDRESS, company } from '../company';

const TITLES = { necessary: 'Necessary', statistics: 'Statistics', marketing: 'Marketing' };
const ABOUT = {
  necessary: 'Needed for the game to work: logging in, your settings, and remembering your cookie choice. These need no consent and can\'t be switched off.',
  statistics: 'Help us see how the site is used (which pages, which features, how many visits), so we can make it better. Used only if you allow them.',
  marketing: 'Measure whether our ads on Facebook, Instagram and Google lead to sign-ups and purchases. Used only if you allow them, and never for players under 13.',
};

/** /cookies: what the website stores in your browser, by category, and your choice. */
export default function CookiesPage() {
  const consent = readConsent();
  const yours = consent
    ? CATEGORIES.map((c) => `${TITLES[c]}: ${consent[c] ? 'allowed' : 'not allowed'}`).join(' · ')
    : 'You haven\'t chosen yet, so only necessary storage is used.';
  return (
    <div className="ms-page ms-page--narrow ms-legal">
      <h1 className="ms-h2 ms-legal__h1">Cookie policy</h1>
      <p>Marble Spins stores a few small items in your browser (cookies, and the browser's local and session storage). This page lists all of them. The iPhone and Android apps use none of the statistics or marketing ones.</p>
      <p>Responsible for this (the data controller): {company.name}, org.nr {company.orgNo}, {ADDRESS}. Questions: <a href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</a>.</p>
      <div className="ms-card" style={{ display: 'grid', gap: 10 }}>
        <strong>Your choice</strong>
        <span>{yours}</span>
        <div><button type="button" className="ms-btn ms-btn--sm" onClick={openCookieSettings}>CHANGE MY COOKIE SETTINGS</button></div>
      </div>
      {['necessary', ...CATEGORIES].map((cat) => {
        const rows = STORAGE_LIST.filter((r) => r.category === cat);
        const off = (cat === 'statistics' && !GA4_ID) || (cat === 'marketing' && !META_PIXEL_ID);
        return (
          <section key={cat} aria-labelledby={`cookies-${cat}`}>
            <h2 id={`cookies-${cat}`} className="ms-legal__h2">{TITLES[cat]}</h2>
            <p>{ABOUT[cat]}{off ? ' (Not in use at the moment.)' : ''}</p>
            <div className="ms-cookie-table-wrap">
              <table className="ms-cookie-table">
                <thead><tr><th scope="col">Name</th><th scope="col">Where</th><th scope="col">Set by</th><th scope="col">What for</th><th scope="col">How long</th></tr></thead>
                <tbody>{rows.map((r) => <tr key={r.name}><td><code>{r.name}</code></td><td>{r.where}</td><td>{r.by}</td><td>{r.why}</td><td>{r.lasts}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        );
      })}
      <h2 className="ms-legal__h2">Your choice is kept</h2>
      <p>In this browser, and, when you're logged in, with your account (the time, the version of this page and your choice per category) as a record of your consent. It's included in "Download my data" and deleted with your account. You can change your mind any time with "Cookie settings" at the bottom of every page; withdrawing consent stops the statistics or marketing tools and removes their cookies from this site.</p>
      <p>Google and Meta receive no name, email or player name from us. Read more in the <Link to="/legal#privacy">privacy policy</Link>.</p>
    </div>
  );
}
