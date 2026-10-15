import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="ms-footer">
      <div className="ms-footer__inner">
        <span className="ms-logo" style={{ fontSize: 26 }}>marblespins</span>
        <nav aria-label="Footer" className="ms-footer__nav">
          <Link to="/help">Help Centre</Link><Link to="/shop">Shop</Link><Link to="/legal#use">Terms</Link><Link to="/legal#privacy">Privacy</Link><Link to="/help#contact">Contact us</Link>
        </nav>
        <span>@marblespins on TikTok, Instagram and YouTube</span>
        <div className="ms-footer__stores"><span>App Store · soon</span><span>Google Play · soon</span></div>
      </div>
    </footer>
  );
}
