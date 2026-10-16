import { Link } from 'react-router-dom';
import { openCookieSettings } from './consent/consent';
import { isNativeApp } from '../app/native';
import storeLinks from '../shared/storeLinks.json';
import { ADDRESS, OPERATED_BY, company } from './company';

// The app store buttons: on the website only, and only once a real store link is set.
const STORES = [['App Store', storeLinks.appStore], ['Google Play', storeLinks.googlePlay]].filter(([, url]) => /^https:\/\//.test(url ?? ''));

export default function SiteFooter() {
  const app = isNativeApp();
  return (
    <footer className="ms-footer">
      <div className="ms-footer__inner">
        <span className="ms-logo" style={{ fontSize: 26 }}>marblespins</span>
        <nav aria-label="Footer" className="ms-footer__nav">
          <Link to="/help">Help Centre</Link><Link to="/shop">Shop</Link><Link to="/legal#use">Terms</Link><Link to="/legal#privacy">Privacy</Link><Link to="/cookies">Cookies</Link><Link to="/tracks">Tracks</Link><Link to="/help#contact">Contact us</Link>
          {!app && <button type="button" className="ms-footer__link" onClick={openCookieSettings}>Cookie settings</button>}
        </nav>
        <span>@marblespins on TikTok, Instagram and YouTube</span>
        <p className="ms-footer__company">{OPERATED_BY} · {ADDRESS} · <a href={`mailto:${company.supportEmail}`}>{company.supportEmail}</a></p>
        {!app && STORES.length > 0 && (
          <div className="ms-footer__stores">{STORES.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noopener noreferrer">{name}</a>)}</div>
        )}
      </div>
    </footer>
  );
}
