// The launch limited edition (Northern Lights) as the shop shows it: coming before its window, how many
// are left in it, sold out after (the server decides what can be bought; this is only what the screen says).
import { describe, expect, it } from 'vitest';
import catalogJson from '../src/shared/marbles/catalog.json';
describe('the launch limited edition in the shop', () => {
  it('shows "Coming 1 December — limited to 500" before its window, how many are left in it, "Sold out" after', async () => {
    const { limitedSale, limitedLine } = await import('../src/site/marbles/useCollection');
    const nl = catalogJson.designs.find((d) => d.key === 'aurora');
    const at = (iso, live) => limitedLine(limitedSale(nl, live, new Date(iso)));
    expect(at('2026-10-17T12:00:00Z')).toBe('Coming 1 December — limited to 500');
    expect(at('2026-11-30T22:59:59Z')).toBe('Coming 1 December — limited to 500');
    expect(at('2026-11-30T23:00:00Z', { numberedLeft: 500 })).toBe('500 of 500 left · on sale until 31 December');
    expect(at('2026-12-20T12:00:00Z', { numberedLeft: 0 })).toBe('Sold out');
    expect(at('2026-12-31T23:00:00Z', { numberedLeft: 120 })).toBe('Sold out');
    expect(limitedSale(catalogJson.designs.find((d) => !d.limited), null)).toBeNull();
  });
});
