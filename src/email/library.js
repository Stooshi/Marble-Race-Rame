'use strict';

/**
 * Editable email templates (Moses, 16 Nov 2026, CRM phase 5; plan: claude/crm-plan.md §3.1).
 *
 * Each kind of email has a template in the database (email_templates): its subject, a preheader (the line mail apps
 * show after the subject), a title and blocks (heading, text, button, divider, image). Every save is a version;
 * the newest published version is used; with none published the email is the one in code (./templates.js), so
 * nothing changes until an admin publishes. Restoring an old version publishes a copy of it.
 *
 * Locked: an email's figures, legal wording and links come from the code. A service email (a receipt's purchase, a
 * credit note, a withdrawal, a support reply, a password reset, an email confirmation) has one `core` block, which
 * the code fills and the editor can only move, never change or remove. Placeholders ({{name}} …) are each kind's
 * own; an unknown one is refused when saving. Marketing emails (the onboarding ones; newsletters, phase 6) have no
 * core block, and the code always adds the unsubscribe line under them.
 */
const { esc, layout, button } = require('./templates');
const { badRequest } = require('../utils/httpError');

const SITE = 'https://marblespins.com';

/** Placeholders every kind may use. */
const COMMON = { name: { about: "The player's name", sample: 'Ada' } };

const KINDS = {
  'purchase-confirmation': {
    name: 'Purchase confirmation (website)', group: 'service',
    about: 'Sent after a website purchase. The core holds the order, what was delivered, what the buyer agreed to (the exact consent texts), the receipt link and the terms: never editable.',
    placeholders: { order_no: { about: 'The order number', sample: 'MS-1042' }, item: { about: 'What was bought', sample: '2,500 coins' } },
    defaults: { subject: 'Your Marble Spins order {{order_no}}', title: 'Thanks for your order', blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'text', text: 'This confirms your purchase from Marble Spins.' }, { type: 'core' }] },
  },
  'withdrawal-received': {
    name: 'Withdrawal received', group: 'service',
    about: 'Sent when a player withdraws from a purchase. The core holds the date received, the order, the refund and the legal wording.',
    placeholders: { order_no: { about: 'The order number', sample: 'MS-1042' }, item: { about: 'What was bought', sample: 'Holiday Season Pass 2026' } },
    defaults: { subject: "We've received your withdrawal (order {{order_no}})", title: 'Withdrawal received', blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'core' }, { type: 'text', text: "Changed your mind? You can buy it again while it's on sale." }] },
  },
  'credit-note': {
    name: 'Credit note', group: 'service',
    about: 'Sent with a credit note (a refund or chargeback of a website purchase). The core holds the credit note, its figures and its link.',
    placeholders: { number: { about: "The credit note's number", sample: 'KR-2026-00001' }, order_no: { about: 'The order number', sample: 'MS-1042' } },
    defaults: { subject: 'Your credit note {{number}} (order {{order_no}})', title: 'Your credit note', blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'core' }, { type: 'text', text: 'Keep this email for your records.' }] },
  },
  'support-reply': {
    name: 'Support reply', group: 'service',
    about: "Sent when support answers a message. The core is the admin's reply and the player's message.",
    placeholders: { ref: { about: "The message's reference", sample: 'S-1043' } },
    defaults: { subject: 'Re: your message to Marble Spins ({{ref}})', title: 'A reply from Marble Spins support', blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'core' }] },
  },
  'password-reset': {
    name: 'Password reset', group: 'service',
    about: 'Sent when a player asks for a new password. The core is the one-time link and how long it works.',
    placeholders: {},
    defaults: { subject: 'Reset your Marble Spins password', title: 'Reset your password', blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'text', text: 'Someone asked to reset the password for your Marble Spins account. If it was you, choose a new password here:' }, { type: 'core' }, { type: 'text', text: "Didn't ask for this? Then you can ignore this email: your password stays the same." }] },
  },
  'confirm-email': {
    name: 'Email confirmation', group: 'service',
    about: 'Sent when a player saves an account. The core is the confirmation link and how long it works.',
    placeholders: {},
    defaults: { subject: 'Confirm your email for Marble Spins', title: 'Confirm your email', blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'text', text: 'Thanks for saving your marble. Tap the button to confirm that this is your email address, so your account is yours for good and you can get a new password if you ever forget it.' }, { type: 'core' }] },
  },
  // The onboarding emails (phase 6): marketing, only to whom the audience rules allow; sending switched off.
  'onboarding-1': {
    name: 'Onboarding 1 (day 1): welcome', group: 'marketing',
    about: 'Day 1 after saving an account: welcome, how to race and earn coins. Marketing: only to players the audience rules allow (18+, consent or a purchase).',
    placeholders: { play_url: { about: 'The race page', sample: `${SITE}/play` } },
    defaults: { subject: 'Welcome to Marble Spins, {{name}}', title: 'Your marble is ready', blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'text', text: 'Thanks for saving your marble. Every race is 20 marbles down a track, and every marble has the same chance: pick a track you like the look of and see where yours finishes.' }, { type: 'text', text: 'You win coins for every race you finish, more for a podium, and a bonus for your first races each day.' }, { type: 'button', text: 'Race now', href: '{{play_url}}' }] },
  },
  'onboarding-2': {
    name: 'Onboarding 2 (day 3): friend rooms', group: 'marketing',
    about: 'Day 3: racing with friends in a room. Marketing (audience rules).',
    placeholders: { rooms_url: { about: 'The friend-room page', sample: `${SITE}/play/friends` } },
    defaults: { subject: 'Race your friends on Marble Spins', title: 'Bring your friends', blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'text', text: 'Make a room, send the link, and race your friends on any track. Everyone sees the same race, live.' }, { type: 'button', text: 'Make a room', href: '{{rooms_url}}' }] },
  },
  'onboarding-3': {
    name: 'Onboarding 3 (day 7): collecting marbles', group: 'marketing',
    about: 'Day 7: the marble collection. Marketing (audience rules); never pressure to buy.',
    placeholders: { collection_url: { about: 'The collection', sample: `${SITE}/shop` } },
    defaults: { subject: 'Your Marble Bag is waiting', title: 'Collect the marbles you like', blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'text', text: 'There are 57 marbles to collect, each with its own Marble ID and certificate. They are looks only: every marble races the same, so pick the ones you like looking at.' }, { type: 'button', text: 'See the collection', href: '{{collection_url}}' }] },
  },
  'onboarding-4': {
    name: "Onboarding 4 (day 10): what's new", group: 'marketing',
    about: "Day 10: the newest tracks. Marketing (audience rules). {{new_tracks}} is filled with the three newest tracks' names.",
    placeholders: { new_tracks: { about: 'The three newest tracks', sample: 'Lake Como Villa Run, Quebec Château Run, Seoul Namsan Run' }, tracks_url: { about: 'The track list', sample: `${SITE}/tracks` } },
    defaults: { subject: 'New tracks on Marble Spins', title: "What's new", blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'text', text: 'New tracks this week: {{new_tracks}}.' }, { type: 'button', text: 'See the tracks', href: '{{tracks_url}}' }] },
  },
  // A newsletter's own content (phase 6): composed per newsletter (the newsletters table), not edited here.
  newsletter: {
    name: 'Newsletter', group: 'marketing', listed: false,
    about: 'A newsletter, written in Marketing > Newsletters.',
    placeholders: {},
    defaults: { subject: 'News from Marble Spins', title: 'News from Marble Spins', blocks: [{ type: 'text', text: 'Hi {{name}},' }, { type: 'text', text: 'Write the news here.' }] },
  },
};

const BLOCK_TYPES = ['heading', 'text', 'button', 'divider', 'image', 'core'];
const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;

const placeholdersOf = (kind) => ({ ...COMMON, ...(KINDS[kind]?.placeholders ?? {}) });
const isMarketing = (kind) => KINDS[kind]?.group === 'marketing';

/** Checks a template; → the cleaned template, or throws badRequest with every problem. */
function validate(kind, t) {
  const k = KINDS[kind];
  if (!k) throw badRequest(`Unknown email kind ${kind}`);
  const problems = [];
  const allowed = placeholdersOf(kind);
  const str = (v, max, what, required = true) => {
    const s = typeof v === 'string' ? v.trim() : '';
    if (required && !s) problems.push(`${what} is empty`);
    if (s.length > max) problems.push(`${what} is over ${max} characters`);
    for (const m of s.matchAll(PLACEHOLDER)) if (!allowed[m[1]]) problems.push(`${what}: unknown placeholder {{${m[1]}}} (this email may use ${Object.keys(allowed).map((p) => `{{${p}}}`).join(', ')})`);
    return s;
  };
  const out = { subject: str(t.subject, 160, 'The subject'), preheader: str(t.preheader ?? '', 200, 'The preheader', false) || null, title: str(t.title, 120, 'The title'), blocks: [] };
  if (!Array.isArray(t.blocks) || !t.blocks.length) problems.push('The email has no blocks');
  if ((t.blocks ?? []).length > 30) problems.push('At most 30 blocks');
  for (const [i, b] of (Array.isArray(t.blocks) ? t.blocks : []).entries()) {
    const n = `Block ${i + 1}`;
    if (!BLOCK_TYPES.includes(b?.type)) { problems.push(`${n}: unknown type ${b?.type}`); continue; }
    if (b.type === 'heading') out.blocks.push({ type: 'heading', text: str(b.text, 160, n) });
    else if (b.type === 'text') out.blocks.push({ type: 'text', text: str(b.text, 3000, n) });
    else if (b.type === 'button') {
      const href = str(b.href, 400, `${n}'s link`);
      if (href && !/^https:\/\//.test(href) && !/^\{\{\s*[a-z_]+_url\s*\}\}$/.test(href)) problems.push(`${n}: a button links to an https:// address or a {{…_url}} placeholder`);
      out.blocks.push({ type: 'button', text: str(b.text, 60, `${n}'s text`), href });
    } else if (b.type === 'image') {
      const src = str(b.src, 400, `${n}'s picture`);
      if (src && !/^https:\/\//.test(src)) problems.push(`${n}: a picture's address starts with https://`);
      out.blocks.push({ type: 'image', src, alt: str(b.alt ?? '', 160, `${n}'s description`, false) });
    } else out.blocks.push({ type: b.type });
  }
  const cores = out.blocks.filter((b) => b.type === 'core').length;
  if (k.group === 'service' && cores !== 1) problems.push("This email's locked part (the core block) must be in it exactly once");
  if (k.group === 'marketing' && cores) problems.push('A marketing email has no locked part');
  if (problems.length) throw badRequest(problems.join('. '));
  return out;
}

/** Fills placeholders (escaped) in a string. */
const fill = (s, values) => esc(s).replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, p) => esc(values[p] ?? ''));
const fillRaw = (s, values) => String(s).replace(PLACEHOLDER, (_, p) => String(values[p] ?? ''));

const UNSUBSCRIBE = (url) => `<p style="margin:22px 0 0;font-size:12px;color:#6b7280">You get these emails because you asked for news from Marble Spins or bought something from us. <a href="${esc(url)}" style="color:#6b7280">Unsubscribe</a> with one click.</p>`;

/** A template's email: { subject, html }. values: its placeholders; core: the locked part's HTML (service emails). */
function render(kind, t, { values = {}, core = '', unsubscribeUrl = null } = {}) {
  const v = { ...Object.fromEntries(Object.entries(placeholdersOf(kind)).map(([k]) => [k, ''])), ...values };
  const body = t.blocks.map((b) => {
    if (b.type === 'heading') return `<h2 style="font-size:17px;margin:18px 0 8px">${fill(b.text, v)}</h2>`;
    if (b.type === 'text') return fill(b.text, v).split(/\n{2,}/).map((p) => `<p style="margin:0 0 12px;white-space:pre-wrap">${p}</p>`).join('');
    if (b.type === 'button') return button(fillRaw(b.href, v), fillRaw(b.text, v));
    if (b.type === 'divider') return '<hr style="border:0;border-top:1px solid #e5e7eb;margin:18px 0">';
    if (b.type === 'image') return `<p style="margin:12px 0"><img src="${esc(b.src)}" alt="${esc(b.alt ?? '')}" style="max-width:100%;border-radius:10px"></p>`;
    return core;
  }).join('\n');
  const pre = t.preheader ? `<div style="display:none;max-height:0;overflow:hidden">${fill(t.preheader, v)}</div>` : '';
  const foot = isMarketing(kind) ? UNSUBSCRIBE(unsubscribeUrl ?? `${SITE}/settings`) : '';
  return { subject: fillRaw(t.subject, v).replace(/\s+/g, ' ').trim(), html: layout(fillRaw(t.title, v), `${pre}${body}${foot}`) };
}

/** The published template of a kind (or null). */
async function published(db, kind) {
  const { rows: [t] } = await db.query(
    `SELECT version, subject, preheader, title, blocks FROM email_templates WHERE kind = $1 AND published_at IS NOT NULL ORDER BY published_at DESC, version DESC LIMIT 1`,
    [kind],
  );
  return t ?? null;
}

/**
 * The email to send: the published template's, or the one in code (`fallback()`) if none is published or it can't be
 * used. → { subject, html, templateVersion }.
 */
async function compose(db, kind, { values = {}, core = '', fallback, unsubscribeUrl } = {}) {
  try {
    const t = await published(db, kind);
    if (t) return { ...render(kind, t, { values, core, unsubscribeUrl }), templateVersion: t.version };
  } catch (err) {
    console.error(`[email] template ${kind}: ${err.message}; the email in code is used`);
  }
  if (!fallback) throw new Error(`No email for ${kind}`);
  return { ...fallback(), templateVersion: null };
}

/** A sample locked part for a preview or test-send (made by the same code as the real one). */
function sampleCore(kind) {
  const { cores } = require('./templates');
  const site = SITE;
  switch (kind) {
    case 'purchase-confirmation': return cores.purchaseCore({ orderNo: 'MS-1042', item: '2,500 coins', price: '$9.99 incl. VAT', paidAt: '16 November 2026 at 14:05 (Swedish time)', kind: 'coins', agreed: ['I want the coins now and agree that my right of withdrawal ends when they are delivered.'], purchasesUrl: `${site}/purchases`, termsUrl: `${site}/legal#sale`, receipt: { number: 'K-2026-00001', url: `${site}/purchases/receipt/K-2026-00001` } });
    case 'withdrawal-received': return cores.withdrawalCore({ orderNo: 'MS-1042', item: 'Holiday Season Pass 2026', price: '$4.99', receivedAt: '16 November 2026 at 14:05 (Swedish time)' });
    case 'credit-note': return cores.creditCore({ number: 'KR-2026-00001', orderNo: 'MS-1042', item: '2,500 coins (refund)', amount: '$9.99', receiptNumber: 'K-2026-00001', url: `${site}/purchases/receipt/KR-2026-00001` });
    case 'support-reply': return cores.supportReplyCore({ ref: 'S-1043', body: 'Thanks for writing. Your coins are back on your account now.', original: 'My coins disappeared after a race.' });
    case 'password-reset': return cores.passwordCore({ link: `${site}/reset-password?token=sample`, minutes: 60 });
    case 'confirm-email': return require('../account/emailConfirm').core({ link: `${site}/confirm-email?t=sample` });
    default: return '';
  }
}

/** Sample values for a preview or test-send. */
const samples = (kind) => Object.fromEntries(Object.entries(placeholdersOf(kind)).map(([k, p]) => [k, p.sample]));

module.exports = { KINDS, BLOCK_TYPES, COMMON, placeholdersOf, isMarketing, validate, render, published, compose, samples, sampleCore };
