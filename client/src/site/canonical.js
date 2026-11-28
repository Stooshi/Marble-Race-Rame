/**
 * The site's main address: marblespins.com. The same pages also answer at www.marblespins.com and
 * the Vercel address; every page points search engines at its marblespins.com copy.
 */
import { useEffect } from 'react';

export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://marblespins.com').replace(/\/+$/, '');

/** The main address of a page: `/shop?x=1` → https://marblespins.com/shop (queries and hashes dropped). */
export function canonicalUrl(pathname) {
  const path = `/${String(pathname || '/').split(/[?#]/)[0].replace(/^\/+/, '')}`.replace(/(.)\/+$/, '$1');
  return `${SITE_URL}${path === '/' ? '/' : path}`;
}

function setHead(selector, make, attr, value) {
  let el = document.head.querySelector(selector);
  if (!el) { el = make(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}

/** Keeps <link rel="canonical"> and og:url on the page's marblespins.com address. */
export function useCanonical(pathname) {
  useEffect(() => {
    const url = canonicalUrl(pathname);
    setHead('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', url);
    setHead('meta[property="og:url"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:url'); return m; }, 'content', url);
  }, [pathname]);
}
