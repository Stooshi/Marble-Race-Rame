'use strict';

/**
 * The pass reminder emails, in English and Swedish (the language the browser had when the reminder
 * was asked for). Texts reviewed by Moses before sending is switched on: project doc
 * claude/pass-reminder-emails.md. {pass} is the pass's name, {opens} the sale's first day ("28
 * November" / "28 november"), {activates} the season's first day.
 *
 * Every email has a cancel link (and List-Unsubscribe headers, so a mail app's own button works).
 */
const company = require('../../client/src/shared/company.json');

const TEXTS = {
  en: {
    confirm: {
      subject: 'Confirm your reminder for the {pass}',
      title: 'Confirm your reminder',
      intro: 'You asked us to email you when the {pass} goes on sale on {opens}. Please confirm that this is your email address:',
      button: 'Yes, remind me',
      after: 'We only send the reminder to confirmed addresses. If you don\'t confirm within 7 days, we delete your address and you won\'t hear from us.',
      notYou: 'Didn\'t ask for this? Then ignore this email: nothing more will be sent.',
      cancel: 'Changed your mind? Cancel the reminder',
    },
    reminder: {
      subject: 'The {pass} is on sale now',
      title: 'The {pass} is on sale',
      intro: 'As you asked, here\'s your reminder: the {pass} is on sale now.',
      details: 'It activates on {activates} at 00:00 Swedish time: 31 holiday tracks from around the world, a Track of the Day with +50% race coins, and the numbered Winter Solstice marble. One payment, not a subscription.',
      button: 'See the pass',
      refund: 'Bought before {activates}? Until the pass activates, you get a full refund if you ask.',
      last: 'This is the one reminder you asked for. We won\'t email you about it again, and we delete your address within 30 days.',
      cancel: 'Don\'t want it? Remove my address',
    },
    footer: 'You get this email because someone asked for a pass reminder with this address on marblespins.com.',
    cancelShort: 'Cancel the reminder',
    raw: 'If the button doesn\'t work, copy this address into your browser:',
  },
  sv: {
    confirm: {
      subject: 'Bekräfta din påminnelse om {pass}',
      title: 'Bekräfta din påminnelse',
      intro: 'Du bad oss mejla dig när {pass} börjar säljas den {opens}. Bekräfta att det här är din e-postadress:',
      button: 'Ja, påminn mig',
      after: 'Vi skickar bara påminnelsen till bekräftade adresser. Bekräftar du inte inom 7 dagar raderar vi din adress och du hör inget mer från oss.',
      notYou: 'Har du inte bett om det här? Strunta i mejlet, så skickas inget mer.',
      cancel: 'Ångrat dig? Avbryt påminnelsen',
    },
    reminder: {
      subject: '{pass} säljs nu',
      title: '{pass} säljs nu',
      intro: 'Som du bad om: här är din påminnelse. {pass} säljs nu.',
      details: 'Passet aktiveras den {activates} kl. 00:00 svensk tid: 31 helgbanor från hela världen, dagens bana med +50 % racemynt och den numrerade kulan Winter Solstice. En betalning, ingen prenumeration.',
      button: 'Se passet',
      refund: 'Köpt före den {activates}? Tills passet aktiveras får du pengarna tillbaka om du ber om det.',
      last: 'Det här är den enda påminnelsen du bad om. Vi mejlar dig inte om det igen, och vi raderar din adress inom 30 dagar.',
      cancel: 'Vill du inte ha den? Ta bort min adress',
    },
    footer: 'Du får det här mejlet för att någon bad om en påminnelse om passet med den här adressen på marblespins.com.',
    cancelShort: 'Avbryt påminnelsen',
    raw: 'Fungerar inte knappen? Kopiera den här adressen till din webbläsare:',
  },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fill = (text, vars) => Object.entries(vars).reduce((t, [k, v]) => t.split(`{${k}}`).join(v), text);

/** "28 November" (en) or "28 november" (sv): a date in the season's time zone. */
function dayText(iso, lang, timeZone = 'Europe/Stockholm') {
  return new Intl.DateTimeFormat(lang === 'sv' ? 'sv-SE' : 'en-GB', { timeZone, day: 'numeric', month: 'long' }).format(new Date(iso));
}

function layout(lang, title, body, cancelLink) {
  const t = TEXTS[lang];
  return `<!doctype html><html lang="${lang}"><body style="margin:0;padding:0;background:#f2f4f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;font-family:Arial,Helvetica,sans-serif;color:#1b1f2a">
<tr><td style="background:#0e1320;border-radius:14px 14px 0 0;padding:18px 24px;color:#f2f4f8;font-size:22px;font-weight:bold">marblespins</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">
<h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:0 24px 20px;font-size:12px;color:#6b7280">${esc(t.footer)} <a href="${esc(cancelLink)}" style="color:#6b7280">${esc(t.cancelShort)}</a><br>${lang === 'sv' ? 'Marble Spins drivs av' : 'Marble Spins is operated by'} ${esc(company.name)}, org.nr ${esc(company.orgNo)}, ${esc(company.street)}, ${esc(company.postcode)} ${esc(company.city)}, ${esc(company.country)}.</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href, label) => `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#ffd21f;color:#0e1320;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block">${esc(label)}</a></p>`;
const p = (text, style = '') => `<p style="margin:0 0 12px;${style}">${esc(text)}</p>`;

/** The confirmation email (double opt-in). → { subject, html } */
function confirmEmail({ lang = 'en', season, confirmLink, cancelLink }) {
  const L = TEXTS[lang] ? lang : 'en';
  const t = TEXTS[L].confirm;
  const vars = { pass: season.pass_name, opens: dayText(season.pass_sale_starts_at, L, season.time_zone) };
  return {
    subject: fill(t.subject, vars),
    html: layout(L, fill(t.title, vars), [
      p(fill(t.intro, vars)),
      button(confirmLink, t.button),
      p(t.after),
      p(t.notYou),
      `<p style="margin:0 0 12px"><a href="${esc(cancelLink)}" style="color:#374151">${esc(t.cancel)}</a></p>`,
      `<p style="margin:16px 0 0;font-size:12px;color:#6b7280">${esc(TEXTS[L].raw)}<br><span style="word-break:break-all">${esc(confirmLink)}</span></p>`,
    ].join('\n'), cancelLink),
  };
}

/** The one reminder when the sale opens. → { subject, html } */
function reminderEmail({ lang = 'en', season, passLink, cancelLink }) {
  const L = TEXTS[lang] ? lang : 'en';
  const t = TEXTS[L].reminder;
  const vars = { pass: season.pass_name, activates: dayText(season.starts_at, L, season.time_zone) };
  return {
    subject: fill(t.subject, vars),
    html: layout(L, fill(t.title, vars), [
      p(fill(t.intro, vars)),
      p(fill(t.details, vars)),
      button(passLink, t.button),
      p(fill(t.refund, vars)),
      p(t.last, 'color:#4b5563'),
      `<p style="margin:0 0 12px"><a href="${esc(cancelLink)}" style="color:#374151">${esc(t.cancel)}</a></p>`,
    ].join('\n'), cancelLink),
  };
}

module.exports = { TEXTS, confirmEmail, reminderEmail, dayText };
