import { useState } from 'react';

const KEY = 'marble-tv-moments';

/**
 * Whether TV moments are on (the big view cutting to a track's trackside cameras as the followed
 * marble comes by), remembered on this device: on unless the player switched them off.
 */
export function useTvMoments() {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== '0';
    } catch {
      return true;
    }
  });
  const toggle = () => setOn((was) => {
    try {
      localStorage.setItem(KEY, was ? '0' : '1');
    } catch {
      // (private browsing: for this visit only)
    }
    return !was;
  });
  return { on, toggle };
}
