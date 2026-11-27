import { request } from './client';

/**
 * The images for a track's billboards: [{ slot, image_url }]. Never throws and
 * never waits long: no answer within a few seconds, or any error, is an empty
 * list, and the billboards keep their built-in promotions.
 */
export async function fetchBillboards(slug, { timeoutMs = 4000 } = {}) {
  if (!slug) return [];
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const data = await request(`/billboards?track=${encodeURIComponent(slug)}`, { signal: abort.signal, token: null });
    return Array.isArray(data?.billboards) ? data.billboards : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
