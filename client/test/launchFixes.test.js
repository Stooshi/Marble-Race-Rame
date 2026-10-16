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
