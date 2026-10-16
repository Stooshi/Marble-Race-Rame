// Pre-launch fixes: the iPhone silent switch (ambient audio), no season until it is set, app store
// buttons only with real links, and no placeholder texts on the pages players see first.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { preferAmbientAudio } from '../src/app/native';
import economy from '../src/shared/economy.json';
import storeLinks from '../src/shared/storeLinks.json';

const src = (p) => readFileSync(join(__dirname, '..', p), 'utf8');

describe('iPhone silent switch', () => {
  it('asks for an ambient audio session in the iPhone app only', () => {
    const nav = { audioSession: { type: 'auto' } };
    expect(preferAmbientAudio(nav, 'ios')).toBe(true);
    expect(nav.audioSession.type).toBe('ambient');
    const web = { audioSession: { type: 'auto' } };
    expect(preferAmbientAudio(web, 'web')).toBe(false);
    expect(preferAmbientAudio(web, 'android')).toBe(false);
    expect(web.audioSession.type).toBe('auto');
    expect(preferAmbientAudio({}, 'ios')).toBe(false); // (older iOS: the app's own session does it)
  });

  it('the iPhone app sets the ambient category at launch', () => {
    expect(src('ios/App/App/AppDelegate.swift')).toMatch(/setCategory\(\.ambient/);
  });
});

describe('placeholders players would see', () => {
  it('no season until its number and dates are set', () => {
    const s = economy.season;
    const set = Number.isInteger(s.number) && Date.parse(s.startsAt ?? '') < Date.parse(s.endsAt ?? '');
    if (!set) {
      // The server reads the same settings: no season, so no label anywhere.
      expect(src('../src/routes/scoreboard.js')).toMatch(/seasonFrom\(economy\.season\)/);
    }
    expect(JSON.stringify(s)).not.toMatch(/\[/);
  });

  it('store buttons only with a real https link', () => {
    for (const k of ['appStore', 'googlePlay']) expect(storeLinks[k] === '' || /^https:\/\//.test(storeLinks[k])).toBe(true);
    expect(src('src/site/SiteFooter.jsx')).not.toMatch(/· soon/);
  });

  it('no bracket placeholders or "coming soon" logins on the main screens', () => {
    for (const f of ['src/site/SiteHeader.jsx', 'src/site/SiteFooter.jsx', 'src/site/landing/LandingPage.jsx', 'src/site/pages/SignupPage.jsx', 'src/site/pages/RaceFlow.jsx', 'src/site/pages/ScoresPage.jsx', 'src/site/pages/HomeHub.jsx']) {
      const text = src(f);
      expect(text, f).not.toMatch(/\[(streak|ROOM|soon|3)\]/i);
      expect(text, f).not.toMatch(/friend rooms (arrive|are coming)/i);
    }
  });
});

describe('company details', () => {
  it('are set once (shared/company.json) and no company placeholder is left', async () => {
    const { default: company } = await import('../src/shared/company.json');
    expect(company.name).toBe('Voltron Robotics AB');
    expect(company.orgNo).toMatch(/^\d{6}-\d{4}$/);
    expect(company.vatNo).toBe(`SE${company.orgNo.replace('-', '')}01`);
    expect(company.supportEmail).toMatch(/^support@marblespins\.com$/);
    expect(company.privacyEmail).toMatch(/^privacy@marblespins\.com$/);
    for (const f of ['src/site/pages/LegalPage.jsx', 'src/site/pages/CookiesPage.jsx', 'src/site/help/faq.js', 'src/site/SiteFooter.jsx', '../src/email/templates.js', '../src/payments/stripe.js']) {
      expect(src(f), f).not.toMatch(/\[(COMPANY NAME AB|XXXXXX-XXXX|address|support email|privacy email|date)\]/);
    }
    expect(src('src/site/pages/LegalPage.jsx')).toMatch(/data controller/);
    expect(src('src/site/pages/LegalPage.jsx')).toMatch(/DRAFT for legal review/); // (until Moses says)
  });
});

describe('contact', () => {
  it('the footer names the company and links Contact us and Legal, with no address or email', () => {
    const footer = src('src/site/SiteFooter.jsx');
    expect(footer).toMatch(/OPERATED_BY/);
    expect(footer).toMatch(/CONTACT_PATH/);
    expect(footer).toMatch(/to="\/legal#contact">Legal</);
    expect(footer).not.toMatch(/ADDRESS|supportEmail|mailto/);
  });

  it('/legal#contact leads with the form, then the details required by law, emails kept from bots', () => {
    const legal = src('src/site/pages/LegalPage.jsx');
    expect(legal).toMatch(/The quickest way to reach us is the contact form/);
    for (const k of ['company.name', 'company.orgNo', 'company.vatNo', 'company.street', 'company.postcode', 'company.city']) expect(legal).toContain(k);
    expect(legal).toMatch(/<ProtectedEmail address=\{company.supportEmail\} \/>/);
    expect(legal).toMatch(/<ProtectedEmail address=\{company.privacyEmail\} \/>/);
    expect(legal).not.toMatch(/mailto/);
    expect(src('src/site/ProtectedEmail.jsx')).toMatch(/\(at\)/);
  });
});

