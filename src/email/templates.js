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

module.exports = { passwordReset, esc };
