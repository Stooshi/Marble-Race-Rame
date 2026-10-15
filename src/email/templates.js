'use strict';

/** The emails' contents: plain, readable HTML with inline styles (mail apps ignore style sheets). */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout(title, body) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f2f4f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;font-family:Arial,Helvetica,sans-serif;color:#1b1f2a">
<tr><td style="background:#0e1320;border-radius:14px 14px 0 0;padding:18px 24px;color:#f2f4f8;font-size:22px;font-weight:bold">marblespins</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">
<h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:0 24px 20px;font-size:12px;color:#6b7280">Marble Spins · marblespins.com</td></tr>
</table></td></tr></table></body></html>`;
}

/** The password-reset email: one link, valid for `minutes`. */
function passwordReset({ username, link, minutes }) {
  return {
    subject: 'Reset your Marble Spins password',
    html: layout('Reset your password', `
<p>Hi ${esc(username)},</p>
<p>Someone asked to reset the password for your Marble Spins account. If it was you, choose a new password here:</p>
<p style="margin:24px 0"><a href="${esc(link)}" style="background:#ffd21f;color:#0e1320;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block">Choose a new password</a></p>
<p>The link works once, for ${minutes} minutes. If the button doesn't work, copy this address into your browser:<br><span style="word-break:break-all;color:#374151">${esc(link)}</span></p>
<p>Didn't ask for this? Then you can ignore this email: your password stays the same.</p>`),
  };
}

const paragraphs = (text) => esc(text).split(/\n{2,}/).map((p) => `<p style="margin:0 0 12px;white-space:pre-wrap">${p}</p>`).join('');

/** To the support address: a new message from the contact form (the screenshot stays in the back office). */
function supportNotification({ ref, name, email, category, order_no: orderNo, message, account, linkedBy, hasScreenshot, link }) {
  const row = (k, v) => `<tr><td style="padding:3px 12px 3px 0;color:#6b7280;vertical-align:top">${esc(k)}</td><td style="padding:3px 0">${v}</td></tr>`;
  const who = account ? `${esc(account)}${linkedBy === 'email' ? ' <span style="color:#b45309">(matched by the email typed, not logged in)</span>' : ''}` : 'no account found';
  return {
    subject: `[${ref}] ${category}: ${name}`.replace(/[\r\n\t]+/g, ' '), // (one line, whatever was typed)
    html: layout(`New support message ${ref}`, `
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;margin:0 0 16px">
${row('From', `${esc(name)} &lt;${esc(email)}&gt;`)}
${row('Account', who)}
${row('Category', esc(category))}
${orderNo ? row('Order', esc(orderNo)) : ''}
${row('Screenshot', hasScreenshot ? 'yes, in the back office' : 'none')}
</table>
<div style="border-left:3px solid #ffd21f;padding:4px 0 4px 12px;margin:0 0 18px">${paragraphs(message)}</div>
<p style="margin:24px 0"><a href="${esc(link)}" style="background:#ffd21f;color:#0e1320;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block">Open in the back office</a></p>
<p style="color:#6b7280;font-size:13px">Replying to this email goes to the player directly; replies sent from the back office are logged there.</p>`),
  };
}

/** To the player: a reply from support, with their own message quoted below. */
function supportReply({ name, ref, body, original }) {
  return {
    subject: `Re: your message to Marble Spins (${ref})`,
    html: layout('A reply from Marble Spins support', `
<p>Hi ${esc(name)},</p>
${paragraphs(body)}
<p style="margin-top:22px;color:#6b7280;font-size:13px">Your message (${esc(ref)}):</p>
<div style="border-left:3px solid #d1d5db;padding:2px 0 2px 12px;color:#6b7280;font-size:13px">${paragraphs(original)}</div>`),
  };
}

module.exports = { passwordReset, supportNotification, supportReply, esc };
