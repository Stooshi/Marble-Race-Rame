import LANGUAGE from '../../shared/language.json';
/**
 * The save pop-up and quick sign-up in English and Swedish (Moses, 20 Oct 2026; approved on the
 * preview page). English only for now (Moses, 21 Oct: the site is in English; ../../shared/language.json);
 * the Swedish texts stay here for later, when a Swedish browser or phone gets Swedish again.
 */
export const lang = () => (!LANGUAGE.ENGLISH_ONLY && typeof navigator !== 'undefined' && /^sv\b/i.test(navigator.language || '') ? 'sv' : 'en');

export const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  sv: ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'],
};

export const TEXTS = {
  en: {
    note: (n) => `You've finished ${n} races as a guest.`,
    headline: "Save your marble — it's free",
    bullets: [
      'Keep your coins and marbles forever, on every device',
      'Your own unique starter marbles, each with its own Marble ID',
      'Climb the scoreboards under your own name',
      'News by email about new tracks and marbles, if you want it',
      'The Holiday Season pass (on sale 28 November)',
      'Never lose your progress: guests are lost after 90 days away',
    ],
    signUp: 'SIGN UP NOW',
    later: 'Later',
    formTitle: 'Save your marble',
    formSub: "Everything you've won as a guest moves to your account.",
    name: 'Player name',
    nameHint: '3–24 letters, numbers or _ · shown on the scoreboards',
    email: 'Email',
    password: 'Password',
    passwordHint: 'At least 8 characters',
    born: 'Born',
    year: 'Year',
    month: 'Month',
    terms: ['I accept the ', 'terms of use', ' and have read the ', 'privacy policy', '.'],
    news: 'Email me about new tracks and limited marbles (optional). You can stop any time.',
    save: 'SAVE MY MARBLE',
    saving: 'ONE MOMENT…',
    needTerms: 'Please tick the box to accept the terms of use.',
    needBirth: 'Please choose your birth year and month.',
    needName: 'Your player name: 3–24 letters, numbers or _.',
    needEmail: 'Please check your email address.',
    needPassword: 'Your password needs at least 8 characters.',
    confirmTitle: 'Check your email',
    confirmText: (email) => `We sent a link to ${email}. Tap it to confirm your address, and your marble is saved for good.`,
    confirmNote: 'Keep racing meanwhile: everything you win now is kept too.',
    resend: 'Send the link again',
    resent: 'Sent again.',
    keepRacing: 'KEEP RACING',
    savedTitle: 'Your marble is saved',
    savedText: (name) => `Welcome, ${name}! Your coins, marbles and races are in your account now, on every device.`,
    youngTitle: 'You can keep racing!',
    youngText: "Saving an account is for players 13 and older, so we haven't made one. You can race as a guest as much as you like: your coins and marbles stay on this device, as long as you come back within 90 days.",
  },
  sv: {
    note: (n) => `Du har kört ${n} lopp som gäst.`,
    headline: 'Spara din kula – det är gratis',
    bullets: [
      'Behåll dina mynt och kulor för alltid, på alla enheter',
      'Dina egna unika startkulor, var och en med sitt eget kul-ID',
      'Klättra på topplistorna under ditt eget namn',
      'Nyheter via e-post om nya banor och kulor, om du vill',
      'Säsongspasset för helgerna (säljs från 28 november)',
      'Förlora aldrig det du har vunnit: gäster försvinner efter 90 dagar borta',
    ],
    signUp: 'SKAPA KONTO NU',
    later: 'Senare',
    formTitle: 'Spara din kula',
    formSub: 'Allt du har vunnit som gäst flyttas till ditt konto.',
    name: 'Spelarnamn',
    nameHint: '3–24 bokstäver, siffror eller _ · syns på topplistorna',
    email: 'E-post',
    password: 'Lösenord',
    passwordHint: 'Minst 8 tecken',
    born: 'Född',
    year: 'År',
    month: 'Månad',
    terms: ['Jag godkänner ', 'användarvillkoren', ' och har läst ', 'integritetspolicyn', '.'],
    news: 'Mejla mig om nya banor och begränsade kulor (frivilligt). Du kan sluta när du vill.',
    save: 'SPARA MIN KULA',
    saving: 'ETT ÖGONBLICK…',
    needTerms: 'Kryssa i rutan för att godkänna användarvillkoren.',
    needBirth: 'Välj år och månad då du föddes.',
    needName: 'Ditt spelarnamn: 3–24 bokstäver, siffror eller _.',
    needEmail: 'Kontrollera din e-postadress.',
    needPassword: 'Lösenordet behöver minst 8 tecken.',
    confirmTitle: 'Kolla din e-post',
    confirmText: (email) => `Vi har skickat en länk till ${email}. Tryck på den för att bekräfta adressen, så är din kula sparad för gott.`,
    confirmNote: 'Kör vidare så länge: allt du vinner nu sparas också.',
    resend: 'Skicka länken igen',
    resent: 'Skickat igen.',
    keepRacing: 'KÖR VIDARE',
    savedTitle: 'Din kula är sparad',
    savedText: (name) => `Välkommen, ${name}! Dina mynt, kulor och lopp finns nu i ditt konto, på alla enheter.`,
    youngTitle: 'Du kan köra vidare!',
    youngText: 'Konton är för spelare som är 13 år eller äldre, så vi har inte skapat något. Du kan köra som gäst så mycket du vill: dina mynt och kulor finns kvar på den här enheten.',
  },
};

/** Age in whole years from birth year and month, the birth month counted as not yet reached (as the server does). */
export function ageFrom(year, month, now = new Date()) {
  const y = now.getUTCFullYear(); const m = now.getUTCMonth() + 1;
  return y - year - (m <= month ? 1 : 0);
}
