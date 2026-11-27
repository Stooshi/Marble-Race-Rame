import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { lang as browserLang } from './saveTexts';

const TEXT = {
  en: { title: 'Confirm your email', working: 'One moment…', ok: 'Thanks: your email is confirmed and your marble is saved for good.', bad: 'This link has expired or is incomplete. Log in and ask for a new one in Settings.', go: 'KEEP RACING' },
  sv: { title: 'Bekräfta din e-post', working: 'Ett ögonblick…', ok: 'Tack! Din e-post är bekräftad och din kula är sparad för gott.', bad: 'Länken har gått ut eller är ofullständig. Logga in och be om en ny under Inställningar.', go: 'KÖR VIDARE' },
};

/** /confirm-email?t=<token>: the link in the sign-up's confirmation email (src/account/emailConfirm.js). */
export default function ConfirmEmailPage() {
  const [search] = useSearchParams();
  const { refreshUser } = useAuth();
  const t = TEXT[browserLang()];
  const [state, setState] = useState('working');
  useEffect(() => {
    const token = search.get('t');
    if (!token) { setState('bad'); return; }
    api.confirmEmail(token).then(() => { setState('ok'); refreshUser?.(); }).catch(() => setState('bad'));
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="ms-page ms-page--narrow">
      <section className="ms-card" style={{ display: 'grid', gap: 12 }} aria-live="polite">
        <h1 className="ms-h2" style={{ margin: 0 }}>{t.title}</h1>
        <p className="ms-lede" style={{ margin: 0 }}>{t[state]}</p>
        <div className="ms-row"><Link to="/" className="ms-btn ms-btn--primary">{t.go}</Link></div>
      </section>
    </div>
  );
}
