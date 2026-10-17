import { useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';

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
    const result = await api.buyItem(slug);
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
