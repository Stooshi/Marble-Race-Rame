import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { SITE_URL } from '../canonical';
import { buildFaq, faqStructuredData } from './faq';
import { buildIndex, highlight, search, snippet } from './search';
import ContactForm from './ContactForm';

/** **bold** and [placeholder] inside a line of answer text. */
function Inline({ text }) {
  return String(text).split(/(\*\*[^*]+\*\*)/).map((part, k) => {
    const bold = part.startsWith('**') && part.endsWith('**');
    const inner = (bold ? part.slice(2, -2) : part).split(/(\[[^\]]+\])/).map((bit, j) => (
      /^\[[^\]]+\]$/.test(bit)
        ? <span key={j} className="ms-help-ph" title="Still to be decided">{bit}</span>
        : <Fragment key={j}>{bit}</Fragment>
    ));
    return bold ? <strong key={k}>{inner}</strong> : <Fragment key={k}>{inner}</Fragment>;
  });
}

function Answer({ blocks }) {
  return blocks.map((b, k) => {
    if (typeof b === 'string') return <p key={k}><Inline text={b} /></p>;
    if (b[0] === 'table') {
      return (
        <div key={k} className="ms-help-table">
          <table>
            <thead><tr>{b[1].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>{b.slice(2).map((row) => <tr key={row[0]}>{row.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}</tr>)}</tbody>
          </table>
        </div>
      );
    }
    const List = b[0] === 'ol' ? 'ol' : 'ul';
    return <List key={k}>{b.slice(1).map((item) => <li key={item}><Inline text={item} /></li>)}</List>;
  });
}

const Marked = ({ text, stems }) => highlight(text, stems).map((p, k) => (p.hit ? <mark key={k}>{p.text}</mark> : <Fragment key={k}>{p.text}</Fragment>));

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function Question({ q, open, onToggle }) {
  const [copied, setCopied] = useState(null);
  const url = `${SITE_URL}/help#${q.slug}`;
  const copy = async () => {
    setCopied((await copyText(url)) ? 'Link copied' : url);
    setTimeout(() => setCopied(null), 4000);
  };
  return (
    <div id={q.slug} className="ms-help-q" data-open={open || undefined}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={`${q.slug}-a`} onClick={() => onToggle(q.slug)}>
          <span><Inline text={q.q} /></span>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </h3>
      <div id={`${q.slug}-a`} className="ms-help-a" role="region" aria-label={q.q} hidden={!open}>
        <Answer blocks={q.blocks} />
        <div className="ms-help-a__foot">
          <button type="button" className="ms-linkbtn" onClick={copy}>Copy link to this answer</button>
          {copied && <span className="ms-note" aria-live="polite" style={{ overflowWrap: 'anywhere' }}>{copied}</span>}
        </div>
      </div>
    </div>
  );
}

/** The search box: suggestions after 2 letters, arrow keys, Enter, Escape; "No results" offers the contact form. */
function HelpSearch({ index, onPick }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const results = useMemo(() => search(index, query), [index, query]);
  const ready = query.replace(/\s/g, '').length >= 2;
  const showing = open && ready;
  const listId = `${id}-list`;

  const pick = (r) => {
    setOpen(false);
    setActive(-1);
    onPick(r.question.slug);
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % results.length); }
    else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setOpen(true); setActive((a) => (a <= 0 ? results.length - 1 : a - 1)); }
    else if (e.key === 'Enter' && showing && results.length) { e.preventDefault(); pick(results[Math.max(0, active)]); }
    else if (e.key === 'Escape') { if (showing) setOpen(false); else setQuery(''); setActive(-1); }
  };

  return (
    <div className="ms-help-search" role="search">
      <label htmlFor={`${id}-q`} className="ms-visually-hidden">Search the help</label>
      <div className="ms-help-search__box">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        <input
          id={`${id}-q`}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showing && results.length > 0}
          aria-controls={listId}
          aria-activedescendant={showing && active >= 0 ? `${id}-o${active}` : undefined}
          autoComplete="off"
          spellCheck="false"
          enterKeyHint="search"
          placeholder="Search the help: coins, refund, password…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />
        {query && <button type="button" className="ms-help-search__clear" aria-label="Clear the search" onClick={() => { setQuery(''); setActive(-1); }}>×</button>}
      </div>
      <span className="ms-visually-hidden" aria-live="polite">{ready ? (results.length ? `${results.length} matching question${results.length === 1 ? '' : 's'}` : 'No results') : ''}</span>
      {showing && (
        results.length ? (
          <ul id={listId} role="listbox" aria-label="Matching questions" className="ms-help-suggest" onMouseDown={(e) => e.preventDefault()}>
            {results.map((r, k) => (
              <li
                key={r.question.slug}
                id={`${id}-o${k}`}
                role="option"
                aria-selected={k === active}
                onClick={() => pick(r)}
                onMouseMove={() => active !== k && setActive(k)}
              >
                <b><Marked text={r.question.q} stems={r.stems} /></b>
                <span className="ms-help-suggest__in">{r.question.section}</span>
                <span className="ms-help-suggest__snip"><Marked text={snippet(r.question.text, r.stems)} stems={r.stems} /></span>
              </li>
            ))}
          </ul>
        ) : (
          <div id={listId} className="ms-help-suggest ms-help-suggest--none" onMouseDown={(e) => e.preventDefault()}>
            <b>No results for “{query.trim()}”.</b>
            <span>Try other words, or <a href="#contact" onClick={() => setOpen(false)}>ask us with the contact form</a>.</span>
          </div>
        )
      )}
    </div>
  );
}

/** Puts the FAQ's structured data (schema.org FAQPage) in the page head for search engines. */
function useStructuredData(sections) {
  useEffect(() => {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'ms-help-faq';
    el.textContent = JSON.stringify(faqStructuredData(sections, `${SITE_URL}/help`));
    document.head.appendChild(el);
    const title = document.title;
    const meta = document.head.querySelector('meta[name="description"]');
    const description = meta?.getAttribute('content');
    document.title = 'Help Centre · Marble Spins';
    meta?.setAttribute('content', 'Answers about races, coins, marbles, buying coins, refunds, friend rooms and your account, and a way to contact Marble Spins support.');
    return () => {
      el.remove();
      document.title = title;
      if (meta && description != null) meta.setAttribute('content', description);
    };
  }, [sections]);
}

/** /help: the Help Centre. Every question has its own link (/help#question-slug) for support to send. */
export default function HelpPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const { data } = useAsync(() => api.tracks().catch(() => null), []);
  const sections = useMemo(() => buildFaq({ tracks: data?.tracks }), [data]);
  const index = useMemo(() => buildIndex(sections), [sections]);
  const [openSet, setOpenSet] = useState(() => new Set());
  const scrolled = useRef(null); // (the hash last scrolled to; null before the first)
  useStructuredData(sections);

  const toggle = useCallback((slug) => {
    setOpenSet((s) => { const next = new Set(s); if (next.has(slug)) next.delete(slug); else next.add(slug); return next; });
  }, []);

  // A link to a question (/help#slug) opens it and brings it into view.
  useEffect(() => {
    const target = decodeURIComponent(hash.replace(/^#/, ''));
    if (!target) return;
    const isQuestion = sections.some((s) => s.questions.some((q) => q.slug === target));
    if (isQuestion) setOpenSet((s) => (s.has(target) ? s : new Set(s).add(target)));
    if (scrolled.current === hash) return;
    const first = scrolled.current === null;
    scrolled.current = hash;
    requestAnimationFrame(() => {
      const el = document.getElementById(target);
      if (!el) return;
      const calm = first || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
      if (isQuestion) el.querySelector('button')?.focus({ preventScroll: true });
    });
  }, [hash, sections]);

  const goTo = (slug) => {
    scrolled.current = '';
    navigate(`/help#${slug}`, { replace: hash !== '' });
  };

  return (
    <div className="ms-page ms-page--narrow ms-help">
      <header className="ms-help__top">
        <span className="ms-eyebrow">Help Centre</span>
        <h1 className="ms-h1" style={{ margin: 0 }}>How can we help?</h1>
        <HelpSearch index={index} onPick={goTo} />
        <nav aria-label="Help topics" className="ms-help__topics">
          {sections.map((s) => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}
        </nav>
      </header>

      {sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="ms-card ms-help__sec">
          <h2 id={`${s.id}-h`}><span aria-hidden="true">{String(s.number).padStart(2, '0')}</span>{s.title}</h2>
          <div className="ms-help__qs">
            {s.questions.map((q) => <Question key={q.slug} q={q} open={openSet.has(q.slug)} onToggle={toggle} />)}
          </div>
        </section>
      ))}

      <section id="contact" aria-labelledby="contact-h" className="ms-card ms-help__contact">
        <h2 id="contact-h" className="ms-h2" style={{ margin: 0 }}>Still need help?</h2>
        <p style={{ margin: 0, color: 'var(--ms-soft)' }}>
          Send us a message. Tell us your player name and, for payment questions, your order number (on your <Link to="/purchases">Purchases</Link> page).
        </p>
        <ContactForm />
      </section>
    </div>
  );
}
