/**
 * How a player's name is shown to other players (Moses, 25 Oct 2026: "show the player's name, not the
 * marble name"): the name they chose (display_name; a guest can choose one too), else a saved
 * account's username, else, for a guest who hasn't chosen one, guest_<number> (five digits, the same
 * for the account every time). No "@", no friendly made-up names. The server shows names by the same
 * rule (src/names/shown.js; a test keeps the two the same). Until 25 Oct a guest showed as
 * "Guest 0DA1" and a saved account as "@name".
 */
const GUEST = /^guest_([0-9a-f]{4,})$/i;

export const isGuestName = (username) => GUEST.test(String(username ?? ''));

/** guest_12345 for a guest account's username (guest_<hex>); null if it isn't one. */
export function guestNumberName(username) {
  const m = GUEST.exec(String(username ?? ''));
  if (!m) return null;
  return `guest_${String(parseInt(m[1].slice(0, 8), 16) % 100000).padStart(5, '0')}`;
}

/** The name shown: the chosen name, else the username, else (a guest) guest_<number>. */
export function plainName(username, displayName = null) {
  if (displayName) return displayName;
  return guestNumberName(username) ?? String(username ?? '');
}

/** The same for a user object ({ username, display_name } or a race entry's { username, name }). */
export function shownName(u) {
  if (!u) return '';
  if (u.name) return u.name;
  return plainName(u.username, u.display_name);
}

/** Kept for the places that used it: the name shown, now without "@". */
export function handle(username, displayName = null) {
  return plainName(username, displayName);
}

/** A race entry's player name ({ user: { name, username } }), or null for a computer player. */
export function entryPlayer(e) {
  return e?.user ? (e.user.name || plainName(e.user.username)) : null;
}

/** What a list shows for a race entry: the player's name; a computer player's marble name. */
export function entryLabel(e) {
  return entryPlayer(e) ?? e?.marble?.name ?? 'Marble';
}

/** Whether a user still has a guest account (not saved). */
export const isGuest = (u) => Boolean(u && (u.is_guest ?? isGuestName(u.username)));
