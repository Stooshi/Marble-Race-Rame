// Sample data for the CRM preview (/admin/preview-crm, Moses, 16 Nov 2026): what the customer page and Billing
// will show once the CRM is built (claude/crm-plan.md in the project). Receipts, credit notes, the email log
// and the alerts don't exist yet, so they are always samples; a real player's own races, coins, marbles,
// purchases, support messages, consents and audit come from the back office's API.
import company from '../shared/company.json';

export const SELLER = company;

const at = (d, t = '10:00') => `2026-11-${String(d).padStart(2, '0')}T${t}:00+01:00`;

/** A whole customer, as the preview shows one (the sample: nobody real). */
export const SAMPLE_CUSTOMER = {
  sample: true,
  player: {
    id: 'sample', username: 'pebblequeen', display_name: 'Lina', email: 'lina.berg@example.com', is_guest: false,
    coins: 12450, coins_earned: 9800, coins_bought: 10500, age_group: '18+', first_country: 'SE',
    created_at: at(2, '18:12'), last_login_at: at(16, '09:41'), marketing_opt_in: true, email_verified: false,
  },
  avatar: 'clearie-ocean',
  marbleId: 'SC105-000214',
  races: {
    last24h: 7,
    recent: [
      { id: 'r1', track: 'Rio Jungle Rumble', finish_position: 2, coins_awarded: 120, finished_at: at(16, '09:38'), room: false },
      { id: 'r2', track: 'Table Mountain Run', finish_position: 5, coins_awarded: 60, finished_at: at(16, '09:31'), room: true },
      { id: 'r3', track: 'Lake Bled Island Run', finish_position: 1, coins_awarded: 200, finished_at: at(15, '21:05'), room: false },
      { id: 'r4', track: 'Kings Canyon Lost City', finish_position: 11, coins_awarded: 20, finished_at: at(15, '20:58'), room: false },
      { id: 'r5', track: 'Paris Eiffel Tower Run', finish_position: 3, coins_awarded: 90, finished_at: at(15, '20:51'), room: true },
    ],
  },
  coins: {
    byKind: [{ kind: 'race', lines: 212, coins: 9800 }, { kind: 'purchase', lines: 1, coins: 10500 }, { kind: 'shop', lines: 3, coins: -7850 }],
    ledger: [
      { id: 1, amount: 120, kind: 'race', note: 'Rio Jungle Rumble, 2nd', balance_after: 12450, created_at: at(16, '09:38') },
      { id: 2, amount: -2500, kind: 'shop', note: 'Clearie, Ocean', balance_after: 12330, created_at: at(14, '17:20') },
      { id: 3, amount: 10500, kind: 'purchase', note: 'MS-1042: 10,500 coins', balance_after: 14830, created_at: at(14, '17:02') },
      { id: 4, amount: 50, kind: 'daily', note: 'Daily goal', balance_after: 4330, created_at: at(13, '20:11') },
    ],
  },
  marbles: [
    { slug: 'clearie-ocean', code: 'SC105-000214', source: 'shop', at: at(14, '17:20') },
    { slug: 'clearie-classic', code: 'SC101-000881', source: 'starter', at: at(2, '18:12') },
  ],
  purchases: [
    { order_no: 'MS-1057', item: 'Grand Prix track pack', provider: 'stripe', status: 'paid', refund: 'pending', charged: 8900, currency: 'SEK', tax: 1780, at: at(16, '08:55'), receipt: 'K-2026-00006' },
    { order_no: 'MS-1049', item: 'Holiday Season Pass 2026', provider: 'stripe', status: 'paid', charged: 10900, currency: 'SEK', tax: 2180, at: at(15, '19:40'), receipt: 'K-2026-00004' },
    { order_no: 'MS-1042', item: '10,500 coins', provider: 'stripe', status: 'refunded', refunded: 5450, charged: 10900, currency: 'SEK', tax: 2180, at: at(14, '17:02'), receipt: 'K-2026-00002' },
    { order_no: 'GPA.3312-4410-8721-55012', item: '5,000 coins', provider: 'google', status: 'paid', charged: 5500, currency: 'SEK', tax: null, at: at(9, '12:30'), receipt: null },
  ],
  refunds: [
    { number: 'KR-2026-00001', order_no: 'MS-1042', of: 'K-2026-00002', amount: 5450, currency: 'SEK', reason: 'Bought the wrong pack: half refunded, coins not yet spent taken back', at: at(15, '11:20'), by: 'moses', coins: 5250 },
    { number: null, order_no: 'MS-1057', of: 'K-2026-00006', amount: 8900, currency: 'SEK', reason: 'Withdrawal within 14 days (pack not used)', at: at(16, '09:02'), by: 'moses', pending: true },
  ],
  support: [
    { ref: 'S-1043', category: 'Purchases', status: 'answered', message: 'I bought the Grand Prix pack by mistake, can I get my money back?', at: at(16, '08:58'), replies: 1 },
    { ref: 'S-1031', category: 'Account', status: 'closed', message: 'How do I change my player name?', at: at(10, '14:12'), replies: 1 },
  ],
  emails: [
    { kind: 'Support reply', subject: 'Re: S-1043 – your refund', status: 'delivered', at: at(16, '09:05') },
    { kind: 'Receipt', subject: 'Your receipt K-2026-00006', status: 'opened', at: at(16, '08:56') },
    { kind: 'Credit note', subject: 'Your credit note KR-2026-00001', status: 'delivered', at: at(15, '11:21') },
    { kind: 'Receipt', subject: 'Your receipt K-2026-00004', status: 'opened', at: at(15, '19:41') },
    { kind: 'Onboarding, day 10', subject: 'New this week: 22 tracks', status: 'delivered', at: at(12, '08:00') },
    { kind: 'Email confirmation', subject: 'Confirm your email', status: 'not opened', at: at(2, '18:13') },
  ],
  consents: [
    { what: 'News by email', value: 'Yes', how: 'Ticked when saving the account', at: at(2, '18:12') },
    { what: 'News after a purchase (soft opt-in)', value: 'Not objected', how: 'Purchase MS-1042: "Don\'t send me news" left unticked', at: at(14, '17:02') },
    { what: 'News in the game', value: 'On', how: 'Default (Settings)', at: at(2, '18:12') },
    { what: 'Cookies', value: 'Necessary only', how: 'Cookie banner', at: at(2, '18:10') },
    { what: 'Terms of sale and immediate delivery', value: 'Agreed', how: 'Checkout MS-1057', at: at(16, '08:55') },
  ],
  security: [
    { kind: 'login', country: 'SE', at: at(16, '09:30') },
    { kind: 'purchase', country: 'SE', at: at(16, '08:55') },
    { kind: 'signup', country: 'SE', at: at(2, '18:12') },
  ],
  audit: [
    { action: 'refund', admin: 'moses', reason: 'MS-1042: half refunded, wrong pack', at: at(15, '11:20') },
    { action: 'support-reply', admin: 'moses', reason: 'Reply to S-1043 (emailed)', at: at(16, '09:05') },
  ],
};

const line = (item, gross, rate) => {
  const net = Math.round(gross / (1 + rate / 100));
  return { item, qty: 1, gross, net, vat: gross - net, rate };
};

/** Receipts (K-) and credit notes (KR-), as the Billing page will list them (samples: billing isn't built yet). */
export const SAMPLE_DOCUMENTS = [
  { number: 'K-2026-00008', kind: 'receipt', order_no: 'MS-1061', customer: 'tomas_k', email: 'tomas.k@example.com', country: 'DE', currency: 'EUR', lines: [line('10,500 coins', 999, 19)], sek: 11420, fee: 520, at: at(16, '11:31') },
  { number: 'K-2026-00007', kind: 'receipt', order_no: 'MS-1060', customer: 'marblemaniac', email: 'mm@example.com', country: 'GB', currency: 'GBP', lines: [{ item: 'Blocks 2 track pack', qty: 1, gross: 699, net: 699, vat: 0, rate: 0 }], vatNote: 'VAT: not applicable (outside the EU)', sek: 9530, fee: 480, at: at(16, '10:47') },
  { number: 'K-2026-00006', kind: 'receipt', order_no: 'MS-1057', customer: 'pebblequeen', email: 'lina.berg@example.com', country: 'SE', currency: 'SEK', lines: [line('Grand Prix track pack', 8900, 25)], sek: 8900, fee: 395, at: at(16, '08:55'), refund: 'pending' },
  { number: 'KR-2026-00002', kind: 'credit', order_no: 'MS-1053', of: 'K-2026-00005', customer: 'speedy_otto', email: 'otto@example.com', country: 'SE', currency: 'SEK', lines: [line('Holiday Season Pass 2026 (withdrawal)', -10900, 25)], sek: -10900, fee: 0, at: at(16, '07:12'), reason: 'Withdrawal before the pass activates' },
  { number: 'K-2026-00005', kind: 'receipt', order_no: 'MS-1053', customer: 'speedy_otto', email: 'otto@example.com', country: 'SE', currency: 'SEK', lines: [line('Holiday Season Pass 2026', 10900, 25)], sek: 10900, fee: 465, at: at(15, '22:03') },
  { number: 'K-2026-00004', kind: 'receipt', order_no: 'MS-1049', customer: 'pebblequeen', email: 'lina.berg@example.com', country: 'SE', currency: 'SEK', lines: [line('Holiday Season Pass 2026', 10900, 25)], sek: 10900, fee: 465, at: at(15, '19:40') },
  { number: 'KR-2026-00001', kind: 'credit', order_no: 'MS-1042', of: 'K-2026-00002', customer: 'pebblequeen', email: 'lina.berg@example.com', country: 'SE', currency: 'SEK', lines: [line('10,500 coins (part refund)', -5450, 25)], sek: -5450, fee: 0, at: at(15, '11:20'), reason: 'Bought the wrong pack: half refunded' },
  { number: 'K-2026-00003', kind: 'receipt', order_no: 'MS-1045', customer: 'kulan_88', email: 'kulan88@example.com', country: 'FI', currency: 'EUR', lines: [line('5,000 coins + Clearie, Ocean', 499, 25.5)], sek: 5710, fee: 300, at: at(14, '20:15') },
  { number: 'K-2026-00002', kind: 'receipt', order_no: 'MS-1042', customer: 'pebblequeen', email: 'lina.berg@example.com', country: 'SE', currency: 'SEK', lines: [line('10,500 coins', 10900, 25)], sek: 10900, fee: 465, at: at(14, '17:02') },
  { number: 'K-2026-00001', kind: 'receipt', order_no: 'MS-1038', customer: 'nordic_nils', email: 'nils@example.com', country: 'NO', currency: 'NOK', lines: [{ item: '27,500 coins', qty: 1, gross: 27900, net: 27900, vat: 0, rate: 0 }], vatNote: 'VAT: not applicable (outside the EU)', sek: 26800, fee: 1010, at: at(14, '09:44') },
];
