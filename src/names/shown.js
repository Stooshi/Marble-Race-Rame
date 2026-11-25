'use strict';

/**
 * The name other players see for a player (Moses, 25 Oct 2026: "show the player's name, not the
 * marble name"): the name they chose (display_name; a guest can choose one too), else a saved
 * account's username, else, for a guest who hasn't chosen one, guest_<number> (five digits, the same
 * for the account every time; no friendly made-up names). The website shows names by the same rule:
 * client/src/shared/playerName.js shownName (a test keeps the two the same).
 */
const GUEST = /^guest_([0-9a-f]{4,})$/i;

/** guest_12345 for a guest account's username (guest_<hex>); null if it isn't one. */
function guestNumberName(username) {
  const m = GUEST.exec(String(username ?? ''));
  if (!m) return null;
  return `guest_${String(parseInt(m[1].slice(0, 8), 16) % 100000).padStart(5, '0')}`;
}

/**
 * What a saved account shows while its reported name is hidden (25 Oct 2026): Player_<number>, five
 * digits from the account id, the same every time. (A guest shows guest_<number>.)
 */
function hiddenPlaceholder(id) {
  const hex = String(id ?? '').replace(/[^0-9a-f]/gi, '').slice(0, 8) || '0';
  return `Player_${String(parseInt(hex, 16) % 100000).padStart(5, '0')}`;
}

/** Whether a name is one of the stand-ins (guest_12345, Player_12345): nothing to hide. */
const isStandIn = (name) => /^(guest|player)_\d{5}$/i.test(String(name ?? ''));

/** { username, display_name, is_guest } → the name shown. */
function shownName(u) {
  if (!u) return null;
  if (u.display_name) return u.display_name;
  return guestNumberName(u.username) ?? String(u.username ?? '');
}

module.exports = { shownName, guestNumberName, hiddenPlaceholder, isStandIn };
