/**
 * The build's pre-rendering (scripts/prerender.mjs): the site's public pages rendered to HTML in
 * Node, so search engines and link previews read them without running the game. Players get the
 * same page: the browser draws over it as soon as the game's code has loaded.
 */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';

export { metaFor } from '../site/pageMeta';
export { buildFaq, faqStructuredData } from '../site/help/faq';
export { organizationStructuredData } from '../site/company';
export { default as socialLinks } from '../shared/socialLinks.json';
export { SITE_URL } from '../site/canonical';

/** HTML for one address. `data`: what the pages would fetch ({ tracks }), as the server gives it. */
export function render(url, data = {}) {
  globalThis.__MS_PRERENDER__ = data;
  try {
    return renderToString(
      <StaticRouter location={url}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StaticRouter>,
    );
  } finally {
    globalThis.__MS_PRERENDER__ = undefined;
  }
}
