// The track-pack section of the terms of sale, a DRAFT for Moses's review (12 Nov 2026): shown in place in the
// full terms on /preview/legal-packs with the new and changed text highlighted; the live /legal page unchanged.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import LegalPage from '../src/site/pages/LegalPage';
import LegalPacksPreview from '../src/site/pages/LegalPacksPreview';
import { metaFor } from '../src/site/pageMeta';

const html = (el) => renderToString(<MemoryRouter>{el}</MemoryRouter>).replace(/<!-- -->/g, '');
const SRC = new URL('../src/', import.meta.url).pathname;
const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));

describe('the track-pack terms (draft)', () => {
  it('the live /legal page shows none of it', () => {
    const live = html(<LegalPage />);
    expect(live).not.toMatch(/Track packs|track pack|ms-legal__new/);
    expect(live).toContain('3. Payment');
    expect(live).toContain('your right of withdrawal (section 4)');
    expect(live).toContain('7. Complaints');
  });

  it('the preview: the section in place, highlighted, the sections after it renumbered', () => {
    const d = html(<LegalPacksPreview />);
    expect(d).toContain('Draft for review');
    expect(d).toContain('id="track-packs"');
    for (const s of ['$7.99', 'at most 25% of the price', 'can&#x27;t be bought with coins alone', 'Yours for life', 'Unlocked at once', 'ticking the box', '14-day right of withdrawal (section 5) ends when it is unlocked', 'your right of withdrawal (section <mark class="ms-legal__new">5</mark>)', 'the coins you paid towards it are given back', 'the coins aren&#x27;t given back', 'Paid leagues can race any track']) {
      expect(d, s).toContain(s);
    }
    expect(d).toMatch(/<mark class="ms-legal__new">8<\/mark>\. Complaints/);
    expect((d.match(/class="ms-legal__new"/g) ?? []).length).toBeGreaterThanOrEqual(8);
  });

  it('noindex and linked from nowhere', () => {
    expect(metaFor('/preview/legal-packs').noindex).toBe(true);
    const linking = files(SRC).filter((f) => /\.(jsx?|json)$/.test(f) && !/App\.jsx$|LegalPacksPreview\.jsx$|LegalPage\.jsx$/.test(f) && readFileSync(f, 'utf8').includes('legal-packs'));
    expect(linking).toEqual([]);
  });
});
