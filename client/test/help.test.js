// The Help Centre (/help): its answers take their numbers from the game's settings, keep every
// [bracket] placeholder of the draft visible, every question has its own link, and the search
// finds questions in any word order, with typos and synonyms.
import { describe, expect, it } from 'vitest';
import economy from '../src/shared/economy.json';
import packs from '../src/shared/payments/packs.json';
import catalog from '../src/shared/marbles/catalog.json';
import { blocksText, buildFaq, CONTACT_CATEGORIES, faqStructuredData, placesLine, slugify } from '../src/site/help/faq';
import { buildIndex, distance, highlight, search, snippet, stem } from '../src/site/help/search';

const faq = buildFaq();
const all = faq.flatMap((s) => s.questions);
const bySlug = Object.fromEntries(all.map((q) => [q.slug, q]));
const index = buildIndex(faq);
const top = (query) => search(index, query)[0]?.question.slug;
const slugs = (query) => search(index, query).map((r) => r.question.slug);
const n = (v) => v.toLocaleString('en-US');

describe('the questions', () => {
  it('has the draft\'s 12 categories and the Season pass, every question once, each with its own link', () => {
    expect(faq.map((s) => s.title)).toEqual(['Getting started', 'Races', 'Fair play', 'Coins', 'Marbles and the collection', 'Buying coins',
      'Refunds', 'Season pass', 'Friend rooms', 'Account and settings', 'Younger players and parents', 'Technical help', 'Contact us']);
    expect(all.length).toBe(89); // (the draft: 6, 8, 4, 9, 10, 8, 4, 6, 7, 3, 5 and 4; then seasonal collections, the season marble and the Season pass's 11, with the pre-sale and the reminder; "How do I report an offensive player name?" and "How do I choose the country I race for?", 22 Oct)
    expect(faq.map((s) => s.questions.length)).toEqual([6, 8, 4, 9, 12, 8, 4, 11, 6, 9, 3, 5, 4]);
    expect(new Set(all.map((q) => q.slug)).size).toBe(all.length);
    for (const q of all) expect(q.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(bySlug['whats-my-daily-streak'].q).toBe("What's my daily streak?");
    expect(slugify('I paid but my coins didn’t arrive. What do I do?')).toBe('i-paid-but-my-coins-didnt-arrive-what-do-i-do');
  });

  it('keeps the [bracket] placeholders only Moses can answer, and fills the others (19 Oct)', () => {
    const text = all.map((q) => q.text).join('\n');
    for (const p of ['[coming at launch]', '[Live once email is switched on.]']) {
      expect(text, p).toContain(p);
    }
    expect(text).not.toContain('[2 working days]'); // (Moses, 22 Oct: filled)
    expect(bySlug['do-coins-expire'].text).toMatch(/^No\. Your coins stay in your account until you use them or delete your account/); // (Moses, 21 Oct)
    for (const p of ['[To decide:', '[Google and Apple sign-in: later.]', '[01:00 / 02:00 Swedish time]', '[To confirm:', '[approval process coming]', "[If there's a quality setting"]) {
      expect(text, p).not.toContain(p);
    }
    expect(bySlug['when-does-a-new-day-start'].text).toBe('At midnight UTC, which is 01:00 Swedish time in winter and 02:00 in summer.');
  });

  it('takes the coin numbers and prices from the game\'s settings', () => {
    const earn = bySlug['how-do-i-earn-coins'].text;
    expect(earn).toContain(`${economy.race.takingPart} coins for every race`);
    expect(placesLine()).toBe('1st place +50, 2nd +30, 3rd +20, 4th–10th +5');
    expect(placesLine([{ upTo: 1, coins: 60 }, { upTo: 3, coins: 1000 }])).toBe('1st place +60, 2nd–3rd +1,000');
    expect(earn).toContain(`finish ${economy.dailyGoal.races} races in a day for +${economy.dailyGoal.coins} coins`);
    expect(bySlug['why-did-i-earn-fewer-coins-later-in-the-day'].text)
      .toContain(`first ${economy.dailyLimit.fullRaces} races each day pay full coins. After that, each race pays ${economy.dailyLimit.coinsAfter} coins`);
    expect(bySlug['do-new-players-get-coins'].text).toContain(`${n(economy.startingCoins)} coins`);
    expect(bySlug['when-does-a-new-day-start'].text).toContain(`midnight ${economy.dayBoundary}`);
    const prices = bySlug['what-are-the-rarities-and-prices'].text;
    for (const r of ['common', 'uncommon', 'rare', 'epic', 'legendary']) expect(prices).toContain(`${catalog.rarities[r].label}, Price: ${n(catalog.rarities[r].price.coins)} coins`);
    for (const p of packs.packs) expect(bySlug['what-do-coin-packs-cost'].text).toContain(`Pack: $${p.amountCents / 100}, Coins: ${n(p.coins)}`);
    expect(bySlug['what-is-a-first-edition'].text).toContain(`first ${catalog.editionSize} copies`);
    // The launch limited edition, from the catalogue: 500 numbered copies, 25,000 coins, 1–31 December (Swedish time).
    expect(bySlug['what-is-a-limited-edition'].text).toContain('Our launch edition is Northern Lights: 500 numbered copies (#001 to #500) at 25,000 coins each, on sale from 1 December 2026 to 31 December 2026 (Swedish time)');
    const bags = bySlug['what-are-bags'].text;
    expect(bags).toContain(`${Math.round(economy.bags.starter.discount * 100)}% cheaper than buying them one by one`);
    expect(bags).toContain(`all 10 marbles of a collection, ${Math.round(economy.bags.full.discount * 100)}% cheaper`);
    expect(bags).toContain('the 3 Commons');
    expect(bySlug['what-are-shades'].text).toContain('5 shades: Classic, Ocean, Forest, Berry and Sunset');
    expect(bySlug['when-do-new-collections-come-out'].text).toContain('Next up: Handmade Heritage (8 Dec), Moonies & Glow (15 Dec) and Art Glass (22 Dec)');
  });

  it('reads as the draft, word for word, where nothing is a setting', () => {
    expect(bySlug['how-do-i-earn-coins'].text).toBe('By racing: 15 coins for every race you take part in. A finishing bonus: 1st place +50, 2nd +30, 3rd +20, 4th–10th +5. A daily goal: finish 5 races in a day for +35 coins.');
    // (no live list and no build count in tests: no made-up number, never the old draft's "50 tracks in five series")
    expect(bySlug['what-are-the-different-tracks'].text).toBe('There are dozens of tracks in several series. Each track has its own layout, start and scenery.');
    expect(bySlug['what-is-marble-spins'].text).toContain('on one of dozens of tracks');
    expect(bySlug['still-need-help'].text).toBe('Use the contact form below. Tell us your player name and, for payment questions, your order number. We aim to reply within 2 working days.');
  });

  it('fills the company details from shared/company.json (16 Oct 2026)', () => {
    const text = all.map((q) => q.text).join('\n');
    for (const p of ['[support email]', '[privacy email]', '[COMPANY NAME AB]', '[XXXXXX-XXXX]', '[address]']) expect(text).not.toContain(p);
    expect(bySlug['company-details'].text).toBe('Marble Spins is operated by Voltron Robotics AB, org.nr 559344-3756, VAT no. SE559344375601, Drivhjulsvägen 20, 126 30 Hägersten, Sweden. All our contact details are on the legal page, under Contact.');
    expect(bySlug['privacy-questions'].text).toMatch(/Privacy and your data/);
    // No written email addresses in the Help Centre: a Contact us button to the form instead.
    expect(all.map((q) => q.text).join(' ')).not.toMatch(/@marblespins\.com/);
    expect(bySlug['still-need-help'].blocks).toContainEqual(['contact', 'Contact us']);
  });

  it('counts the live tracks (rounded down to ten, so it never goes stale) and series when it has them', () => {
    const tracks = [...Array(57).fill({ series: 'World Tour' }), { series: 'Canyons' }, { series: 'Arcade' }, { series: 'Classic' }];
    const q = buildFaq({ tracks }).flatMap((s) => s.questions).find((x) => x.slug === 'what-are-the-different-tracks');
    expect(q.text).toBe('There are 60+ tracks in three series: World Tour, Arcade and Canyons. Each track has its own layout, start and scenery.');
  });

  it('says 90+ tracks in the eight live series (20 Oct 2026)', () => {
    const live = { 'Grand Prix': 11, 'World Tour': 13, Coasters: 12, Pinball: 7, Arcade: 7, Canyons: 15, Blocks: 15, 'Track and Field': 10 };
    const tracks = Object.entries(live).flatMap(([series, k]) => Array(k).fill({ series }));
    expect(tracks).toHaveLength(90);
    const qs = buildFaq({ tracks }).flatMap((s) => s.questions);
    expect(qs.find((x) => x.slug === 'what-are-the-different-tracks').text).toBe('There are 90+ tracks in eight series: Grand Prix, World Tour, Coasters, Pinball, Arcade, Canyons, Blocks and Track and Field. Each track has its own layout, start and scenery.');
    expect(qs.find((x) => x.slug === 'what-is-marble-spins').text).toContain('on one of 90+ tracks');
  });

  it('turns lists and tables into plain text for search and search engines', () => {
    expect(blocksText(['a **b**', ['ol', 'one', 'two'], ['table', ['X', 'Y'], ['1', '2']]])).toBe('a b 1. one 2. two X: 1, Y: 2');
  });

  it('gives search engines the answers without placeholders', () => {
    const data = faqStructuredData(faq, 'https://marblespins.com/help');
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity.length).toBeGreaterThan(55);
    for (const q of data.mainEntity) expect(`${q.name} ${q.acceptedAnswer.text}`).not.toMatch(/\[[^\]]+\]/);
    expect(data.mainEntity[0]).toEqual({ '@type': 'Question', name: 'What is Marble Spins?', acceptedAnswer: { '@type': 'Answer', text: bySlug['what-is-marble-spins'].text } });
  });

  it('offers the help sections as contact categories', () => {
    expect(CONTACT_CATEGORIES).toEqual([...faq.map((s) => s.title).filter((t) => t !== 'Contact us'), 'Privacy and your data', 'Something else']);
    for (const c of CONTACT_CATEGORIES) expect(c.length).toBeLessThanOrEqual(40); // (support_messages.category)
  });
});

describe('the season pass and seasonal answers', () => {
  it('say what the pass gives, until when, and what a refund takes back', () => {
    expect(bySlug['whats-in-the-holiday-season-pass'].text).toContain('$9.99');
    expect(bySlug['whats-in-the-holiday-season-pass'].text).toContain('all 31 holiday tracks from around the world, from 1 December 2026');
    expect(bySlug['how-long-does-the-pass-last'].text).toContain('7 January 2027 at 23:59 Swedish time');
    expect(bySlug['how-do-i-get-a-refund-for-the-pass'].text).toContain('Winter Solstice leaves your Marble Bag');
    expect(bySlug['what-is-the-holiday-track-of-the-day'].text).toContain("doesn't count on the scoreboards");
  });
  it('take the seasonal collection from the catalogue', () => {
    expect(bySlug['what-is-a-seasonal-collection'].text).toContain('Snowball (800 coins), Frost Clearie (800 coins), Candy Cane (2,000 coins), Evergreen (4,500 coins) and Midwinter Star (9,000 coins), on sale from 1 December 2026 to 7 January 2027');
    expect(bySlug['what-is-the-season-marble'].text).toContain('Holiday 2026 #0001');
  });
});

describe('the search', () => {
  it('waits for 2 letters', () => {
    expect(search(index, 'r')).toEqual([]);
    expect(search(index, '  ')).toEqual([]);
    expect(search(index, 're').length).toBeGreaterThan(0);
  });

  it('finds words in any order', () => {
    expect(top('delete account')).toBe('how-do-i-delete-my-account');
    expect(top('account delete')).toBe('how-do-i-delete-my-account');
    expect(top('coins earn')).toBe('how-do-i-earn-coins');
  });

  it('forgives typos and finishes the word being typed', () => {
    expect(top('refnud')).toBe('can-i-get-a-refund');
    expect(top('pasword')).toBe('i-forgot-my-password');
    expect(top('frist edition')).toBe('what-is-a-first-edition');
    expect(slugs('recei')).toContain('where-do-i-find-my-receipt');
    expect(slugs('streak')[0]).toBe('whats-my-daily-streak');
    expect(stem('refunds')).toBe(stem('refund'));
    expect(stem('deleting')).toBe(stem('delete'));
    expect(distance('refnud', 'refund')).toBe(1);
  });

  it('knows synonyms', () => {
    expect(slugs('money')).toEqual(expect.arrayContaining(['can-i-turn-coins-into-money', 'can-i-get-a-refund']));
    expect(slugs('card').slice(0, 4)).toContain('is-my-card-safe');
    expect(slugs('card')).toContain('how-can-i-pay');
    expect(slugs('remove my account')[0]).toBe('how-do-i-delete-my-account');
    expect(slugs('my kid bought coins')).toContain('my-child-bought-coins-without-asking-what-can-i-do');
    expect(slugs('lag')).toContain('the-game-is-slow-or-my-phone-gets-hot');
    expect(slugs('refnud mony').slice(0, 2)).toEqual(expect.arrayContaining(['can-i-get-a-refund']));
    expect(slugs('mony')).not.toContain('how-many-marbles-are-in-a-race');
  });

  it('says nothing for nonsense', () => {
    expect(search(index, 'zzxqv')).toEqual([]);
  });

  it('marks the matching words', () => {
    const [r] = search(index, 'delete account');
    expect(highlight(r.question.q, r.stems).filter((p) => p.hit).map((p) => p.text)).toEqual(['delete', 'account']);
    expect(highlight('Coins, coins!', new Set(['coin'])).map((p) => p.text).join('')).toBe('Coins, coins!');
    const s = snippet(bySlug['can-i-get-a-refund'].text, new Set(['refund']), 60);
    expect(s).toMatch(/refund/);
    expect(s.length).toBeLessThan(70);
  });
});
