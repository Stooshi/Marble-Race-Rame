/**
 * How a player's name is shown to other players. A guest's account name (`guest_0da1cddb1b`) looked
 * like a test account (pre-launch check item 9): a guest shows as "Guest 0DA1" instead, the same as
 * in friend rooms (src/routes/rooms.js nameOf). A saved account shows as "@name".
 */
const GUEST = /^guest_([0-9a-f]{4,})$/i;

export const isGuestName = (username) => GUEST.test(String(username ?? ''));

/** "Guest 0DA1" for a guest, otherwise the name as it is (no "@"). */
export function plainName(username, displayName = null) {
  if (displayName) return displayName;
  const m = GUEST.exec(String(username ?? ''));
  return m ? `Guest ${m[1].slice(0, 4).toUpperCase()}` : String(username ?? '');
}

/** "@name" for a saved account, "Guest 0DA1" for a guest. */
export function handle(username) {
  return isGuestName(username) ? plainName(username) : `@${username}`;
}
