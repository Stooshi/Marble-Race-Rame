/**
 * The Help Centre's questions and answers (/help), from the project doc claude/help-faq-draft.md.
 *
 * The texts are the draft's, word for word. Items in [brackets] are still to be decided and stay
 * visible as placeholders. Every number that is a game setting comes from the same files the game
 * reads, so the answers stay right when a setting changes:
 *   client/src/shared/economy.json          coins per race, places, daily goal and limit, starting coins, bag discounts
 *   client/src/shared/payments/packs.json   coin packs and their prices
 *   client/src/shared/marbles/catalog.json  marble prices by rarity, First Edition size, shades, collections coming soon
 *   client/src/shared/company.json          company name, org. no., address, support and privacy email
 * and the number of tracks and series from the live track list when the page has it.
 *
 * An answer is a list of blocks:
 *   'text'                        a paragraph (inline: **bold**, [placeholder])
 *   ['ul' | 'ol', ...items]       a list
 *   ['table', [heads], ...rows]   a table
 *   ['contact', label]            a button to the contact form (/help#contact)
 *   ['social']                    the social media icon links (website only)
 */
import economy from '../../shared/economy.json';
import { COIN_PACKS } from '../../shared/payments/packs';
import { catalog, isStandard } from '../../shared/marbles';
import supportSettings from '../../shared/support.json';
import company from '../../shared/company.json';
import { BUILD_TRACK_COUNT, BUILD_TRACK_SERIES, roundedTracks } from '../trackCount';
import { FREE_TO_PLAY, holidayPassNeeded } from '../../shared/holidayWording';

const n = (v) => Number(v).toLocaleString('en-US');
const ordinal = (k) => `${k}${['th', 'st', 'nd', 'rd'][(k % 100 > 10 && k % 100 < 14) || k % 10 > 3 ? 0 : k % 10]}`;
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const listJoin = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };

/** The series as the draft names them, in its order (the live track list decides which exist). */
export const SERIES_ORDER = ['Grand Prix', 'World Tour', 'Coasters', 'Pinball', 'Arcade', 'Canyons', 'Blocks', 'Track and Field', 'Rivers', 'Peaks', 'Winter Wonders'];

/** "1st place +50, 2nd +30, 3rd +20, 4th–10th +5" from economy.race.places. */
export function placesLine(places = economy.race.places) {
  let from = 1;
  return places.map(({ upTo, coins }, k) => {
    const label = from === upTo ? ordinal(from) : `${ordinal(from)}–${ordinal(upTo)}`;
    from = upTo + 1;
    return `${label}${k === 0 ? ' place' : ''} +${n(coins)}`;
  }).join(', ');
}

const percent = (share) => `${Math.round(share * 100)}%`;

/** Lowercase, accents off, punctuation to dashes: "What's my daily streak?" → whats-my-daily-streak. */
export function slugify(text) {
  return String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** The limited edition answer, from the catalogue: what one is, and the one on sale (or coming). */
function limitedAnswer() {
  const base = "A special marble sold for a short time only. Every copy is numbered and comes with a First Edition certificate. Once its sale ends or it sells out, it's never sold again.";
  const ltd = catalog.designs.find((d) => d.limited);
  if (!ltd) return base;
  const day = (iso, back = 0) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Stockholm' }).format(new Date(new Date(iso).getTime() - back));
  const size = ltd.limited.editionSize;
  const price = catalog.rarities[ltd.rarity].price.coins;
  return `${base} Our launch edition is **${ltd.name}**: ${n(size)} numbered copies (#001 to #${String(size).padStart(3, '0')}) at ${n(price)} coins each, on sale from ${day(ltd.limited.saleStartsAt)} to ${day(ltd.limited.saleEndsAt, 1)} (Swedish time), or until they're sold out. Until then it's in the shop as "coming", without a buy button.`;
}

/**
 * The Holiday Season 2026 as the Help Centre tells it (the season itself is the `seasons` row of the
 * data update 2027-02-16-season-pass, its sale start moved to 28 Nov by 2027-03-22-holiday-pass-pre-sale;
 * keep these in step with them, and with the pass page).
 */
const HOLIDAY = {
  name: 'Holiday Season 2026', pass: 'Holiday Season Pass 2026', price: '$9.99', saleStarts: '28 November 2026', starts: '1 December 2026', ends: '7 January 2027',
  endTime: '23:59 Swedish time', tracks: 31, bonus: 50, marble: 'Winter Solstice',
};

/** A seasonal collection's answer, from the catalogue: what one is, and the one on sale (or coming). */
function seasonalAnswer() {
  const base = "A collection sold for one season only, at its own prices. When the season ends it's **retired**: never sold again. If you have one, it's yours to keep and race, and its certificate says when it was retired.";
  const code = Object.keys(catalog.collections ?? {}).find((k) => catalog.collections[k].kind === 'seasonal');
  if (!code) return base;
  const col = catalog.collections[code];
  const designs = catalog.designs.filter((d) => d.collection === code);
  const day = (iso, back = 0) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Stockholm' }).format(new Date(new Date(iso).getTime() - back));
  const list = listJoin(designs.map((d) => `${d.name} (${n(col.prices[d.rarity].coins)} coins)`));
  return `${base} This season it's **${col.name}**: ${list}, on sale from ${day(col.releaseAt)} to ${day(col.retireAt, 1000)} (Swedish time), on the **Seasonal** shelf in the shop.`;
}

/**
 * The 13 categories with their questions. `tracks`: the live track list ([{ series }]) when the page
 * has it, for the number of tracks and series; without it, the build's live count and series
 * (src/site/trackCount.js); without those either (no server at build time), no numbers at all.
 * `platform`: 'web' (the website, and the pre-rendered pages), 'ios' or 'android' (inside an app,
 * from app/native.js). In an app the answers about buying name only that app's store and show no
 * website price or Stripe (App Store 3.1.1 and 3.1.3, Google Play Payments), and the iPhone app
 * doesn't name Android or Google Play (App Store 2.3.10). See docs/08-store-rules.md.
 */
export function buildFaq({ tracks, platform = 'web' } = {}) {
  const e = economy;
  const app = platform === 'ios' || platform === 'android';
  const ios = platform === 'ios';
  const STORE = ios ? 'the App Store' : 'Google Play';
  const STORE_CO = ios ? 'Apple' : 'Google';
  const ACCOUNT = ios ? 'Apple account' : 'Google account';
  const APP_REFUND = ios ? 'ask Apple at reportaproblem.apple.com' : 'ask Google in your Google Play order history';
  const live = Array.isArray(tracks) && tracks.length > 0;
  // Rounded down ("80+"), so an answer never goes stale between builds (src/site/trackCount.js).
  const trackCount = roundedTracks(live ? tracks.length : BUILD_TRACK_COUNT); // (null: no count known)
  const known = live ? tracks.map((t) => t.series) : BUILD_TRACK_SERIES;
  // (in the site's own order; a series the Help Centre doesn't know yet goes at the end)
  const seriesNames = [...SERIES_ORDER.filter((s) => known.includes(s)), ...new Set(known.filter((s) => s && s !== 'Classic' && !SERIES_ORDER.includes(s)))];
  const seriesWord = NUMBER_WORDS[seriesNames.length] ?? String(seriesNames.length);

  const collectionDesigns = catalog.designs.filter(isStandard);
  const commons = collectionDesigns.filter((d) => d.rarity === 'common').length;
  const shades = catalog.designs[0].shades.map((s) => s.name);
  const rarityRows = ['common', 'uncommon', 'rare', 'epic', 'legendary']
    .map((r) => [catalog.rarities[r].label, `${n(catalog.rarities[r].price.coins)} coins`]);
  const edition = catalog.editionSize;
  const soon = (catalog.comingSoon ?? []).map((c) => `${c.name} (${shortDate(c.date)})`);
  const packRows = COIN_PACKS.map((p) => [p.priceLabel, n(p.coins)]);
  const { starter, full } = e.bags;

  const sections = [
    ['Getting started', [
      ['What is Marble Spins?',
        `Marble Spins is a free online marble racing game. You pick a marble, drop it into a race of 20 marbles on ${trackCount ? `one of ${trackCount} tracks` : 'one of dozens of tracks'}, and race for the win. You can play solo against computer players or race your friends.`],
      ['How do I play my first race?',
        "Tap **Play free**. That's it: you go straight into the next quick race, which starts within seconds. Your first race needs no sign-up: we create a guest account for you automatically."],
      ['Do I need an account?',
        'No. You can race as a guest straight away. To keep your coins, marbles and progress on every device, save your account with your email and a password at any time.'],
      ["What's the difference between a guest and a saved account?",
        "A guest account lives on the device you're using. If you clear your browser, switch phones or log out, a guest account can be lost. Guests are also lost after 90 days away: save your marble to keep it. When you tap **Save your marble**, everything you've won as a guest moves into your saved account, and you can log in anywhere."],
      ['What can I play on?',
        app
          ? "This app, or any modern browser on a phone, tablet or computer at marblespins.com. It's the same game and the same account everywhere."
          : "Any modern browser on a phone, tablet or computer at marblespins.com. The iPhone and Android apps are [coming at launch]. It's the same game and the same account everywhere."],
      ['Is it really free?',
        holidayPassNeeded()
          ? `Yes. ${FREE_TO_PLAY} until ${HOLIDAY.ends}; every other track and every way of earning coins is free. You can buy coins if you want to collect marbles faster, but you never need to, and buying never makes your marble faster.`
          : 'Yes. Every race, every track and every way of earning coins is free. You can buy coins if you want to collect marbles faster, but you never need to, and buying never makes your marble faster.'],
    ]],
    ['Races', [
      ['How is a race decided?',
        "Every race is run by the game's physics, the same for every marble. Every player's marble races at the same level, whatever it looks like and however long you've played. The race itself decides who wins: the track, the start, the bumps and the bounces. Which marble you race with never changes the result."],
      ['Can I steer my marble during the race?',
        'No. Once the gates open, the race is decided by the track and the physics. Your choices are which track, which marble, and who you race.'],
      ['What is a quick race?',
        "Tap **Quick race** and you're racing within seconds. You join the next quick race that's about to start with a free place, or a new one opens on a random track and starts 15 seconds later; anyone else who taps Quick race meanwhile joins it. Computer players fill the empty places. You don't pick the track. To pick it, tap **Race solo** (just you and computer players) or make a room."],
      ['How many marbles are in a race?',
        "Always 20. If there aren't 20 players, computer players fill the empty places."],
      ['Who are the computer players?',
        "Computer players fill the empty places so every race is full. Each has a fun made-up name and its own plain marble colour, and they're always marked with a small **robot icon** next to their name (\"Computer player\"). They race by the same physics as everyone else, and their names and colours never change a result."],
      ['What is a beginner race?',
        `A race where every player is new (fewer than ${catalog.showcase.beginnerMaxRaces} finished races) is a beginner race: its computer players race in marbles from the shop, so you can see what's available.`],
      ['Why do some computer players have special marbles?',
        "In beginner races, some computer players race with marbles from the shop so you can see what's available. Their marbles don't change results; every marble races exactly the same. Tap any marble after the race to see its name and where to get it."],
      ['What are the different tracks?',
        `There are ${trackCount ?? 'dozens of'} tracks in ${seriesNames.length ? `${seriesWord} series: ${listJoin(seriesNames)}` : 'several series'}. Each track has its own layout, start and scenery.`],
      ['Why did my marble lose? Is it random?',
        "Marble racing is close and unpredictable: a small bump at the start can change everything. Every player races at the same level, so over many races, every player's results even out. That's what makes each race exciting."],
    ]],
    ['Fair play', [
      ['Does paying make my marble faster?',
        "No, never. Marbles you buy change how your marble looks, not how it races. Every player's marble races at the same level."],
      ['Why do scoreboards only count earned coins?',
        'So that money can never buy a place on a scoreboard. Scoreboards rank coins earned by racing, never coins bought.'],
      ['What counts as cheating?',
        'Bots or automated play, using several accounts to farm coins, exploiting bugs, or offensive names. We may reset progress or close accounts that break these rules.'],
      ['I think someone is cheating. What do I do?',
        "Contact us with the player's name and the race time (see **Contact us**). We look into every report."],
    ]],
    ['Coins', [
      ['How do I earn coins?', [
        'By racing:',
        ['ul',
          `**${n(e.race.takingPart)} coins** for every race you take part in.`,
          `A **finishing bonus**: ${placesLine(e.race.places)}.`,
          `A **daily goal**: finish ${n(e.dailyGoal.races)} races in a day for +${n(e.dailyGoal.coins)} coins.`],
      ]],
      ['Why did I earn fewer coins later in the day?',
        `Your first ${n(e.dailyLimit.fullRaces)} races each day pay full coins. After that, each race pays ${n(e.dailyLimit.coinsAfter)} coins. This keeps the game fair for everyone. The count starts again the next day.`],
      ['When does a new day start?',
        `At midnight ${e.dayBoundary}${e.dayBoundary === 'UTC' ? ', which is 01:00 Swedish time in winter and 02:00 in summer' : ''}.`],
      ["What's my daily streak?",
        "Your streak counts how many days in a row you've reached the daily goal. Keep it going!"],
      ['Do new players get coins?',
        `Yes. Every new player starts with **${n(e.startingCoins)} coins**.`],
      ["What's the difference between earned and bought coins?",
        "They're the same coins in your wallet and buy the same things. We keep them apart in your history so scoreboards only count earned coins."],
      ['Can I turn coins into money?',
        "No. Coins can't be cashed out, sold, traded or given to another player. They can only be used in the game. Marbles can't be sold, traded or transferred either."],
      ['Do coins expire?',
        "No. Your coins stay in your account until you use them or delete your account. (A guest account, and its coins, is lost after 90 days away: save your marble to keep them for good.)"],
      ['Where can I see my coin history?',
        '**Purchases** (tap your name at the top, then Purchases) lists your orders and receipts, and each race\'s results show the coins it paid. **Download my data** in Settings has your full coin history, every coin in and out with its date.'],
    ]],
    ['Marbles and the collection', [
      ['What marbles do I start with?',
        "Every player gets **4 starter marbles of their own**, free: plain glass, one in one colour and three in two colours, each with its own Marble ID (like STLVAS82) and certificate. In a race, no two players show the same starter."],
      ['How do I get new marbles?',
        'In the **Shop**, with coins you earn by racing or buy.'],
      ['What are the rarities and prices?', [
        ['table', ['Rarity', 'Price'], ...rarityRows],
      ]],
      ['What are shades?',
        `Every marble design comes in ${shades.length} shades: ${listJoin(shades)}. Each shade is collected separately.`],
      ['What is a Marble ID?', [
        'A short code for every marble, like **SC105**. It is made of:',
        ['ul',
          'two letters for the collection (SC = Schoolyard Classics);',
          'two digits for the marble (10 = Champion Shooter);',
          'one digit for the shade (5 = Sunset).'],
        'Use it to tell a friend exactly which marble you mean, or type it into **Find by ID** in the shop.',
      ]],
      ['What is a First Edition?',
        `The first ${n(edition)} copies of every marble are numbered First Editions. If you buy one of them, your marble gets its own number (for example #037 of ${n(edition)}) and a certificate showing its number, first owner, the date and its race record. After the first ${n(edition)}, the marble is still for sale, just without a number.`],
      ['What are bags?', [
        ['ul',
          `**${starter.label}:** the ${commons} Commons of a collection, ${percent(starter.discount)} cheaper than buying them one by one.`,
          `**${full.label}:** all ${collectionDesigns.length} marbles of a collection, ${percent(full.discount)} cheaper.`],
        "You choose which shade you want. You always see exactly what's in a bag; there are no surprise packs.",
      ]],
      ['When do new collections come out?',
        `Collection ${catalog.collection.number}, ${catalog.collection.name}, is live.${soon.length ? ` Next up: ${listJoin(soon)}.` : ''} See **Coming soon** in the shop.`],
      ['What is a limited edition?',
        limitedAnswer()],
      ['What is a seasonal collection?',
        seasonalAnswer()],
      ['What is the season marble?',
        `A marble only season pass holders ever get. With the ${HOLIDAY.pass} it's **${HOLIDAY.marble}**: it's added to your Marble Bag the moment you get the pass, numbered in the order passes are bought (Holiday 2026 #0001, #0002…), with its own certificate. It's never sold, and it's yours to keep after the season. Like every marble it's looks only.`],
      ['How do I change which marble I race with?',
        'Open your **Marble Bag** and pick the marble you want as your shooter.'],
    ]],
    ['Buying coins', [
      ['How do I buy coins?',
        app
          ? `In the shop, choose a coin pack and pay with ${STORE}. Coin packs are for saved accounts: playing as a guest, you save your marble first (it takes a minute, and everything you've won comes with you). ${STORE_CO} handles the payment and sends you its receipt.`
          : 'In the shop, choose a coin pack and pay. Coin packs are for saved accounts: playing as a guest, you save your marble first (it takes a minute, and everything you\'ve won comes with you). On the website, payment goes through Stripe, and we email you a confirmation of your order. In the iPhone and Android apps, it goes through Apple or Google.'],
      ['What do coin packs cost?', app
        ? `There are ${NUMBER_WORDS[COIN_PACKS.length] ?? COIN_PACKS.length} packs: ${listJoin(COIN_PACKS.map((p) => n(p.coins)))} coins. The shop shows each pack's price in your own currency, VAT included, as ${STORE} sets it.`
        : [
          ['table', ['Pack', 'Coins'], ...packRows],
          'Prices are shown in your local currency, including VAT.',
        ]],
      ['How can I pay?',
        app
          ? `With the payment method saved in your ${ACCOUNT}: ${STORE} handles the payment.`
          : 'On the website: card, Apple Pay or Google Pay (where available). In the apps: your Apple or Google account.'],
      ['Is my card safe?',
        app
          ? `Yes. Payments in the app are handled by ${STORE_CO}. We never see or store your card details.`
          : 'Yes. Payments are handled by Stripe, Apple or Google. We never see or store your card details.'],
      ['Why is the price different for me?',
        "Prices are shown in your own currency and include your country's VAT, so the amount can differ slightly between countries."],
      ['Where do I find my receipt?',
        app
          ? `${STORE_CO} sends you a receipt, and the purchase is listed in your ${ACCOUNT}. You can also see every purchase, with its order number (for example MS-1001), on your **Purchases** page.`
          : 'Stripe emails a receipt after each website purchase. You can also see every purchase, with its order number (for example MS-1001), on your **Purchases** page. App purchases appear in your Apple or Google account.'],
      ["I paid but my coins didn't arrive. What do I do?", [
        "Coins are added as soon as the payment is confirmed, usually within seconds. If they haven't arrived after a few minutes:",
        ['ol',
          'Refresh the page or restart the app.',
          'Check your **Purchases** page; the order may still say "waiting".',
          "Still missing? Contact us with your order number and we'll sort it out."],
      ]],
      ["I'm under 18. Can I buy coins?",
        'Ask a parent or guardian before buying anything.'],
    ]],
    ['Refunds', [
      ['Can I get a refund?',
        'Coins are digital content delivered straight away. When you buy, you agree that delivery starts immediately and that this ends your 14-day right of withdrawal. We still give refunds where the law requires it, for example if coins weren\'t delivered or something went wrong with the payment. Contact us with your order number.'],
      ['What happens to my coins if I get a refund?',
        "The refunded coins are removed from your wallet. If you've already spent them, your balance goes down to 0."],
      ['I bought coins in the app. How do I get a refund?', app
        ? `Purchases made in the app are handled by ${STORE_CO}, so request a refund from them directly: ${APP_REFUND}.`
        : [
          'Purchases made in the iPhone or Android app are handled by Apple or Google, so request a refund from them directly:',
          ['ul',
            '**Apple:** at reportaproblem.apple.com.',
            '**Google:** in your Google Play order history.'],
        ]],
      ['My child bought coins without asking. What can I do?',
        'Contact us with the order number. We handle purchases made by minors without consent case by case.'],
    ]],
    ['Season pass', [
      ["What's in the Holiday Season pass?", [
        app
          ? `The **${HOLIDAY.pass}** (its price is on the pass page, in your own currency, VAT included) gives you, until the season ends on ${HOLIDAY.ends} at ${HOLIDAY.endTime}:`
          : `The **${HOLIDAY.pass}** costs ${HOLIDAY.price} (shown in your local currency, VAT included) and gives you, until the season ends on ${HOLIDAY.ends} at ${HOLIDAY.endTime}:`,
        ['ul',
          `all ${HOLIDAY.tracks} holiday tracks from around the world, from ${HOLIDAY.starts};`,
          `the **Holiday Track of the Day** bonus: +${HOLIDAY.bonus}% race coins on the featured track, on your full-pay races (the first 10 of the day);`,
          'holiday tracks in your friend rooms: when you host, everyone in the room races them, pass or not;',
          `the season marble, **${HOLIDAY.marble}**, yours to keep.`],
        "It's one payment, not a subscription, and it's real money only: it can't be bought with coins. Under 18? Ask a parent or guardian first.",
      ]],
      ['Can I buy the pass before 1 December?', [
        `Yes. The pass is on sale from **${HOLIDAY.saleStarts}** at 00:00 Swedish time, on the website and in the apps. Bought before the season starts, it's yours straight away but **activates on ${HOLIDAY.starts}** at 00:00 Swedish time: that's when the holiday tracks, the Holiday Track of the Day and holiday rooms open, for every pass holder at once. The pass page shows a countdown, and your account says "activates 1 December" until then.`,
        ios
          ? `Changed your mind before ${HOLIDAY.starts}? A pass bought in this app is refunded by Apple: ask at reportaproblem.apple.com.`
          : platform === 'android'
            ? `Changed your mind before ${HOLIDAY.starts}? You can withdraw from the purchase for a full refund: on your **Purchases** page, press **Withdraw from this purchase** and confirm.`
            : `Changed your mind before ${HOLIDAY.starts}? You can withdraw from the purchase for a full refund: on your **Purchases** page, press **Withdraw from this purchase** and confirm (for a pass bought on the website or in the Android app). Bought in the iPhone app? Apple handles that: ask at reportaproblem.apple.com.`,
      ]],
      ['Can I get a reminder when the pass goes on sale?', [
        `Yes. On the pass page, tap **Remind me**. Logged in, you get a reminder in the game, and an email too if you tick it; without an account, give your email address and tick the box. We first email you a link to confirm your address, and only a confirmed address gets the reminder, once, on ${HOLIDAY.saleStarts}. You can cancel it any time (a link in every email), and we delete your address within 30 days after the sale opens.`,
      ]],
      ['What is the Holiday Track of the Day?',
        `Every day of the season one holiday track is featured. Race it with the pass and you get +${HOLIDAY.bonus}% race coins on your full-pay races of the day (your first ${n(e.dailyLimit.fullRaces)}). The bonus doesn't count on the scoreboards: scoreboards only count coins earned by racing.`],
      ['I bought the pass on 15 December. Do I get every track?',
        `Yes. All ${HOLIDAY.tracks} holiday tracks are yours straight away, whenever you buy the pass during the season.`],
      ['How long does the pass last?',
        `Until the season ends on ${HOLIDAY.ends} at ${HOLIDAY.endTime}. It's sold from ${HOLIDAY.saleStarts} (activating on ${HOLIDAY.starts}) until then, with a countdown in its last week.`],
      ['I bought it on my phone. Does it work on the website?',
        app
          ? 'Yes. The pass belongs to your account, so it works wherever you log in with it, in the app and on the website. Buy it once only: if you already have it, the app shows it as yours.'
          : 'Yes. The pass belongs to your account, so it works on the website and in both apps, wherever you log in. Buy it once only: if you already have it, the app shows it as yours.'],
      ['Can my friends race the holiday tracks with me?',
        "Yes. In a friend room you host, you can pick a holiday track and everyone in the room races it, with or without a pass. Anyone can also watch holiday races and replays for free."],
      ['What happens when the season ends?', [
        ['ul',
          'The holiday tracks become **free for everyone** and join the normal races.',
          `The pass is no longer sold. You keep ${HOLIDAY.marble} and your purchase stays on your **Purchases** page.`,
          'The top 100 players by coins earned in the season get a **Holiday Season 2026** badge with their final place.',
          "The season's collection is retired and never sold again."],
      ]],
      ['How do I get a refund for the pass?', [
        ios
          ? 'Bought in this app? Apple handles refunds for App Store purchases: ask at reportaproblem.apple.com.'
          : `Bought before ${HOLIDAY.starts}? Until the pass activates on ${HOLIDAY.starts}, you can withdraw from it for a full refund with **Withdraw from this purchase** on your **Purchases** page${app ? '' : ' (in the iPhone app, ask Apple)'}.`,
        app
          ? `From the day the season starts the pass is digital content you have, so when you buy it you agree that this ends your 14-day right of withdrawal. We still give refunds where the law requires it: ${APP_REFUND}.`
          : "From the day the season starts the pass is digital content you have, so when you buy it you agree that this ends your 14-day right of withdrawal. We still give refunds where the law requires it: contact us with your order number. Bought in an app? Ask Apple (reportaproblem.apple.com) or Google (your Google Play order history).",
        `A refunded pass is taken back: the holiday tracks lock again until the season ends, and ${HOLIDAY.marble} leaves your Marble Bag.`,
      ]],
      ...(platform === 'android' ? [] : [['How do I restore my pass on iPhone?',
        'Log in with the same Marble Spins account, open the pass page and tap **Restore purchases**. A pass you already bought comes back; you are never charged twice.']]),
    ]],
    ['Friend rooms', [
      ['How do I race with friends?',
        "Tap **Race with friends**, make a room and share the link or code. Your friends open it and join. When everyone's in, the host starts the race, or sets it to start in 30 seconds, 1 minute or 2 minutes. Computer players fill the remaining places."],
      ['Can anyone join my room?',
        "Only if you make it public. A new room is **private**: only people with your link or code can join. Choose **Public** when you make it, or in the room before a race, and it's listed under **Join a race** for anyone to join until it starts. You can switch back to private at any time. As the host you can take a player out; they can't join your room again."],
      ['How do I join a race with other players?',
        "Tap **Race with friends**: **Join a race** lists the public rooms and quick races waiting to start, with the track, how many players are in (like 4/20) and the countdown if one is running. Tap one to join, as a guest too. Or tap **Quick race** to go straight into the next one starting."],
      ['Is there chat?',
        "No. Rooms show players' names only, so they're safe for everyone, public ones too. Names are checked when they're chosen, and you can report one with **⚑**."],
      ['Do friend-room races earn coins and count on scoreboards?',
        `Yes. They pay coins like any race, count towards your ${n(e.dailyLimit.fullRaces)} full-pay races a day, and the coins you earn count on the scoreboards.`],
      ['What happens if someone leaves?',
        'If they leave before the start, their place is freed, and a computer player takes it when the race starts. If they leave during a race, their marble still races to the finish: the race runs on our server, not on their phone.'],
      ['How long does a room stay open?',
        'Until the host closes it, or 2 hours after its last race. A quick race is a single race: afterwards, tap **Quick race again**.'],
    ]],
    ['Account and settings', [
      ['How do I save my account?',
        'Tap **Save your marble** and sign up with your email and a password. Everything you won as a guest is kept.'],
      ['How do I change my player name?',
        "Before you save your marble, tap your name at the top of the screen and choose **Choose your name**: other players see it in races, rooms and scoreboards, and it stays when you save your marble. Until you choose one, you show as guest and a number. Once your marble is saved, contact us with the name you'd like and we'll change it for you. Names must be friendly and your own: offensive names and other players' names can't be chosen, and those that slip through are changed."],
      ['How do I report an offensive player name?',
        "Tap **⚑** next to the name on a scoreboard or in the race results (or tap the player's marble after a race and choose **Report this name**), then **Report**. A name reported by several players is hidden straight away (it shows as guest or Player and a number) until we've checked it. We check every report and give offensive names a neutral one. The player isn't told who reported them. You can report up to 10 names a day."],
      ['My name is hidden. Why?',
        "Several players reported it, so it's hidden until we've checked it: others see guest or Player and a number. Choose a new name from the notice at the top of the screen (the same rules as any name). If we find your name was fine, we bring it back."],
      ['How do I choose the country I race for?',
        "Choose it when you save your account, or later in **Settings → Your country**. It's optional, it needn't be where you live, and only saved accounts have one. Your best time on a track counts for your country's record there (**Scoreboards → Countries**, and each track's page). You can change your country once every 90 days. Picked the wrong one? You can correct it within 24 hours. A change never moves records you already set."],
      ['How do I turn news emails on or off?',
        'Tap your name at the top to open **Settings**, and use the news-by-email switch. You can also click **Unsubscribe** in any email we send.'],
      ['How do I change the sound?',
        'Tap the **speaker** button at the top (on a phone, in the menu ☰). You can set music and effects separately, or mute everything. Your choice is remembered.'],
      ['How do I download my data?',
        '**Settings → Download my data.** You get one file with everything we store about you (passwords are never included).'],
      // (Also the page Google Play's Data safety form links to, for deleting an account without the
      // app: /help/how-do-i-delete-my-account. It must name the app, give the steps, and say what is
      // deleted and what is kept, and for how long. docs/08-store-rules.md.)
      ['How do I delete my account?', [
        `**In ${app ? 'the app' : 'Marble Spins'}:** open **Settings** (tap your name at the top; as a guest, open your **Marble Bag** and tap **Settings**), then **Delete my account**. Type DELETE (and, for a saved account, your password) to confirm. It works the same ${app ? 'in the app and on the website' : 'on the website and in the apps'}.`,
        `**Without the app:** log in at marblespins.com, open **Settings** and delete your account there. Can't log in? Send us a message with the contact form, choose **Privacy and your data**, and give your player name and your account's email address. ${company.name}, who runs Marble Spins, deletes the account within one month and tells you when it's done. A guest account has no login, so it can only be deleted on the device it lives on; a guest account not used for 90 days is deleted by itself.`,
        'There are no subscriptions to cancel first: coin packs and the season pass are one-off payments. When you delete:',
        ['ul',
          "you're logged out everywhere;",
          'your name, email, password, settings, notification tokens and IP addresses are removed;',
          "your old race results stay under an anonymous name, so other players' places don't change;",
          'purchase records (order number, product, amount and date) are kept for 7 years, as the Swedish Bookkeeping Act requires, without your name or email.'],
        "Deleting can't be undone, and your coins and marbles are lost.",
        ['contact', 'Contact us'],
      ]],
      ['I forgot my password.',
        "On the log-in page, tap **Forgot your password?** and type your account's email. We email you a link to choose a new password. The link works once, for 60 minutes; if it doesn't arrive, check your spam folder. Choosing a new password logs you out on your other devices. Guest accounts have no password: save your marble to keep it. [Live once email is switched on.]"],
    ]],
    ['Younger players and parents', [
      ['Is there an age limit?',
        'Marble Spins is for all ages. When you save an account, we ask for the year and month you were born (no day), to know your age group.'],
      ["What's different for players under 13?",
        "Players under 13 can race as guests as much as they like. Saving an account is for players 13 and older (parental approval isn't available yet), so if the birth year and month say under 13, no account is saved and the birth date isn't stored. Under-13s are never asked about news emails and are never sent marketing."],
      ['A note for parents', [
        ['ul',
          'Marble Spins is free to play, with no ads.',
          'Buying is optional and never makes a marble faster.',
          'There are no random packs or loot boxes: every purchase shows exactly what you get.',
          'There is no chat.',
          ios ? "You can turn off purchases on your child's iPhone or iPad with Screen Time."
            : platform === 'android' ? "You can turn off purchases on your child's phone with Google Play's parental controls."
              : "You can turn off purchases on your child's phone through Apple's Screen Time or Google Play's parental controls.",
          'If your child bought something without your consent, contact us.'],
      ]],
    ]],
    ['Technical help', [
      ['The game is slow or my phone gets hot.',
        "Close other apps and make sure your phone isn't in low-power mode. The game automatically lowers detail on slower phones. You can also turn off the effects you don't need: the TV cameras (the **TV** button under the race) and the music (the **speaker** button)."],
      ['I see the "offline" screen.',
        "You've lost your internet connection, or our server can't be reached. The screen disappears by itself as soon as the connection is back."],
      ["The game won't load.",
        'Refresh the page or restart the app. Make sure your browser is up to date. Still stuck? Contact us and tell us your device and browser.'],
      ["I can't hear any sound.",
        "Sound starts after your first tap (browsers require this). Check the **speaker** button isn't muted, and that your phone isn't on silent."],
      ['How do I report a bug?',
        'Contact us with what happened, when, and your device. A screenshot helps a lot.'],
    ]],
    ['Contact us', [
      ['Still need help?',
        ['Use the contact form below. Tell us your player name and, for payment questions, your order number. We aim to reply within 2 working days.', ['contact', 'Contact us']]],
      ['Privacy questions',
        [`For questions about your data, or to ask to see, correct, export or delete it, use the contact form and choose **Privacy and your data**. ${company.name} is the data controller. You can also complain to the Swedish Authority for Privacy Protection (IMY).`, ['contact', 'Contact us']]],
      ['Follow Marble Spins',
        ['New tracks, close finishes and new marbles: follow Marble Spins on YouTube, Instagram and TikTok.', ['social']]],
      ['Company details',
        `Marble Spins is operated by **${company.name}**, org.nr ${company.orgNo}, VAT no. ${company.vatNo}, ${company.street}, ${company.postcode} ${company.city}, ${company.country}. All our contact details are on the legal page, under Contact.`],
    ]],
  ];

  const used = new Set();
  return sections.map(([title, questions], k) => {
    const id = slugify(title);
    return {
      id,
      number: k + 1,
      title,
      questions: questions.map(([q, answer]) => {
        let slug = slugify(q);
        while (used.has(slug)) slug += '-2';
        used.add(slug);
        const blocks = Array.isArray(answer) ? answer : [answer];
        return { slug, q, blocks, section: title, text: blocksText(blocks) };
      }),
    };
  });
}

/** An answer as plain text (search and the structured data): markup off, placeholders kept. */
export function blocksText(blocks) {
  const plain = (s) => s.replace(/\*\*/g, '');
  return blocks.map((b) => {
    if (typeof b === 'string') return plain(b);
    if (b[0] === 'table') return b.slice(2).map((row) => b[1].map((h, i) => `${h}: ${row[i]}`).join(', ')).join('. ');
    if (b[0] === 'contact' || b[0] === 'social') return '';
    return b.slice(1).map((item, i) => `${b[0] === 'ol' ? `${i + 1}. ` : ''}${plain(item)}`).join(' ');
  }).filter(Boolean).join(' ');
}

/** Whether a text still holds a [bracket] placeholder. */
export const hasPlaceholder = (text) => /\[[^\]]+\]/.test(text);

/** The categories a contact message can be about (client/src/shared/support.json, which the server checks too): the help sections, then "Something else". */
export const CONTACT_CATEGORIES = supportSettings.categories;

/**
 * schema.org FAQPage for search engines. Questions whose answer still holds a [bracket] placeholder
 * are left out until it is filled in (a search result should never show a placeholder).
 */
export function faqStructuredData(sections, pageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: pageUrl,
    mainEntity: sections.flatMap((s) => s.questions)
      .filter((q) => !hasPlaceholder(q.text) && !hasPlaceholder(q.q))
      .map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.text } })),
  };
}
