// A Help question's own pre-rendered page (/help/<question>; Moses, 28 Oct 2026): only that question
// and its answer, links back to the Help Centre and to its topic's other questions (each page used
// to hold the whole Help Centre). The same addresses; the FAQ structured data stays on /help.
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { QuestionPage } from '../src/site/help/HelpPage';
import { buildFaq } from '../src/site/help/faq';

const sections = buildFaq({});
const all = sections.flatMap((s) => s.questions);

describe('a Help question\'s own page', () => {
  it('holds only its own answer, its topic\'s other questions as links, and the way back', () => {
    const section = sections.find((s) => s.questions.length > 2);
    const q = section.questions[1];
    const html = renderToString(<MemoryRouter><QuestionPage sections={sections} slug={q.slug} /></MemoryRouter>);
    expect(html).toContain('href="/help"');
    expect(html).toContain(`href="/help#${section.id}"`);
    expect(html).toContain('href="/help#contact"');
    for (const other of section.questions.filter((x) => x.slug !== q.slug)) expect(html).toContain(`href="/help/${other.slug}"`);
    // (No other topic's questions, and far smaller than the whole Help Centre.)
    const elsewhere = all.filter((x) => !section.questions.includes(x));
    for (const x of elsewhere) expect(html).not.toContain(`/help/${x.slug}"`);
    expect(html.length).toBeLessThan(20_000);
  });
  it('every question gets one, at the same address; the structured data stays on /help only', () => {
    for (const q of all) expect(renderToString(<MemoryRouter><QuestionPage sections={sections} slug={q.slug} /></MemoryRouter>)).not.toBe('');
    const script = readFileSync(new URL('../scripts/prerender.mjs', import.meta.url), 'utf8');
    expect(script).toContain('...faq.map((q) => `/help/${q.slug}`)');
    expect(script).toContain("const extra = path === '/help' ? ld(faqStructuredData(sections, metaFor('/help').canonical))");
    expect(readFileSync(new URL('../src/site/help/HelpPage.jsx', import.meta.url), 'utf8')).toContain('if (question && globalThis.__MS_PRERENDER__ && sections.some((s) => s.questions.some((q) => q.slug === question))) {');
  });
});
