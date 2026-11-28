import { useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { windowOf } from '../../shared/marbles';

/**
 * The live collection: every item's First Edition count and whether it's on
 * sale, plus which items the player owns. `buy(slug)` buys one copy and
 * refreshes the coin count.
 */
export function useCollection() {
  const { isAuthenticated, refreshUser } = useAuth();
  const state = useAsync(() => api.collection(), [isAuthenticated]);
  const live = useMemo(() => Object.fromEntries((state.data?.items ?? []).map((i) => [i.slug, i])), [state.data]);
  const owned = useMemo(() => new Set(state.data?.owned ?? []), [state.data]);
  const { reload } = state;
  const buy = useCallback(async (slug) => {
    let result;
    try {
      result = await api.buyItem(slug);
    } catch (err) {
      await Promise.resolve(refreshUser()).catch(() => {}); // (the real coin count, so Get coins shows the right amount)
      throw err;
    }
    await Promise.all([reload(), refreshUser()]);
    return result;
  }, [reload, refreshUser]);
  return { ...state, live, owned, buy };
}

/** "[431] of 500 numbered left", or how the run ended. */
export function editionLine(liveItem, editionSize) {
  if (!liveItem) return `First Edition: numbered 1 to ${editionSize.toLocaleString('en-US')}`;
  if (liveItem.numberedLeft <= 0) return 'First Edition sold out · still for sale, unnumbered';
  return `First Edition: ${liveItem.numberedLeft.toLocaleString('en-US')} of ${editionSize.toLocaleString('en-US')} numbered left`;
}

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'Europe/Stockholm' });

/**
 * A limited edition's sale: { state: 'coming' | 'on-sale' | 'sold-out', opens: "1 December", closes:
 * "31 December", size } from its window in the catalogue (Swedish time) and the live count; null for a
 * regular marble. (The server decides what can be bought; this only says what the screen shows.)
 */
export function limitedSale(design, liveItem, now = new Date()) {
  const ltd = design?.limited;
  if (!ltd) return null;
  const start = ltd.saleStartsAt ? new Date(ltd.saleStartsAt) : null;
  const end = ltd.saleEndsAt ? new Date(ltd.saleEndsAt) : null;
  let state = 'on-sale';
  if (start && now < start) state = 'coming';
  else if ((end && now >= end) || liveItem?.sale === 'sold-out' || (liveItem && liveItem.numberedLeft <= 0)) state = 'sold-out';
  return {
    state,
    opens: start ? DAY.format(start) : null,
    // (The window ends at midnight; its last day is the day before.)
    closes: end ? DAY.format(new Date(end.getTime() - 1)) : null,
    size: ltd.editionSize,
    left: liveItem?.numberedLeft ?? ltd.editionSize,
  };
}

/** The line a limited edition shows: "Coming 1 December — limited to 500", "123 of 500 left · until 31 December", "Sold out". */
export function limitedLine(sale) {
  if (sale.state === 'coming') return `Coming ${sale.opens} — limited to ${sale.size.toLocaleString('en-US')}`;
  if (sale.state === 'sold-out') return 'Sold out';
  return `${sale.left.toLocaleString('en-US')} of ${sale.size.toLocaleString('en-US')} left${sale.closes ? ` · on sale until ${sale.closes}` : ''}`;
}

const DAY_YEAR = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Stockholm' });
// (A window ending at midnight or at 23:59:59 has its last day on the day before midnight.)
const lastDay = (iso) => new Date(new Date(iso).getTime() - 1000);
const DAY_MS = 86400000;

/**
 * A seasonal collection's marble in the shop: { state: 'coming' | 'on-sale' | 'retired', opens: "1
 * December", closes: "7 January", daysLeft, retired: "7 Jan 2027" } from its window in the catalogue
 * (Swedish time); null for any other marble.
 */
export function seasonalSale(item, now = new Date()) {
  if (item?.kind !== 'seasonal') return null;
  const end = lastDay(item.saleEndsAt);
  const state = windowOf(item, now);
  // Days left, counting today: "Leaving today" on the last day.
  const daysLeft = state === 'on-sale' ? Math.max(0, Math.ceil((new Date(item.saleEndsAt).getTime() - now.getTime()) / DAY_MS) - 1) : null;
  return { state, opens: DAY.format(new Date(item.saleStartsAt)), closes: DAY.format(end), daysLeft, retired: DAY_YEAR.format(end) };
}

/** The line a seasonal marble shows: "Coming 1 December · until 7 January", "Leaving in 12 days", "Leaving today", "Retired 7 Jan 2027". */
export function seasonalLine(sale) {
  if (sale.state === 'coming') return `Coming ${sale.opens} · on sale until ${sale.closes}`;
  if (sale.state === 'retired') return `Retired ${sale.retired}`;
  if (sale.daysLeft === 0) return 'Leaving today';
  return `Leaving in ${sale.daysLeft} day${sale.daysLeft === 1 ? '' : 's'} · until ${sale.closes}`;
}

/** "Retired 7 Jan 2027" for a seasonal marble after its retirement, else null (the Marble Bag and certificates). */
export function retiredLine(item, now = new Date()) {
  return item?.kind === 'seasonal' && windowOf(item, now) === 'retired' ? `Retired ${DAY_YEAR.format(lastDay(item.saleEndsAt))}` : null;
}
