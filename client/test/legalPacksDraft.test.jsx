// The track-pack section of the terms of sale (Moses: drafted 12 Nov 2026, approved and live on /legal 16 Nov 2026):
// packs never transferable; marbles can't be traded yet (in-game trading may come, never for money); coins stay
// non-transferable. /preview/legal-packs shows the same terms with what changed highlighted.
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

describe('the track-pack terms (live from 16 Nov 2026)', () => {
  it('live on /legal: section 3, the sections after it renumbered, nothing highlighted, the date', () => {
    const live = html(<LegalPage />);
    expect(live).toContain('id="track-packs"');
    expect(live).not.toContain('ms-legal__new');
    for (const s of ['3. Track packs', '4. Payment', 'your right of withdrawal (section 5)', '8. Complaints', 'Terms of use and sale updated 16 November 2026', '$6.99', 'at most 30% of the price', '1,990 coins on the website, where the rest is $4.99', 'can&#x27;t be bought with coins alone', 'Yours for life', 'Unlocked at once', 'ticking the box', '14-day right of withdrawal (section 5) ends when it is unlocked', 'the coins you paid towards it are given back', 'the coins aren&#x27;t given back', 'Paid leagues can race any track', 'New tracks added to a pack later are included at no extra cost', 'same series where we can']) {
      expect(live, s).toContain(s);
    }
    // Packs: never transferable. Coins and passes: stay with the account. Marbles: not tradable yet, in-game only if ever.
    expect(live).toContain('it can never be transferred, sold, traded, gifted or moved to another account');
    expect(live).toContain('Coins, season passes and track packs belong to the account that got them: they can never be transferred, sold, traded, gifted or moved to another account.');
    expect(live).toContain('Marbles can&#x27;t be traded yet; if we add trading, it will only work inside Marble Spins, under rules we publish then, and never for money outside the game.');
    expect(live).toContain('can&#x27;t be cashed out or exchanged for money');
    expect(live).not.toMatch(/marbles[^.]*can&#x27;t be sold, traded or transferred/i);
  });

  it('the review page: the same terms, what changed highlighted', () => {
    const d = html(<LegalPacksPreview />);
    expect(d).toContain('Approved 16 November 2026, now live');
    expect(d).toMatch(/<mark class="ms-legal__new">8<\/mark>\. Complaints/);
    expect((d.match(/class="ms-legal__new"/g) ?? []).length).toBeGreaterThanOrEqual(8);
  });

  it('Help: marbles not tradable yet, never for money; coins never cashed out', async () => {
    const faq = readFileSync(new URL('../src/site/help/faq.js', import.meta.url), 'utf8');
    expect(faq).toContain("Marbles can't be traded yet; if we add trading, it will only work inside Marble Spins, under rules we publish then, and never for money outside the game.");
    expect(faq).not.toContain("Marbles can't be sold, traded or transferred either");
    expect(faq).toContain("Coins can't be cashed out");
  });

  it('noindex and linked from nowhere', () => {
    expect(metaFor('/preview/legal-packs').noindex).toBe(true);
    const linking = files(SRC).filter((f) => /\.(jsx?|json)$/.test(f) && !/App\.jsx$|LegalPacksPreview\.jsx$|LegalPage\.jsx$|LegalTrackPacks\.jsx$/.test(f) && readFileSync(f, 'utf8').includes('legal-packs'));
    expect(linking).toEqual([]);
  });
});
