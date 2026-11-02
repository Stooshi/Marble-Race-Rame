import { api } from './client';

/**
 * A new player's first steps for the back office Dashboard's funnel (Moses, 2 Nov 2026): the server
 * keeps each once per player, the first time. "Tapped Play" is recorded when the guest is made;
 * joining and finishing come from the races. This sends "saw GO", at most once per page visit.
 */
let sent = false;
export function sawGo() {
  if (sent) return;
  sent = true;
  api.firstStep('go').catch(() => {}); // (an older server has no such address: nothing lost but the step)
}
