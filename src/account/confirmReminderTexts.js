'use strict';

/**
 * The three reminders (Moses, 19 Nov 2026: day 1, 3 and 7 after sign-up while the address isn't confirmed; texts DRAFT
 * for his approval, project doc claude/confirm-reminders-draft.md; English only). Each carries a fresh link, in the
 * same core as the first email. Sent by ./confirmReminders.js.
 */
const REMINDERS = {
  1: {
    subject: 'One tap to confirm your email',
    title: 'Confirm your email',
    body: 'Your marble is saved, but your email address isn\'t confirmed yet. Tap the button so your account is yours for good and you can get a new password if you ever forget it.',
  },
  2: {
    subject: 'Your Marble Spins account is one tap away',
    title: 'Still one step to go',
    body: 'We still need to check that this is your email address. It takes one tap, and it means you can always get back into your account.',
  },
  3: {
    subject: 'Last reminder: confirm your email for Marble Spins',
    title: 'A last reminder',
    body: 'This is the last reminder we\'ll send. Confirm your email with one tap, so you can get a new password if you ever need one. If you\'d rather not, your account keeps working and you won\'t hear from us about this again.',
  },
};

module.exports = { REMINDERS };
