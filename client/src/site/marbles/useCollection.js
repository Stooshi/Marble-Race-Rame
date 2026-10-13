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
