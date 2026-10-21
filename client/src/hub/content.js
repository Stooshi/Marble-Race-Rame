/**
 * The hub's articles: one markdown file each in ./articles/ (front matter + body, see
 * ./frontMatter.js), bundled into the hub's own code chunk, never the game's.
 *
 * Front matter fields: title, description (≤ 155 characters, for search results), section (a key in
 * ./sections.js), slug, type (guide | rules | history | explainer), status (draft | published),
 * published and updated (YYYY-MM-DD), shop (optional line for the shop card), sources (a list of
 * { title, url, used_for }; cited in the text as [1], [2]…).
 *
 * Only `status: published` articles are shown. Drafts for review live outside the website's code,
 * in content/marbles-drafts/ at the repository root (not imported by any build).
 */
import { parseFrontMatter } from './frontMatter';
import { HUB_PATH, SECTIONS } from './sections';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** One article from its file's text → the article, or throws with what's wrong. */
export function readArticle(text, file = 'article') {
  const { data, body } = parseFrontMatter(text);
  const problems = [];
  for (const k of ['title', 'description', 'section', 'slug', 'status', 'updated']) if (!data[k]) problems.push(`no ${k}`);
  if (data.section && !SECTIONS.some((s) => s.key === data.section)) problems.push(`unknown section "${data.section}"`);
  if (data.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) problems.push(`slug "${data.slug}" isn't lowercase-hyphenated`);
  if (data.status && !['draft', 'published'].includes(data.status)) problems.push(`status "${data.status}"`);
  for (const k of ['updated', 'published']) if (data[k] && !DATE.test(data[k])) problems.push(`${k} isn't YYYY-MM-DD`);
  if (data.description && data.description.length > 160) problems.push('description over 160 characters');
  const sources = Array.isArray(data.sources) ? data.sources.filter((s) => s && typeof s === 'object') : [];
  sources.forEach((s, i) => { if (!s.title || !/^https?:\/\//.test(s.url ?? '')) problems.push(`source ${i + 1} needs a title and an http(s) url`); });
  if (problems.length) throw new Error(`${file}: ${problems.join('; ')}`);
  return {
    title: data.title,
    description: data.description,
    section: data.section,
    slug: data.slug,
    type: data.type || 'guide',
    status: data.status,
    published: data.published || data.updated,
    updated: data.updated,
    shop: data.shop || '',
    sources,
    body,
    path: `${HUB_PATH}/${data.section}/${data.slug}`,
  };
}

/** Articles from { file: text }: published only (or every one with `drafts`), sorted by section, then title. */
export function readArticles(files, { drafts = false } = {}) {
  const order = (a) => SECTIONS.findIndex((s) => s.key === a.section);
  const all = Object.entries(files).map(([file, text]) => readArticle(text, file));
  const seen = new Set();
  for (const a of all) {
    if (seen.has(a.path)) throw new Error(`two articles at ${a.path}`);
    seen.add(a.path);
  }
  return all
    .filter((a) => drafts || a.status === 'published')
    .sort((a, b) => order(a) - order(b) || a.title.localeCompare(b.title));
}

const FILES = import.meta.glob('./articles/*.md', { eager: true, query: '?raw', import: 'default' });

/** The published articles. */
export const ARTICLES = readArticles(FILES);

/** Sections with at least one article, each with its articles. */
export function sectionsWith(articles) {
  return SECTIONS.map((s) => ({ ...s, path: `${HUB_PATH}/${s.key}`, articles: articles.filter((a) => a.section === s.key) }))
    .filter((s) => s.articles.length > 0);
}

/** Every hub address (for the pre-rendering and the sitemap): the hub, its sections, its articles. */
export function hubRoutes(articles = ARTICLES) {
  return [HUB_PATH, ...sectionsWith(articles).map((s) => s.path), ...articles.map((a) => a.path)];
}

/** Up to `n` other articles from the same section (then from others). */
export function related(article, articles, n = 3) {
  const others = articles.filter((a) => a.path !== article.path);
  return [...others.filter((a) => a.section === article.section), ...others.filter((a) => a.section !== article.section)].slice(0, n);
}
