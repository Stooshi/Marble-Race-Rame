/**
 * The hub's titles, descriptions and structured data (Article, BreadcrumbList, CollectionPage:
 * claude/marbles-hub-plan.md §5). Used by the pages (in the browser) and by the build's
 * pre-rendering, so search engines get the same as readers. No HowTo or FAQ markup: Google
 * shows no rich results for them on a site like this one (since 2023).
 */
import { metaFor, SITE_NAME } from '../site/pageMeta';
import { SITE_URL } from '../site/canonical';
import { HUB, HUB_PATH, sectionOf } from './sections';

const PUBLISHER = { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` } };
const at = (path) => `${SITE_URL}${path}`;
// A date as ISO 8601 with a time zone (Google's recommendation): noon Swedish time.
const isoDate = (d) => `${d}T12:00:00+01:00`;

/** What a hub address is: { kind: 'hub' } | { kind: 'section', section } | { kind: 'article', article } | null. */
export function resolve(pathname, articles) {
  const path = String(pathname || '').split(/[?#]/)[0].replace(/\/+$/, '');
  if (path === HUB_PATH) return { kind: 'hub' };
  const m = /^\/marbles\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/.exec(path);
  if (!m) return null;
  const section = sectionOf(m[1]);
  if (!section) return null;
  const inSection = articles.filter((a) => a.section === section.key);
  if (!m[2]) return inSection.length ? { kind: 'section', section, articles: inSection } : null;
  const article = inSection.find((a) => a.slug === m[2]);
  return article ? { kind: 'article', section, article } : null;
}

/** The breadcrumb trail: [{ name, path }], the hub first. */
export function crumbs(where) {
  const trail = [{ name: HUB.short, path: HUB_PATH }];
  if (where?.section) trail.push({ name: where.section.title, path: `${HUB_PATH}/${where.section.key}` });
  if (where?.article) trail.push({ name: where.article.title, path: where.article.path });
  return trail;
}

/** { title, description, canonical, image, noindex } for a hub address (as ../site/pageMeta.js gives for other pages). */
export function hubMeta(pathname, articles, { preview = false } = {}) {
  const where = resolve(pathname, articles);
  const base = metaFor(pathname);
  const m = where?.kind === 'article' ? { title: where.article.title, description: where.article.description }
    : where?.kind === 'section' ? { title: where.section.heading, description: where.section.description }
      : where?.kind === 'hub' ? { title: HUB.title, description: HUB.description } : { title: 'Page not found', description: base.description };
  return { ...base, title: `${m.title} · ${SITE_NAME}`, description: m.description, noindex: preview || !where || where.article?.status === 'draft' };
}

export function breadcrumbLd(where) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs(where).map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: at(c.path) })),
  };
}

export function articleLd(article, image = `${SITE_URL}/share/marble-spins-1200x630.png`) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: [image],
    datePublished: isoDate(article.published),
    dateModified: isoDate(article.updated),
    author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
    publisher: PUBLISHER,
    mainEntityOfPage: at(article.path),
    inLanguage: 'en',
    ...(article.sources.length ? { citation: article.sources.map((s) => s.url) } : {}),
  };
}

export function collectionLd(name, description, path, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: at(path),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
    mainEntity: { '@type': 'ItemList', itemListElement: items.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: at(a.path), name: a.title })) },
  };
}

/** All the structured data for a resolved address. */
export function structuredData(where, articles) {
  if (!where) return [];
  if (where.kind === 'article') return [articleLd(where.article), breadcrumbLd(where)];
  if (where.kind === 'section') return [collectionLd(where.section.heading, where.section.description, `${HUB_PATH}/${where.section.key}`, where.articles), breadcrumbLd(where)];
  return [collectionLd(HUB.title, HUB.description, HUB_PATH, articles), breadcrumbLd(where)];
}
