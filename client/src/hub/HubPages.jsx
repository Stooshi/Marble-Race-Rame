/**
 * The marbles hub's pages (/marbles, /marbles/<section>, /marbles/<section>/<article>): its own code
 * chunk, loaded only on these addresses (./route.jsx), so the game's code doesn't grow.
 *
 * `articles` (optional): the articles to show instead of the published ones (a drafts preview).
 */
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { applyMeta } from '../site/pageMeta';
import Markdown, { headings, Picture } from './Markdown';
import { ARTICLES, related, sectionsWith } from './content';
import { HUB } from './sections';
import { crumbs, hubMeta, resolve, structuredData } from './seo';
import './hub.css';

const longDate = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function JsonLd({ data }) {
  // (JSON with "<" escaped, so a title can't close the script tag.)
  return data.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, '\\u003c') }} />);
}

function Breadcrumbs({ where }) {
  const trail = crumbs(where);
  return (
    <nav aria-label="Breadcrumb" className="hub-crumbs">
      <ol>
        {trail.map((c, i) => (
          <li key={c.path}>{i === trail.length - 1 ? <span aria-current="page">{c.name}</span> : <Link to={c.path}>{c.name}</Link>}</li>
        ))}
      </ol>
    </nav>
  );
}

function ArticleCard({ a }) {
  return (
    <li className="hub-card">
      <Link to={a.path} className="hub-card__link">
        <span className="hub-card__title">{a.title}</span>
        <span className="hub-card__desc">{a.description}</span>
      </Link>
    </li>
  );
}

function PlayCard() {
  return (
    <aside className="hub-play" aria-label="Marble Spins">
      <div>
        <p className="hub-play__title">Race marbles online</p>
        <p className="hub-play__text">Marble Spins is a free marble racing game: 20 marbles, real physics, and your friends with a code.</p>
      </div>
      <Link to="/" className="ms-btn ms-btn--primary">Play free</Link>
    </aside>
  );
}

function HubHome({ articles }) {
  const sections = sectionsWith(articles);
  return (
    <>
      <header className="hub-head">
        <span className="ms-eyebrow">Marble Spins guides</span>
        <h1 className="ms-h1 hub-h1">{HUB.title}</h1>
        <p className="ms-lede">{HUB.intro}</p>
      </header>
      {sections.map((s) => (
        <section key={s.key} className="hub-section" aria-labelledby={`hub-s-${s.key}`}>
          <div className="hub-section__head">
            <h2 id={`hub-s-${s.key}`}><Link to={s.path}>{s.title}</Link></h2>
            <p>{s.intro}</p>
          </div>
          <ul className="hub-cards">{s.articles.map((a) => <ArticleCard key={a.path} a={a} />)}</ul>
        </section>
      ))}
      <PlayCard />
    </>
  );
}

function SectionPage({ where }) {
  return (
    <>
      <Breadcrumbs where={where} />
      <header className="hub-head">
        <h1 className="ms-h1 hub-h1">{where.section.heading}</h1>
        <p className="ms-lede">{where.section.intro}</p>
      </header>
      <ul className="hub-cards">{where.articles.map((a) => <ArticleCard key={a.path} a={a} />)}</ul>
      <PlayCard />
    </>
  );
}

function ArticlePage({ where, articles }) {
  const { article: a } = where;
  const toc = headings(a.body).filter((h) => h.level === 2);
  const more = related(a, articles);
  return (
    <>
      <Breadcrumbs where={where} />
      <article className="hub-article">
        <header className="hub-head">
          {a.status === 'draft' && <p className="hub-draft" role="note">Draft for review: not published, not in search results.</p>}
          <h1 className="ms-h1 hub-h1">{a.title}</h1>
          <p className="ms-lede">{a.description}</p>
          <p className="hub-meta">Updated <time dateTime={a.updated}>{longDate(a.updated)}</time>{a.sources.length ? ` · ${a.sources.length} sources` : ''}</p>
        </header>
        {toc.length >= 3 && (
          <nav aria-label="On this page" className="hub-toc">
            <p className="hub-toc__title">On this page</p>
            <ol>{toc.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol>
          </nav>
        )}
        <Picture slug={a.slug} name="header" eager />
        <div className="hub-prose"><Markdown text={a.body} slug={a.slug} /></div>
        {a.sources.length > 0 && (
          <section className="hub-sources" aria-labelledby="hub-sources-h">
            <h2 id="hub-sources-h">Sources</h2>
            <ol>
              {a.sources.map((s, i) => (
                <li key={s.url + i} id={`source-${i + 1}`}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
                  {s.used_for ? <span className="hub-sources__for"> — {s.used_for}</span> : null}
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
      {a.shop && (
        <aside className="hub-shop" aria-label="In the Marble Spins shop">
          <p>{a.shop}</p>
          <Link to="/shop" className="ms-btn ms-btn--sm">See the marbles</Link>
        </aside>
      )}
      {more.length > 0 && (
        <section className="hub-related" aria-labelledby="hub-rel-h">
          <h2 id="hub-rel-h">Read next</h2>
          <ul className="hub-cards">{more.map((r) => <ArticleCard key={r.path} a={r} />)}</ul>
        </section>
      )}
      <PlayCard />
    </>
  );
}

export default function HubPages({ NotFound, articles = ARTICLES, preview = false }) {
  const { pathname } = useLocation();
  const where = resolve(pathname, articles);
  // (After App's own meta for the address: passive effects run after layout ones.)
  useEffect(() => { if (where) applyMeta(hubMeta(pathname, articles, { preview })); }, [pathname, articles, preview, where]);
  if (!where) return <NotFound />;
  return (
    <div className="ms-page hub">
      <JsonLd data={structuredData(where, articles)} />
      {where.kind === 'hub' && <HubHome articles={articles} />}
      {where.kind === 'section' && <SectionPage where={where} />}
      {where.kind === 'article' && <ArticlePage where={where} articles={articles} />}
    </div>
  );
}
