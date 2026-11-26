/**
 * Offensive player names (Moses, 22 Oct 2026): checked when a name is chosen or changed — the
 * account name at sign-up and when a guest saves, and the shown name — on the server (authoritative,
 * src/names) and in the forms (instant feedback). Names already taken before the filter are listed
 * in the back office (Name reports → "Names the filter would block").
 *
 * How a name is checked (`checkName(name)` → null if fine, else { word, lang }):
 *   1. Normalised: lower case, accents off (å→a, ø→o, ß→ss…), leetspeak read as letters
 *      (0→o, 1→i or l, 3→e, 4→a, 5→s, 7→t, 8→b, 9→g, @→a, $→s, !→i, |→i, +→t), and also with
 *      repeated letters collapsed ("fuuuck" → "fuck").
 *   2. CONTAINS words are blocked anywhere in the name, separators removed ("x_F.u-c_k_x").
 *      Only words that don't hide inside ordinary words go here.
 *   3. WORDS are blocked only as a whole part of the name: parts split at _ - . spaces, CamelCase
 *      and digits ("BigAss99" → big, ass), or the whole name run together. That keeps "Cassandra",
 *      "Scunthorpe", "therapist", "Dickens", "Sussex" and "Hancock" fine.
 *   4. ALLOW: names that would otherwise match by accident.
 *
 * Maintaining the list: add a word to the right language below (lower case, plain letters, no
 * leetspeak: that is handled), as CONTAINS only if it can't occur inside an ordinary word in any
 * language we list, else as WORDS. Run `npx vitest run test/nameFilter.test.js` (client): it checks
 * that every suggested sign-up name and a list of ordinary names still pass.
 */

// The words, by language. (Profanity, slurs, sexual terms and hate symbols. Deliberately short and
// strong rather than exhaustive: reports from players catch the rest.)
export const BLOCKED = {
  en: {
    contains: ['fuck', 'fck', 'shit', 'cunt', 'bitch', 'nigger', 'nigga', 'nigg', 'niqqa', 'niqqer', 'faggot', 'fagot', 'retard', 'whore', 'pussy', 'penis', 'vagina', 'dildo', 'blowjob', 'handjob', 'rimjob', 'jerkoff', 'jackoff', 'cumshot', 'cumslut', 'creampie', 'gangbang', 'porn', 'hentai', 'milf', 'erection', 'orgasm', 'masturbat', 'ejaculat', 'pedophile', 'paedophile', 'pedo', 'rapist', 'raping', 'incest', 'bestiality', 'motherfuck', 'asshole', 'arsehole', 'bollock', 'wanker', 'twat', 'bastard', 'douchebag', 'dickhead', 'cocksuck', 'wetback', 'beaner', 'tranny', 'shemale', 'hitler', 'nazi', 'kkk', 'swastika', 'holocaust', 'auschwitz', 'siegheil', 'whitepower', 'jihad', 'terrorist', 'killyourself'],
    words: ['ass', 'arse', 'cock', 'dick', 'tits', 'titty', 'boob', 'boobs', 'cum', 'jizz', 'sex', 'sexy', 'anal', 'anus', 'rape', 'fag', 'fuk', 'slut', 'boner', 'coon', 'gook', 'paki', 'negro', 'nig', 'kike', 'chink', 'spic', 'dyke', 'slave', 'piss', 'prick', 'knob', 'tit', 'hoe', 'thot', 'incel', 'heil', 'reich', 'nsfw', 'xxx', 'onlyfans', 'meth', 'cocaine', 'heroin', 'isis', 'kys'],
  },
  sv: {
    contains: ['fitta', 'jävla', 'javla', 'knulla', 'knull', 'neger', 'blatte', 'svartskalle', 'kukhuvud', 'rövhål', 'rovhal', 'skitstövel'],
    words: ['kuk', 'hora', 'bög', 'slyna', 'mongo', 'cp'],
  },
  de: {
    contains: ['scheisse', 'scheiße', 'fotze', 'hurensohn', 'wichser', 'arschloch', 'schlampe', 'schwuchtel', 'nutte', 'missgeburt', 'spast', 'kanake', 'muschi', 'ficken'],
    words: ['arsch', 'hure', 'pimmel', 'schwanz', 'titten', 'fick'],
  },
  fr: {
    contains: ['putain', 'salope', 'connard', 'connasse', 'enculé', 'bougnoule', 'branleur', 'batard'],
    words: ['pute', 'merde', 'con', 'couille', 'couilles', 'pd', 'pédé', 'nique', 'chatte'],
  },
  es: {
    contains: ['cabron', 'gilipollas', 'maricon', 'pendejo', 'chingar', 'chingada', 'mamada', 'culero', 'joder', 'follar'],
    words: ['puta', 'puto', 'coño', 'verga', 'mierda', 'culo', 'polla', 'zorra', 'marica'],
  },
  it: {
    contains: ['cazzo', 'vaffanculo', 'stronzo', 'stronza', 'puttana', 'frocio', 'minchia', 'coglione'],
    words: ['merda', 'culo', 'fica', 'figa', 'troia'],
  },
  pt: {
    contains: ['caralho', 'buceta', 'viado', 'filhodaputa', 'arrombado'],
    words: ['merda', 'cu', 'puta', 'porra'],
  },
  nl: {
    contains: ['kanker', 'klootzak', 'kutwijf', 'godverdomme', 'flikker', 'mongool'],
    words: ['kut', 'lul', 'pik', 'hoer', 'tering'],
  },
  pl: {
    contains: ['kurwa', 'pierdol', 'jebac', 'chuj', 'skurwysyn', 'pizda'],
    words: ['dupa', 'kutas', 'cipa'],
  },
  tr: {
    contains: ['orospu', 'siktir', 'amcik', 'yarrak', 'götveren', 'pezevenk', 'ibne'],
    words: ['amk', 'sik'],
  },
  no_da: {
    contains: ['faen', 'kuksuger', 'fisse', 'kusse', 'luder', 'perker'],
    words: ['pikk', 'lort'],
  },
  fi: {
    contains: ['vittu', 'perkele', 'saatana', 'kyrpä', 'huora', 'mulkku', 'neekeri'],
    words: ['paska'],
  },
};

// Numbers used as hate codes (checked on the digits as typed).
export const BLOCKED_NUMBERS = ['1488', '14/88'];

// Names that contain a blocked word by accident.
export const ALLOW = ['scunthorpe', 'penistone', 'cockburn', 'hancock', 'dickens', 'dickinson', 'sussex', 'essex', 'middlesex', 'cassandra', 'assassin', 'classic', 'glasses', 'bass', 'grape', 'therapist', 'shitake', 'shiitake', 'cocktail', 'peacock', 'hitchcock', 'analyst', 'canal', 'japan', 'kukri', 'bogota', 'fanta', 'fantastic', 'fancy', 'fantasy', 'fanfare', 'infant', 'elephant', 'fan', 'fans', 'cpu', 'apache', 'kanken', 'horace', 'horatio', 'shora', 'mongoose', 'mongolia', 'idiotsafe', 'conan', 'contest', 'cone', 'icon', 'bacon', 'falcon', 'sporran', 'pedal', 'speedo', 'torpedo', 'pedometer', 'encyclopedia', 'pedro', 'nigeria', 'nigerian', 'spica', 'spice', 'spicy', 'despicable', 'conspicuous', 'scrape', 'drape', 'trapeze', 'sextant', 'sextet', 'tycoon', 'raccoon', 'cocoon', 'title', 'titan', 'kitty', 'pitty', 'gotham', 'gothic', 'sikh', 'diet', 'dieter', 'killer', 'skill', 'skilled', 'meths', 'damnation', 'hoenn', 'pakistan', 'isisi', 'nobel', 'noble', 'kitten', 'arsenal', 'parsec', 'cumulus', 'cucumber', 'documentary', 'circumference', 'scum', 'homogeneous', 'homeless', 'gaydar', 'pussycat', 'pussywillow', 'cocky', 'figaro', 'figure', 'configure', 'apart', 'apartment', 'capable', 'grapefruit', 'hoya', 'nazir', 'nazira', 'crisis', 'reputation', 'computation', 'centipede', 'stampede', 'mongodb', 'niggle', 'sniggle', 'sniggles', 'niggles', 'ashitaka', 'toshitaka', 'yoshitaka', 'hoshitaka', 'kashitaka'];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', 9: 'g', '@': 'a', $: 's', '!': 'i', '|': 'i', '+': 't', '€': 'e', '£': 'l' };
const SPECIAL = { ß: 'ss', æ: 'ae', ø: 'o', œ: 'oe', ł: 'l', đ: 'd', ð: 'd', þ: 'th', ı: 'i' };

/** Lower case, no accents (å → a, ö → o, ø → o, ß → ss). */
export function plain(s) {
  return String(s ?? '').toLowerCase().replace(/[ßæøœłđðþı]/g, (c) => SPECIAL[c]).normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

/** Leetspeak read as letters; `one`: what "1" stands for ('i' or 'l'). */
const unleet = (s, one = 'i') => s.replace(/[0-9@$!|+€£]/g, (c) => (c === '1' ? one : LEET[c] ?? c));
const letters = (s) => s.replace(/[^a-z]/g, '');
const collapse = (s) => s.replace(/(.)\1+/g, '$1');

const ENTRIES = Object.entries(BLOCKED).flatMap(([lang, { contains = [], words = [] }]) => [
  ...contains.map((w) => ({ w: letters(plain(w)), lang, mode: 'contains' })),
  ...words.map((w) => ({ w: letters(plain(w)), lang, mode: 'word' })),
]).filter((e) => e.w.length >= 2);
const ALLOWED = new Set(ALLOW.map((w) => letters(plain(w))));

/** The parts of a name: split at separators, CamelCase and digit runs (digits read as letters too). */
function parts(name) {
  const raw = String(name ?? '');
  const camel = raw.replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g, '$1 $2');
  const out = new Set();
  for (const piece of camel.split(/[\s_.\-–—,;:/\\'"()[\]{}]+/).filter(Boolean)) {
    const p = plain(piece);
    // Read as leetspeak only when every character reads as a letter ("a55", "N1gg3r"), not when
    // other digits are mixed in ("a52665"): those are numbers.
    for (const one of ['i', 'l']) { const u = unleet(p, one); if (/^[a-z]+$/.test(u)) out.add(u); }
    // Digits at the ends are just numbers ("Ass69" → "ass"), and digits inside split words ("ass2ass").
    for (const sub of p.split(/[0-9]+/)) out.add(letters(sub));
  }
  out.delete('');
  return [...out];
}

/** null if the name is fine; otherwise { word, lang } (the first blocked word found). */
export function checkName(name) {
  const raw = String(name ?? '');
  if (!raw.trim()) return null;
  // (As a number of its own: "x1488x", "Hitler_14_88"; not inside a longer number like 214885.)
  const numbers = raw.replace(/(\d)[\s_.\-/]+(?=\d)/g, '$1').match(/\d+/g) ?? [];
  for (const n of BLOCKED_NUMBERS) if (numbers.includes(n.replace(/\D/g, ''))) return { word: n, lang: 'numbers' };
  const p = plain(raw);
  // The whole name run together, for CONTAINS words across separators ("f_u_c_k"). Digits inside a
  // part are read as letters ("Sh1tHead", "N1gg3r"), and a single digit at its end ("Kurw4"), but a
  // longer number at either end of a part is just a number ("push1728", "Player4821").
  // (And only in a part with more letters than digits: "f177ad" is a number-ish code, not "fitta".)
  const edge = (piece, one) => {
    const x = piece.replace(/^[0-9]{2,}/, '').replace(/[0-9]{2,}$/, '');
    const d = (x.match(/[0-9]/g) ?? []).length;
    return d && d >= x.length - d ? x.replace(/[0-9]/g, '') : unleet(x, one);
  };
  const pieces = p.split(/[\s_.\-–—,;:/\\'"()[\]{}]+/).filter(Boolean);
  const wholes = [...new Set(['i', 'l'].map((one) => letters(pieces.map((x) => edge(x, one)).join(''))))];
  if (wholes.some((w) => ALLOWED.has(w))) return null;
  const all = parts(raw);
  // The parts as typed (letters only, no digits read as letters), for stretched words ("assss").
  const typedTokens = String(raw).replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g, '$1 $2').split(/[^A-Za-zÀ-ÿ]+/).map((t) => letters(plain(t))).filter(Boolean);
  const tokens = all.filter((t) => !ALLOWED.has(t));
  // Repeated letters are collapsed ("fuuuck") only in the letters as typed, never after reading
  // digits as letters: random digits ("42f17a", "b28088") would otherwise spell words by chance.
  const typed = letters(p);
  const hay = [...wholes, collapse(typed)];
  // A blocked word inside an allowed one ("Pussycat", "NazirKhan") doesn't count: the allowed words
  // that are whole parts of this name are taken out first (so "NaziRacer" still counts).
  const here = all.filter((t) => ALLOWED.has(t) && t.length >= 4);
  const cleaned = hay.map((h) => here.reduce((acc, a) => acc.split(a).join(' '), h));
  for (const e of ENTRIES) {
    if (e.mode === 'contains') {
      const c = collapse(e.w);
      // (The collapsed form only against the letters as typed: see `hay`.)
      if (cleaned.some((h) => h.includes(e.w)) || (c.length >= 4 && cleaned[cleaned.length - 1].includes(c))) return { word: e.w, lang: e.lang };
    } else {
      const c = collapse(e.w);
      const hit = (t) => t === e.w;
      const stretched = (t) => collapse(t) === c && t.length > e.w.length && /^[a-z]+$/.test(t);
      if (tokens.some(hit) || wholes.some(hit) || typedTokens.some(stretched) || stretched(typed)) return { word: e.w, lang: e.lang };
    }
  }
  return null;
}

export const NAME_NOT_ALLOWED = "That name isn't allowed. Please pick another one.";
