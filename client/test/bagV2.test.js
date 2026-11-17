// The Marble Bag redesign (Moses, 16 Nov 2026; approved and live at /bag 17 Nov 2026): the bag shows only owned
// marbles (starters included), the racing one first; the collection lists the rest.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/shared/marbles';
import { COLLECTION_SIZE, bagTiles, splitBag } from '../src/site/pages/BagPage';

const starter = (n) => ({ id: `s${n}`, name: `Starter ${n}`, is_starter: true, starter_no: n, marble_code: `ST${n}` });

describe('bag v2', () => {
  const owned = ITEMS.filter((i) => i.kind === 'standard').slice(0, 3);
  const data = {
    copies: owned.map((i, k) => ({ slug: i.slug, editionNo: k + 1, marbleCode: `SC${k}` })),
    originals: [starter(1), starter(2), starter(3), starter(4)],
    sets: [],
    shooter: { item: owned[2].slug },
  };
  it('the bag: owned only, starters included, the racing marble first', () => {
    const { owned: mine, toGet } = splitBag(bagTiles(data));
    expect(mine).toHaveLength(7);
    expect(mine[0].slug).toBe(owned[2].slug);
    expect(mine.filter((t) => t.marble?.is_starter)).toHaveLength(4);
    expect(toGet.every((t) => !t.owned && t.slug)).toBe(true);
    expect(toGet.some((t) => t.slug === owned[0].slug)).toBe(false);
  });
  it('57 collection marbles; /bag is the v2 bag and the old preview link lands on it', () => {
    expect(COLLECTION_SIZE).toBe(57);
    const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
    expect(app).toMatch(/path="\/bag" element=\{<BagPage \/>\}/);
    expect(app).toMatch(/path="\/preview\/bag-v2" element=\{<Navigate to="\/bag" replace \/>\}/);
    const page = readFileSync(new URL('../src/site/pages/BagPage.jsx', import.meta.url), 'utf8');
    expect(page).toMatch(/Grow your collection/);
    expect(page).not.toMatch(/Preview of the new Marble Bag|next=\/preview/);
  });
});
