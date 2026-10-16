import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader on mount and whenever `deps` change.
 * Returns { data, error, loading, reload, setData }.
 * `seed`: a key into the data the build's pre-rendering supplies (scripts/prerender.mjs), so a
 * pre-rendered page has its content without a server; in the browser there is none.
 */
export function useAsync(loader, deps = [], seed = null) {
  const seeded = seed ? globalThis.__MS_PRERENDER__?.[seed] : undefined;
  const [state, setState] = useState(() => (seeded !== undefined ? { data: seeded, error: null, loading: false } : { data: null, error: null, loading: true }));
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === seq.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (id === seq.current) setState((s) => ({ ...s, error, loading: false }));
      return null;
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
