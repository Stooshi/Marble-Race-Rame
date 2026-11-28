// The CRM's buttons (Moses, 16 Nov 2026: "Open today's page" was blue-on-yellow): a link styled as a button keeps the
// button's own text colour, and every button style has readable contrast (WCAG AA, 4.5:1 or more).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/admin/crm.css', import.meta.url), 'utf8');
const hex = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16) / 255);
const lum = (c) => { const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const token = (name) => css.match(new RegExp(`--c-${name}: (#[0-9a-f]{6})`))[1];

describe('CRM buttons', () => {
  it('a link that is a button: its text colour wins over ".crm a"', () => {
    expect(css).toMatch(/\.crm a\.crm-btn \{ color: var\(--c-text\); \}/);
    expect(css).toMatch(/\.crm a\.crm-btn--primary, \.crm a\.crm-btn--primary:visited \{ color: #111; \}/);
    expect(css).toMatch(/\.crm a\.crm-btn--danger \{ color: #ffc9c2; \}/);
  });
  it('every button style reads at 4.5:1 or more', () => {
    expect(ratio('#111111', token('accent'))).toBeGreaterThan(4.5); // (primary)
    expect(ratio(token('text'), token('raise'))).toBeGreaterThan(4.5); // (a plain button)
    expect(ratio(token('muted'), token('panel'))).toBeGreaterThan(4.5); // (a chip)
    expect(ratio(token('accent'), token('bg'))).toBeGreaterThan(4.5); // (back, selected)
    expect(ratio(token('info'), token('accent'))).toBeLessThan(2); // (what "Open today's page" was: never again)
  });
});
