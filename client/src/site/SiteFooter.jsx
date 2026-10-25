import { Link } from 'react-router-dom';
import { openCookieSettings } from './consent/consent';
import { isNativeApp } from '../app/native';
import storeLinks from '../shared/storeLinks.json';
import { CONTACT_PATH, OPERATED_BY } from './company';
import SocialLinks from './SocialLinks';

// The app store buttons: on the website only, and only once a real store link is set.
const STORES = [['App Store', storeLinks.appStore], ['Google Play', storeLinks.googlePlay]].filter(([, url]) => /^https:\/\//.test(url ?? ''));

export default function SiteFooter() {
  const app = isNativeApp();
  return (
    <footer className="ms-footer">
      <div className="ms-footer__inner">
        <span className="ms-logo" style={{ fontSize: 26 }}>marblespins</span>
        <nav aria-label="Footer" className="ms-footer__nav">
          <Link to="/help">Help Centre</Link><Link to="/shop">Shop</Link><Link to="/legal#use">Terms</Link><Link to="/legal#privacy">Privacy</Link><Link to="/cookies">Cookies</Link><Link to="/tracks">Tracks</Link><Link to={CONTACT_PATH}>Contact us</Link>
          {/* (The apps: Settings, with "Delete my account", one tap from every page, for guests too. App Store 5.1.1(v), Google Play account deletion.) */}
          {app && <Link to="/settings">Settings</Link>}
          {!app && <button type="button" className="ms-footer__link" onClick={openCookieSettings}>Cookie settings</button>}
        </nav>
        <SocialLinks />
        <p className="ms-footer__company">{OPERATED_BY} · <Link to={CONTACT_PATH}>Contact us</Link> · <Link to="/legal#contact">Legal</Link></p>
        {/* (Which build this is: the apps and the website alike; vite.config.js BUILD_STAMP.) */}
        <p className="ms-footer__build">Build {import.meta.env.VITE_BUILD_STAMP || 'dev'}{app ? ' · app' : ''}</p>
        {!app && STORES.length > 0 && (
          <div className="ms-footer__stores">{STORES.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noopener noreferrer">{name}</a>)}</div>
        )}
      </div>
    </footer>
  );
}
