// App Store and Google Play rules the apps' own screens must keep (docs/08-store-rules.md):
//   - inside the apps, buying is shown only through that app's store: no website price, no Stripe;
//   - the iPhone app doesn't name Android or Google Play (App Store 2.3.10);
//   - deleting an account is easy to find in the apps, and the Help Centre's answer (the page
//     Google Play's Data safety form links to) works without the app: steps, what goes, what stays.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildFaq } from '../src/site/help/faq';
import { shownPrice } from '../src/site/payments';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const questions = (platform) => buildFaq({ platform }).flatMap((s) => s.questions);
const bySlug = (platform) => Object.fromEntries(questions(platform).map((q) => [q.slug, q]));
const buyingSections = ['Buying coins', 'Refunds', 'Season pass', 'Younger players and parents'];
const buyingText = (platform) => buildFaq({ platform }).filter((s) => buyingSections.includes(s.title)).flatMap((s) => s.questions).map((q) => `${q.q} ${q.text}`).join('\n');

describe('prices in the apps', () => {
  it('the apps show only the store\'s own price, never the website\'s', () => {
    expect(shownPrice('coins-10500', '$10', {}, 'apple')).toBeNull();
    expect(shownPrice('coins-10500', '$10', {}, 'google')).toBeNull();
    expect(shownPrice('coins-10500', '$10', { 'coins-10500': '109,00 kr' }, 'apple')).toBe('109,00 kr');
    expect(shownPrice('coins-10500', '$10', { 'coins-10500': '109,00 kr' }, 'stripe')).toBe('$10');
    expect(shownPrice('coins-10500', '$10', {}, 'test')).toBe('$10');
  });

  it('the shop and checkout go through shownPrice (no "?? priceLabel" fallback)', () => {
    for (const f of ['src/site/pages/ShopPage.jsx', 'src/site/pages/CheckoutPage.jsx']) {
      expect(src(f), f).toMatch(/shownPrice\(/);
      expect(src(f), f).not.toMatch(/storePrices\[p(ack)?\.id\] \?\? /);
    }
  });
});

describe('the Help Centre inside the apps', () => {
  it('the website keeps its answers (95 questions, the price table, Stripe)', () => {
    expect(questions('web').length).toBe(95);
    expect(bySlug('web')['what-do-coin-packs-cost'].text).toMatch(/Pack: \$5, Coins: 5,000/);
    expect(buyingText('web')).toMatch(/Stripe/);
  });

  for (const platform of ['ios', 'android']) {
    it(`${platform}: no website price, no Stripe, no placeholder about the apps`, () => {
      const text = buyingText(platform);
      expect(text).not.toMatch(/\$\d/);
      expect(text).not.toMatch(/Stripe|on the website: card/i);
      expect(bySlug(platform)['what-do-coin-packs-cost'].text).toMatch(/5,000, 10,500, 27,500 and 57,500 coins/);
      expect(bySlug(platform)['what-can-i-play-on'].text).not.toMatch(/\[coming at launch\]/);
    });
  }

  it('ios: never names Android or Google Play; android: no iPhone restore question', () => {
    const all = questions('ios').map((q) => `${q.q} ${q.text}`).join('\n');
    expect(all).not.toMatch(/Android|Google/);
    expect(bySlug('ios')['how-do-i-restore-my-pass-on-iphone']).toBeTruthy();
    expect(bySlug('android')['how-do-i-restore-my-pass-on-iphone']).toBeUndefined();
    expect(buyingText('android')).not.toMatch(/Apple|iPhone/);
  });
});

describe('deleting an account', () => {
  it('the answer gives the steps in the app and without it, and what is deleted and kept', () => {
    for (const platform of ['web', 'ios', 'android']) {
      const a = bySlug(platform)['how-do-i-delete-my-account'];
      expect(a.text).toMatch(/Settings/);
      expect(a.text).toMatch(/Marble Bag/); // (guests)
      expect(a.text).toMatch(/Without the app: log in at marblespins\.com/);
      expect(a.text).toMatch(/Privacy and your data/);
      expect(a.text).toMatch(/Voltron Robotics AB, who runs Marble Spins/);
      expect(a.text).toMatch(/kept for 7 years/);
      expect(a.text).toMatch(/no subscriptions to cancel/);
      expect(a.blocks.some((b) => Array.isArray(b) && b[0] === 'contact')).toBe(true);
    }
  });

  it('Settings is in the apps\' footer, and Settings has the delete button for guests and saved accounts', () => {
    expect(src('src/site/SiteFooter.jsx')).toMatch(/\{app && <Link to="\/settings">Settings<\/Link>\}/);
    const settings = src('src/site/pages/SettingsPage.jsx');
    expect(settings).toMatch(/<DeleteAccount user=\{user\} onDeleted=\{\(\) => \{ logout\(\); navigate\('\/\?deleted=1'\); \}\} \/>/);
    expect(settings).toMatch(/api\.deleteAccount\(\{ confirm: typed\.trim\(\), \.\.\.\(!guest && \{ password \}\) \}\)/);
  });
});

describe('other app-only texts', () => {
  it('the landing page\'s "download anything" answer is website only; gift codes never in the apps', () => {
    expect(src('src/site/landing/LandingPage.jsx')).toMatch(/Apps for iPhone and Android are on the way\.', true\]/);
    expect(src('src/site/landing/LandingPage.jsx')).toMatch(/!\(webOnly && isNativeApp\(\)\)/);
    expect(src('src/site/pages/RedeemPage.jsx')).toMatch(/giftCodesOn = \(\) => giftCodes\.enabled === true && !isNativeApp\(\)/);
  });

  it('no social sign-in buttons (so App Store 4.8 does not apply yet)', () => {
    for (const f of ['src/site/pages/SignupPage.jsx', 'src/site/account/QuickSignup.jsx']) {
      expect(src(f), f).not.toMatch(/Sign in with (Apple|Google)|Continue with (Apple|Google)/i);
    }
  });
});
