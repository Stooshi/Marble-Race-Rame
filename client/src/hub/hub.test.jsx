// The marbles hub (/marbles): hidden until src/shared/marblesHub.json switches it on; articles in
// markdown with front matter; Article and breadcrumb structured data; pre-rendering and sitemap only
// when on. The review drafts (content/marbles-drafts/) must always be valid articles.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import hubSwitch from '../shared/marblesHub.json';
import { parseFrontMatter } from './frontMatter';
import { ARTICLES, hubRoutes, readArticle, readArticles, related } from './content';
import { blocks, headings, slugify } from './Markdown';
import { crumbs, hubMeta, resolve, structuredData } from './seo';
import HubPages from './HubPages';
import { hubOpen, preloadHub } from './route';
import PICTURES from './pictures.json';
import SiteFooter from '../site/SiteFooter';

const article = (over = {}) => `---
title: ${over.title ?? 'Ringer rules'}
description: ${over.description ?? 'How Ringer works: 13 marbles in a cross and a 10-foot ring.'}
section: ${over.section ?? 'games'}
slug: ${over.slug ?? 'ringer'}
type: rules
status: ${over.status ?? 'published'}
updated: 2026-10-21
shop: The Schoolyard Classics are in the shop.
sources:
  - title: "National Marbles Tournament: rules"
    url: https://www.nationalmarblestournament.org/
    used_for: ring size
  - title: Marble (toy)
    url: https://www.britannica.com/topic/marble-toy
---
## The ring

Thirteen marbles in a cross [1]. A **bold** word, an *italic* one and a [link](https://example.org).
Still the same paragraph [1, 2]. [REVIEW: check the ring size]

- one
- two

1. first
2. second

> A quote.

## Shooting

### Knuckling down

Text.

## Scoring

See [the tracks](/tracks).
`;

const FIXTURE = readArticles({
  'a.md': article(),
  'b.md': article({ title: 'How to play marbles', slug: 'how-to-play-marbles' }),
  'c.md': article({ title: 'A short history of marbles', slug: 'history-of-marbles', section: 'history' }),
  'd.md': article({ title: 'Draft only', slug: 'draft-only', status: 'draft' }),
});

const NF = () => <p>NOT FOUND</p>;
const at = (path, el) => renderToString(<MemoryRouter initialEntries={[path]}><Routes><Route path="/marbles/*" element={el} /><Route path="*" element={<NF />} /></Routes></MemoryRouter>);

describe('published (Moses, 26 Oct 2026)', () => {
  it('is on in the repository, so /marbles and its articles are pages', () => {
    expect(hubSwitch.enabled).toBe(true);
    expect(hubOpen()).toBe(true);
    expect(preloadHub('/marbles')).not.toBeNull();
  });
  it('the site links to it from the footer, and nowhere else outside the hub', () => {
    const src = join(__dirname, '..');
    const hits = [];
    const walk = (dir) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) { if (p !== __dirname) walk(p); continue; }
        if (!/\.(jsx?|json|md)$/.test(f) || /\.test\./.test(f)) continue;
        const text = readFileSync(p, 'utf8');
        // (links and navigation; the server's /api/marbles calls are something else)
        if (/(\b(to|href)=\{?\s*["'`]|navigate\(\s*["'`]|\]\(|path:\s*["'`])\/marbles\b/.test(text)) hits.push(p.slice(src.length + 1));
      }
    };
    walk(src);
    expect(hits).toEqual(['site/SiteFooter.jsx']);
    expect(renderToString(<MemoryRouter><SiteFooter /></MemoryRouter>)).toMatch(/<a href="\/marbles"[^>]*>Marbles<\/a>/);
  });
  it('the first five articles are published (26 Oct 2026), and no draft is in the site\'s code', () => {
    expect(ARTICLES.map((a) => a.path).sort()).toEqual([
      '/marbles/games/how-to-play-marbles', '/marbles/games/ringer', '/marbles/history/history-of-marbles',
      '/marbles/making/how-glass-marbles-are-made', '/marbles/types/marble-types-guide',
    ]);
    expect(hubRoutes()).toContain('/marbles/games');
  });
});

describe('articles', () => {
  it('front matter: scalars, quotes and a list of sources', () => {
    const { data, body } = parseFrontMatter(article());
    expect(data.title).toBe('Ringer rules');
    expect(data.sources).toHaveLength(2);
    expect(data.sources[0]).toEqual({ title: 'National Marbles Tournament: rules', url: 'https://www.nationalmarblestournament.org/', used_for: 'ring size' });
    expect(body.startsWith('## The ring')).toBe(true);
  });
  it('a broken article is refused with what is wrong', () => {
    expect(() => readArticle(article({ section: 'sweden' }), 'x.md')).toThrow(/unknown section/);
    expect(() => readArticle(article({ slug: 'Ringer Rules' }), 'x.md')).toThrow(/slug/);
    expect(() => readArticle(article({ description: 'x'.repeat(170) }), 'x.md')).toThrow(/description/);
    expect(() => readArticles({ 'a.md': article(), 'b.md': article() })).toThrow(/two articles/);
  });
  it('only published ones are shown; drafts only when asked', () => {
    expect(FIXTURE.map((a) => a.slug)).toEqual(['how-to-play-marbles', 'ringer', 'history-of-marbles']);
    expect(readArticles({ 'd.md': article({ status: 'draft' }) }, { drafts: true })).toHaveLength(1);
  });
  it('addresses: the hub, sections with articles, articles', () => {
    expect(hubRoutes(FIXTURE)).toEqual(['/marbles', '/marbles/games', '/marbles/history',
      '/marbles/games/how-to-play-marbles', '/marbles/games/ringer', '/marbles/history/history-of-marbles']);
    expect(resolve('/marbles/types', FIXTURE)).toBeNull(); // (no article there yet: no page)
    expect(resolve('/marbles/games/nope', FIXTURE)).toBeNull();
    expect(resolve('/marbles/games/ringer/', FIXTURE).kind).toBe('article');
    expect(related(FIXTURE[1], FIXTURE).map((a) => a.slug)).toEqual(['how-to-play-marbles', 'history-of-marbles']);
  });
});

describe('markdown', () => {
  it('blocks and headings', () => {
    const b = blocks(parseFrontMatter(article()).body);
    expect(b.map((x) => x.type)).toEqual(['h', 'p', 'ul', 'ol', 'quote', 'h', 'h', 'p', 'h', 'p']);
    expect(b[1].text).toContain('Still the same paragraph');
    expect(headings(parseFrontMatter(article()).body).map((h) => h.id)).toEqual(['the-ring', 'shooting', 'knuckling-down', 'scoring']);
    expect(slugify("Cat's eyes & clearies")).toBe('cat-s-eyes-and-clearies');
  });
  it('draws citations, review marks and links, and never raw HTML', () => {
    const html = at('/marbles/games/ringer', <HubPages NotFound={NF} articles={readArticles({ a: article().replace('Text.', '<img src=x onerror=alert(1)>') })} />);
    expect(html).toContain('href="#source-1"');
    expect(html).toContain('id="source-2"');
    expect(html).toMatch(/<mark class="hub-review"[^>]*>REVIEW(<!-- -->)?: check the ring size<\/mark>/);
    expect(html).toContain('<a href="https://example.org" target="_blank" rel="noopener noreferrer">link</a>');
    expect(html).toMatch(/<a href="\/tracks"[^>]*>the tracks<\/a>/);
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});

describe('pages and search', () => {
  it('article page: breadcrumbs, contents, sources, shop card, read next, and its structured data', () => {
    const html = at('/marbles/games/ringer', <HubPages NotFound={NF} articles={FIXTURE} />);
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('<h1 class="ms-h1 hub-h1">Ringer rules</h1>');
    expect(html).toContain('On this page');
    expect(html).toContain('Read next');
    expect(html).toContain('href="/shop"');
    const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    expect(ld.map((d) => d['@type'])).toEqual(['Article', 'BreadcrumbList']);
    expect(ld[0]).toMatchObject({ headline: 'Ringer rules', datePublished: '2026-10-21T12:00:00+01:00', mainEntityOfPage: 'https://marblespins.com/marbles/games/ringer' });
    expect(ld[0].citation).toHaveLength(2);
    expect(ld[1].itemListElement.map((i) => i.name)).toEqual(['Marbles', 'Marble games', 'Ringer rules']);
  });
  it('hub and section pages list their articles; unknown addresses are the 404 page', () => {
    expect(at('/marbles', <HubPages NotFound={NF} articles={FIXTURE} />)).toContain('href="/marbles/history/history-of-marbles"');
    const section = at('/marbles/games', <HubPages NotFound={NF} articles={FIXTURE} />);
    expect(section).toContain('Marble games from around the world');
    expect(section).not.toContain('history-of-marbles"');
    expect(at('/marbles/types', <HubPages NotFound={NF} articles={FIXTURE} />)).toContain('NOT FOUND');
    expect(structuredData(resolve('/marbles', FIXTURE), FIXTURE)[0]['@type']).toBe('CollectionPage');
    expect(crumbs(resolve('/marbles/games', FIXTURE)).map((c) => c.path)).toEqual(['/marbles', '/marbles/games']);
  });
  it('titles and descriptions; previews and drafts stay out of search results', () => {
    const m = hubMeta('/marbles/games/ringer', FIXTURE);
    expect(m).toMatchObject({ title: 'Ringer rules · Marble Spins', canonical: 'https://marblespins.com/marbles/games/ringer', noindex: false });
    expect(hubMeta('/marbles/games/ringer', FIXTURE, { preview: true }).noindex).toBe(true);
    const withDraft = readArticles({ d: article({ status: 'draft' }) }, { drafts: true });
    expect(hubMeta('/marbles/games/ringer', withDraft).noindex).toBe(true);
    expect(hubMeta('/marbles/nope', FIXTURE).noindex).toBe(true);
  });
});

describe('the review drafts (content/marbles-drafts/)', () => {
  const dir = join(__dirname, '..', '..', '..', 'content', 'marbles-drafts');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md') : [];
  it.skipIf(!files.length)('are valid articles, marked draft, at their own address, each with sources', () => {
    const texts = Object.fromEntries(files.map((f) => [f, readFileSync(join(dir, f), 'utf8')]));
    const drafts = readArticles(texts, { drafts: true });
    for (const a of drafts) {
      expect(a.status).toBe('draft');
      expect(`${a.slug}.md`).toBe(files.find((f) => texts[f].includes(`slug: ${a.slug}`)));
      expect(a.sources.length).toBeGreaterThan(0);
      // every [n] cited has a source
      for (const m of a.body.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g)) for (const n of m[1].split(',')) expect(Number(n)).toBeLessThanOrEqual(a.sources.length);
    }
  });
});

describe('the published articles and their pictures', () => {
  const pub = join(__dirname, '..', '..', 'public');
  it('no [REVIEW] mark left, every citation has its source', () => {
    for (const a of ARTICLES) {
      expect(a.body, a.slug).not.toMatch(/\[REVIEW/);
      for (const m of a.body.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g)) for (const n of m[1].split(',')) expect(Number(n), a.slug).toBeLessThanOrEqual(a.sources.length);
    }
  });
  it('every picture placed has its alt text, caption and files (800 and 1600 px), and every article a header and a share picture', () => {
    for (const a of ARTICLES) {
      const own = PICTURES[a.slug];
      expect(own, a.slug).toBeTruthy();
      const names = ['header', ...[...a.body.matchAll(/^::picture\s+([a-z0-9-]+)\s*$/gm)].map((m) => m[1])];
      for (const n of names) {
        const p = own.pictures[n];
        expect(p, `${a.slug}/${n}`).toBeTruthy();
        expect(p.alt.length, `${a.slug}/${n}`).toBeGreaterThan(40);
        for (const w of [800, 1600]) expect(existsSync(join(pub, 'hub-img', a.slug, `${n}-${w}.webp`)), `${a.slug}/${n}-${w}`).toBe(true);
      }
      expect(existsSync(join(pub, 'share', 'marbles', `${a.slug}.jpg`)), a.slug).toBe(true);
    }
  });
  it('the article page shows its pictures; its share picture is its own', () => {
    const a = ARTICLES.find((x) => x.slug === 'ringer');
    const html = at(a.path, <HubPages NotFound={NF} />);
    expect(html).toContain('/hub-img/ringer/header-800.webp');
    expect(html).toContain('/hub-img/ringer/court-1600.webp 1600w');
    expect(html).toContain('<figcaption>');
    expect(hubMeta(a.path, ARTICLES).image).toMatch(/\/share\/marbles\/ringer\.jpg$/);
    expect(structuredData(resolve(a.path, ARTICLES), ARTICLES)[0].image[0]).toMatch(/header-1600\.webp$/);
  });
});
