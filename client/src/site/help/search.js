/**
 * The Help Centre's search: as the player types, the questions that match best.
 *
 *   - words in any order; every word typed has to match somewhere (when nothing matches them all,
 *     the questions that match most of them);
 *   - forgiving: "refunds" finds "refund", "refnd" finds "refund" (one letter off from 4 letters,
 *     two from 8), the last word counts while it is still being typed ("purch" → purchase);
 *   - the question counts most, then its section's name, then the answer;
 *   - synonyms: "money" finds coins and refunds, "card" finds payments, "delete" finds delete account…
 * Pure functions, no React: tested in client/test/help.test.js.
 */

const STOP = new Set(('a an and are am as at be been but by can could did do does doing for from get got had has have how i if in into is it its '
  + 'just me my of on or our so than that the their them then there these they this to too us was we were what whats when where which who '
  + 'why will with would you your youre im ive dont cant doesnt didnt isnt wont need want please many much some any more most only also very '
  + 'still after before about').split(' '));

/** Words that should also find these (the left side as typed, the right side as the help texts say it). */
export const SYNONYMS = {
  money: ['refund', 'cash', 'pay', 'price', 'coin'],
  cash: ['money', 'coin'],
  dollar: ['price', 'pack', 'cost'],
  card: ['payment', 'pay', 'stripe'],
  credit: ['card', 'payment'],
  visa: ['card', 'payment'],
  mastercard: ['card', 'payment'],
  paypal: ['payment', 'pay'],
  pay: ['payment', 'buy', 'purchase'],
  paid: ['payment', 'pay', 'buy'],
  payment: ['pay', 'purchase', 'buy'],
  buy: ['purchase', 'pay'],
  bought: ['buy', 'purchase'],
  purchase: ['buy', 'pay'],
  charge: ['payment', 'pay', 'refund'],
  charged: ['payment', 'pay', 'refund'],
  refund: ['refund', 'money'],
  cancel: ['refund', 'delete'],
  delete: ['delete', 'account', 'remove'],
  remove: ['delete', 'removed'],
  close: ['delete', 'account'],
  erase: ['delete', 'data'],
  gdpr: ['privacy', 'data', 'delete'],
  privacy: ['privacy', 'data'],
  password: ['password', 'forgot', 'log'],
  login: ['log', 'password', 'account', 'sign'],
  signin: ['log', 'sign', 'account'],
  signup: ['sign', 'save', 'account'],
  register: ['save', 'account', 'sign'],
  forgot: ['forgot', 'password'],
  email: ['email', 'news', 'unsubscribe'],
  mail: ['email'],
  newsletter: ['news', 'email', 'unsubscribe'],
  spam: ['email', 'unsubscribe'],
  price: ['price', 'cost', 'pack', 'coin'],
  cost: ['price', 'cost', 'pack'],
  expensive: ['price', 'cost'],
  cheap: ['price', 'cheaper'],
  speed: ['faster', 'speed'],
  fast: ['faster'],
  faster: ['faster', 'speed'],
  win: ['decided', 'win', 'lose'],
  lose: ['lose', 'random'],
  lost: ['lose', 'lost'],
  unfair: ['fair', 'random', 'cheat'],
  rigged: ['random', 'decided', 'fair'],
  luck: ['random'],
  lag: ['slow', 'hot'],
  laggy: ['slow'],
  freeze: ['slow', 'load'],
  crash: ['load', 'bug'],
  stuck: ['load', 'stuck'],
  broken: ['bug', 'load'],
  error: ['bug', 'load', 'offline'],
  glitch: ['bug'],
  internet: ['offline', 'connection'],
  wifi: ['offline', 'connection'],
  connection: ['offline', 'connection'],
  kid: ['child', 'parent', 'younger'],
  kids: ['child', 'parent', 'younger'],
  son: ['child', 'parent'],
  daughter: ['child', 'parent'],
  minor: ['child', 'under', 'younger'],
  age: ['age', 'under', 'younger'],
  invite: ['friend', 'room', 'code'],
  party: ['friend', 'room'],
  friend: ['friend', 'room'],
  room: ['room', 'friend'],
  message: ['chat', 'contact'],
  skin: ['look', 'marble', 'shade'],
  style: ['look', 'shade'],
  colour: ['shade'],
  color: ['shade'],
  hack: ['cheat', 'cheating'],
  bot: ['cheat', 'bot'],
  report: ['report', 'cheat', 'bug'],
  receipt: ['receipt', 'order'],
  invoice: ['receipt', 'order'],
  order: ['order', 'receipt', 'purchase'],
  music: ['sound', 'music', 'speaker'],
  audio: ['sound', 'speaker'],
  mute: ['sound', 'speaker'],
  volume: ['sound', 'speaker'],
  username: ['name'],
  nickname: ['name'],
  reward: ['earn', 'bonus', 'coin'],
  prize: ['earn', 'bonus'],
  earn: ['earn', 'bonus', 'coin'],
  midnight: ['day', 'daily'],
  tomorrow: ['day', 'daily'],
  app: ['app', 'iphone', 'android'],
  ios: ['iphone', 'app'],
  ipad: ['tablet', 'iphone'],
  download: ['app', 'download'],
  support: ['contact', 'help'],
  human: ['contact'],
  phone: ['phone', 'iphone', 'android'],
  map: ['track'],
  level: ['track', 'level'],
  course: ['track'],
  computer: ['cpu', 'computer'],
  ai: ['cpu', 'computer'],
  bots: ['cpu', 'computer', 'bot'],
  coin: ['coin'],
  gems: ['coin'],
  currency: ['coin', 'price'],
  expire: ['expire'],
  steal: ['cheat'],
};

/** Lowercase, accents off, apostrophes dropped, everything else not a letter or digit → space. */
export function normalise(text) {
  return String(text ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** A light English stem: coins → coin, refunds → refund, deleted/deleting/delete → delet, racing/races → rac. */
export function stem(word) {
  let w = word;
  for (const end of ['ing', 'ed', 'es', 's']) {
    if (w.length - end.length >= 3 && w.endsWith(end) && !(end === 's' && w.endsWith('ss'))) { w = w.slice(0, -end.length); break; }
  }
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

export const words = (text) => normalise(text).split(' ').filter(Boolean);

/** Damerau–Levenshtein distance, giving up above `max`. */
export function distance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

const FIELDS = { q: 3, section: 1.5, text: 1 };

/** The search index of a FAQ (buildFaq()): one entry per question, plus every word stem seen. */
export function buildIndex(sections) {
  const entries = [];
  const vocab = new Map(); // stem → Set of entry indexes
  for (const s of sections) {
    for (const q of s.questions) {
      const k = entries.length;
      const fields = { q: new Set(words(q.q).map(stem)), section: new Set(words(s.title).map(stem)), text: new Set(words(q.text).map(stem)) };
      const key = new Set(words(q.q).filter((w) => !STOP.has(w)).map(stem));
      entries.push({ question: q, fields, key, normQ: normalise(q.q) });
      for (const set of Object.values(fields)) for (const st of set) (vocab.get(st) ?? vocab.set(st, new Set()).get(st)).add(k);
    }
  }
  return { entries, vocab };
}

/** How well the typed word `term` matches the index word `token` (1 exact … 0 none). */
function closeness(term, token, { typing }) {
  if (term === token) return 1;
  if (typing && term.length >= 2 && token.startsWith(term)) return 0.85;
  if (term.length >= 4 && token.length >= 4) {
    const d = distance(term, token, term.length >= 8 ? 2 : 1);
    if (d <= (term.length >= 8 ? 2 : 1)) return d === 1 ? 0.65 : 0.5;
    if (typing && token.length > term.length && distance(term, token.slice(0, term.length), 1) <= 1) return 0.55;
  }
  return 0;
}

/**
 * The questions matching `query`, best first: [{ question, score, stems }] where `stems` are the
 * index words that matched (to highlight). Nothing under 2 letters.
 */
export function search(index, query, { limit = 8 } = {}) {
  const typed = words(query);
  if (normalise(query).replace(/ /g, '').length < 2 || !typed.length) return [];
  const endsInSpace = /\s$/.test(String(query));
  let terms = typed.map((w, i) => ({ raw: w, typing: i === typed.length - 1 && !endsInSpace }));
  const meaningful = terms.filter((t) => !STOP.has(t.raw));
  if (meaningful.length) terms = meaningful;

  const vocab = [...index.vocab.keys()];
  // Per typed word: the index words it reaches, and how well (synonyms count a little less).
  const reach = terms.map(({ raw, typing }) => {
    const found = new Map();
    const tryTerm = (term, weight, allowTyping) => {
      for (const token of vocab) {
        if (token !== term && STOP.has(token)) continue; // (a near miss on "many" or "the" means nothing)
        const c = closeness(term, token, { typing: allowTyping });
        if (c > 0 && c * weight > (found.get(token) ?? 0)) found.set(token, c * weight);
      }
    };
    tryTerm(stem(raw), 1, typing);
    if (raw !== stem(raw)) tryTerm(raw, 1, typing);
    const syn = SYNONYMS[raw] ?? SYNONYMS[stem(raw)]
      ?? Object.entries(SYNONYMS).find(([k]) => typing && raw.length >= 3 && k.startsWith(raw))?.[1]
      ?? (raw.length >= 4 ? Object.entries(SYNONYMS).find(([k]) => k.length >= 4 && distance(raw, k, 1) <= 1)?.[1] : undefined); // (mony → money)
    (syn ?? []).forEach((s, k) => tryTerm(stem(s), Math.max(0.5, 0.75 - 0.05 * k), false)); // (the first synonyms count most)
    return found;
  });

  const results = index.entries.map((entry) => {
    let score = 0;
    let matchedWords = 0;
    const stems = new Set();
    for (const found of reach) {
      let best = 0;
      for (const [token, c] of found) {
        let here = 0;
        for (const [field, weight] of Object.entries(FIELDS)) if (entry.fields[field].has(token)) here = Math.max(here, c * weight);
        if (here > 0) { stems.add(token); best = Math.max(best, here); }
      }
      if (best > 0) { matchedWords += 1; score += best; }
    }
    // A question that is mostly the words typed beats a longer one that also has them.
    if (entry.key.size) score += (2 * [...entry.key].filter((k) => stems.has(k)).length) / entry.key.size;
    const phrase = normalise(query);
    if (phrase.length >= 4 && entry.normQ.includes(phrase)) score += 3;
    return { question: entry.question, score, stems, matchedWords };
  }).filter((r) => r.matchedWords > 0);

  const all = results.filter((r) => r.matchedWords === reach.length);
  const pool = all.length || reach.length < 2 ? all : results.filter((r) => r.matchedWords >= Math.ceil(reach.length / 2));
  return pool.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** A text cut into [{ text, hit }] pieces, the words whose stem is in `stems` marked as hits. */
export function highlight(text, stems) {
  const parts = [];
  const re = /[\p{L}\p{N}'’]+/gu;
  let last = 0;
  for (const m of String(text).matchAll(re)) {
    const st = stem(normalise(m[0]));
    if (!st || !stems?.has(st)) continue;
    if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false });
    parts.push({ text: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false });
  return parts;
}

/** A short piece of the answer around its first matching word (`size` characters or so). */
export function snippet(text, stems, size = 120) {
  const parts = highlight(text, stems);
  let at = 0;
  for (const p of parts) { if (p.hit) break; at += p.text.length; }
  if (at >= text.length) at = 0;
  let start = Math.max(0, at - Math.round(size / 3));
  if (start > 0) { const sp = text.indexOf(' ', start); start = sp > -1 && sp < at ? sp + 1 : start; }
  let end = Math.min(text.length, start + size);
  if (end < text.length) { const sp = text.lastIndexOf(' ', end); if (sp > at) end = sp; }
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}
