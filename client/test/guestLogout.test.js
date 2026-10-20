// A guest has no password: "Log out" warns first and offers to save the marble (Moses, 20 Oct 2026).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', 'src');
const src = (p) => readFileSync(join(root, p), 'utf8');
const files = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : /\.jsx?$/.test(f) ? [p] : []; });

describe('logging out as a guest', () => {
  it('the warning, its two choices, and the quick sign-up behind "Save my marble"', () => {
    const b = src('site/account/LogoutButton.jsx');
    expect(b).toMatch(/You're a guest — if you log out, your coins and marbles are lost\./);
    expect(b).toMatch(/Save your marble first\?/);
    expect(b).toMatch(/>Save my marble</);
    expect(b).toMatch(/>Log out anyway</);
    expect(b).toMatch(/user\?\.is_guest \? setStep\('warn'\) : out\(\)/);
    expect(b).toMatch(/<QuickSignup /);
  });

  it('every player-facing "Log out" goes through it (the back office keeps its own)', () => {
    for (const f of files(root)) {
      if (/admin[\\/]|LogoutButton\.jsx$/.test(f)) continue;
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/onClick=\{[^}]*logout[^}]*\}>Log out</);
    }
    expect(src('site/SiteHeader.jsx')).toMatch(/<LogoutButton /);
    expect(src('site/pages/SettingsPage.jsx')).toMatch(/<LogoutButton /);
    expect(src('components/NavBar.jsx')).toMatch(/<LogoutButton /);
  });
});
