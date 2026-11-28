/**
 * The hub articles' markdown, drawn as React (no HTML from the file is ever inserted). Supported:
 * ## / ### / #### headings (with anchor ids), paragraphs, - and 1. lists, > quotes, --- rules,
 * **bold**, *italic*, `code`, [links](url) (site addresses stay in the app, others open in a new tab),
 * source citations [1] (to the page's source list, #source-1) and [REVIEW: …] notes, drawn as a
 * highlighted mark so an unchecked fact can't be missed in a preview. A line `::picture <name>` places
 * one of the article's pictures (./pictures.json: its alt text and caption) as a figure.
 */
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import PICTURES from './pictures.json';

/** The address of an article's picture at a width (public/hub-img/<article>/<name>-<width>.webp). */
export const pictureSrc = (slug, name, width) => `/hub-img/${slug}/${name}-${width}.webp`;

/** One of an article's pictures as a figure: 800 px for phones, 1600 px for wide screens, its caption under it. */
export function Picture({ slug, name, eager = false }) {
  const p = PICTURES[slug]?.pictures?.[name];
  if (!p) return null;
  return (
    <figure className="hub-figure">
      <img
        src={pictureSrc(slug, name, 800)}
        srcSet={`${pictureSrc(slug, name, 800)} 800w, ${pictureSrc(slug, name, 1600)} 1600w`}
        sizes="(max-width: 1000px) 100vw, 940px"
        width={p.width}
        height={p.height}
        alt={p.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        {...(eager ? { fetchPriority: 'high' } : {})}
      />
      {p.caption && <figcaption>{p.caption}</figcaption>}
    </figure>
  );
}

export const slugify = (s) => String(s).toLowerCase().replace(/[*_`[\]()]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const INLINE = /(\*\*([^*]+)\*\*)|(\*([^*\s][^*]*)\*)|(`([^`]+)`)|(\[REVIEW:?\s*([^\]]*)\])|(\[([^\]]+)\]\(([^)\s]+)\))|(\[(\d+(?:\s*,\s*\d+)*)\])/g;

export function inline(text, key = 'i') {
  const out = [];
  let last = 0;
  let n = 0;
  for (const m of String(text).matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${n++}`;
    if (m[1]) out.push(<strong key={k}>{inline(m[2], k)}</strong>);
    else if (m[3]) out.push(<em key={k}>{inline(m[4], k)}</em>);
    else if (m[5]) out.push(<code key={k}>{m[6]}</code>);
    else if (m[7]) out.push(<mark key={k} className="hub-review" title="To check before publishing">REVIEW{m[8] ? `: ${m[8]}` : ''}</mark>);
    else if (m[9]) {
      const href = m[11];
      out.push(href.startsWith('/')
        ? <Link key={k} to={href}>{inline(m[10], k)}</Link>
        : <a key={k} href={href} target="_blank" rel="noopener noreferrer">{inline(m[10], k)}</a>);
    } else if (m[12]) {
      const nums = m[13].split(',').map((x) => x.trim());
      out.push(<sup key={k} className="hub-cite">[{nums.map((x, i) => <Fragment key={x}>{i ? ', ' : ''}<a href={`#source-${x}`} aria-label={`Source ${x}`}>{x}</a></Fragment>)}]</sup>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** The blocks of a markdown text: [{ type: 'h'|'p'|'ul'|'ol'|'quote'|'hr', level?, text?, items? }]. */
export function blocks(md) {
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const isBlockStart = (l) => /^::picture\s/.test(l) || /^(#{1,4})\s/.test(l) || /^\s*[-*]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l) || /^>\s?/.test(l) || /^-{3,}\s*$/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    const pic = /^::picture\s+([a-z0-9-]+)\s*$/.exec(l);
    if (pic) { out.push({ type: 'picture', name: pic[1] }); i++; continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (h) { out.push({ type: 'h', level: Math.max(2, h[1].length), text: h[2].trim() }); i++; continue; }
    if (/^-{3,}\s*$/.test(l)) { out.push({ type: 'hr' }); i++; continue; }
    const listRe = /^\s*[-*]\s+(.*)$/.test(l) ? /^\s*[-*]\s+(.*)$/ : /^\s*\d+[.)]\s+(.*)$/.test(l) ? /^\s*\d+[.)]\s+(.*)$/ : null;
    if (listRe) {
      const items = [];
      while (i < lines.length && lines[i].trim()) {
        const m = listRe.exec(lines[i]);
        if (m) items.push(m[1]);
        else if (items.length && /^\s+\S/.test(lines[i])) items[items.length - 1] += ` ${lines[i].trim()}`;
        else break;
        i++;
      }
      out.push({ type: listRe.source.includes('d+') ? 'ol' : 'ul', items });
      continue;
    }
    if (/^>\s?/.test(l)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push({ type: 'quote', text: q.join(' ').trim() });
      continue;
    }
    const p = [];
    while (i < lines.length && lines[i].trim() && !(p.length && isBlockStart(lines[i]))) { p.push(lines[i].trim()); i++; }
    out.push({ type: 'p', text: p.join(' ') });
  }
  return out;
}

/** The headings of a text (for a contents list): [{ id, text, level }]. */
export const headings = (md) => blocks(md).filter((b) => b.type === 'h').map((b) => ({ id: slugify(b.text), text: b.text, level: b.level }));

export default function Markdown({ text, slug = null }) {
  return blocks(text).map((b, i) => {
    const k = `b${i}`;
    switch (b.type) {
      case 'h': {
        const H = `h${b.level}`;
        return <H key={k} id={slugify(b.text)}>{inline(b.text, k)}</H>;
      }
      case 'ul': return <ul key={k}>{b.items.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>)}</ul>;
      case 'ol': return <ol key={k}>{b.items.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>)}</ol>;
      case 'quote': return <blockquote key={k}><p>{inline(b.text, k)}</p></blockquote>;
      case 'hr': return <hr key={k} />;
      case 'picture': return slug ? <Picture key={k} slug={slug} name={b.name} /> : null;
      default: return <p key={k}>{inline(b.text, k)}</p>;
    }
  });
}
