// Pro Leagues and credits on the website and in the apps (Leagues part 2, behind LEAGUES_PRO): the
// screens of the plan "Pro League and Credits" (27 Oct 2026), drawn from the real components.
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', is_guest: false }, loading: false }) }));
const { KindPick, LeagueMarbleCard, ProEndCard, proCost, GO_PRO_ON, CreditsChip, GetCreditsSheet, LEAGUE_MARBLE } = await import('../src/site/leagues/Pro');
const { default: Certificate } = await import('../src/site/marbles/Certificate');
const { ITEM, windowOf } = await import('../src/shared/marbles');

const prices = { proLeague: 2, proPass: 5, passDays: 30, swapRate: 1000 };
const html = (el) => renderToString(<MemoryRouter>{el}</MemoryRouter>).replace(/<!-- -->/g, '');
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const packs = [
  { id: 'credits-5', credits: 5, amountCents: 500, line: '2 Pro Leagues, or a Pro pass' },
  { id: 'credits-10', credits: 10, amountCents: 1000, popular: true, line: '5 Pro Leagues' },
  { id: 'credits-25', credits: 25, amountCents: 2500, line: '12 Pro Leagues, or 5 Pro passes' },
];

describe('Pro League: what it costs, on the create screen (screens 1 and 2)', () => {
  it('2 credits; included in a running Pro pass; short of credits', () => {
    expect(proCost({ balance: 7, pass: null }, prices)).toEqual({ how: 'credits', have: 7, price: 2 });
    expect(proCost({ balance: 1, pass: null }, prices).how).toBe('short');
    const until = new Date(Date.now() + 86_400_000).toISOString();
    expect(proCost({ balance: 0, pass: { starts_at: new Date(Date.now() - 1000).toISOString(), ends_at: until } }, prices)).toMatchObject({ how: 'pass', until });
    // (A pass bought for later, still waiting: credits as usual.)
    expect(proCost({ balance: 3, pass: { starts_at: until, ends_at: until } }, prices).how).toBe('credits');
    const pick = html(<KindPick kind="pro" onKind={() => {}} wallet={{ balance: 7 }} prices={prices} />);
    expect(pick).toContain('5 tracks · free · for fun');
    expect(pick).toContain('10 tracks · league marble for the winner · counts toward the Major League · 2 credits');
    expect(pick).toContain('aria-checked="true"');
    expect(html(<KindPick kind="pro" onKind={() => {}} wallet={{ balance: 1 }} prices={prices} />)).toContain('2 credits · you have 1');
    expect(html(<KindPick kind="pro" onKind={() => {}} wallet={{ balance: 0, pass: { starts_at: new Date(0).toISOString(), ends_at: until } }} prices={prices} />)).toContain('included in your Pro pass');
    expect(html(<CreditsChip balance={7} />)).toContain('◆ 7 credits · for Pro Leagues');
  });
});

describe('Get credits (screen 3)', () => {
  it('the packs for Pro Leagues, the consent, card payment by Stripe', () => {
    const out = html(<GetCreditsSheet wallet={{ balance: 1, packs }} prices={prices} back="/l/K7QF2M" onClose={() => {}} />);
    expect(out).toContain('Get credits');
    expect(out).toContain('for Pro Leagues');
    expect(out).toContain('2 credits a Pro League, or 5 for a 30-day Pro pass. Credits never expire.');
    for (const p of ['$5', '$10', '$25']) expect(out).toContain(p);
    expect(out).toContain('5 Pro Leagues · popular');
    expect(out).toContain("I want my credits delivered right away. I understand that I lose my 14-day right of withdrawal once they&#x27;re delivered.");
    expect(out).toContain('PAY $10');
    expect(out).toContain('Card payment by Stripe');
  });
});

describe('a Pro League\'s page and its end (screens 5 and 6)', () => {
  it('the marble for the winner, progress to 3 ranked players', () => {
    const out = html(<LeagueMarbleCard league={{ ranked: 2, min_ranked: 3 }} tracks={10} />);
    expect(out).toContain('Winner gets Racing Stripes');
    expect(out).toContain('Needs at least 3 players who finish all 10 tracks.');
    expect(out).toContain('2 of 3 players have finished all 10 tracks.');
  });
  it('the winner\'s card, or why there\'s no marble', () => {
    const won = html(<ProEndCard league={{ name: 'Friday Pros', ranked: 4, winner: { id: 'u2', name: 'Oto', marble_code: 'LG011-000042', league_wins: 1 } }} scoreboard={[]} userId="u1" tracks={10} />);
    expect(won).toContain('Oto won Friday Pros');
    expect(won).toContain('League wins 1. 4 players finished all 10 tracks.');
    expect(won).toContain('href="/certificate/LG011-000042"');
    const none = html(<ProEndCard league={{ name: 'Two of us', ranked: 2, min_ranked: 3, winner: null, no_winner_reason: 'too_few_finishers' }} scoreboard={[{ place: 1, name: 'Nia' }]} userId="u1" tracks={10} />);
    expect(none).toContain('No winner&#x27;s marble this time');
    expect(none).toContain('Only 2 did. Nia is first on the scoreboard.');
  });
});

describe('the league marble (screen 7)', () => {
  it('Racing Stripes: never sold, League wins on its certificate', () => {
    expect(ITEM[LEAGUE_MARBLE].kind).toBe('league');
    expect(windowOf(ITEM[LEAGUE_MARBLE])).toBe('league-only');
    const cert = html(<Certificate cert={{ slug: LEAGUE_MARBLE, marbleCode: 'LG011-000042', firstOwner: 'oto', made: '2026-11-03T10:00:00Z', races: 3, wins: 1, league: { wins: 3, firstWon: { name: 'Friday Pros', at: '2026-11-03T10:00:00Z' } } }} />);
    expect(cert).toContain('LEAGUE MARBLE');
    expect(cert).toContain('League wins: 3');
    expect(cert).toContain('first in Friday Pros, 3 Nov 2026');
    expect(cert).toContain('Not in the shop and never sold');
  });
});

describe('the wallet and the texts (screens 8 and 9)', () => {
  it('coins and credits side by side, the one-way swap with its warning; Go pro', () => {
    const pro = src('src/site/leagues/Pro.jsx');
    expect(pro).toContain('for marbles and bags in the shop');
    expect(pro).toContain('for Pro Leagues · never expire');
    expect(pro).toContain("Swapped credits can't be refunded.");
    expect(pro).toContain("You can't swap coins back into credits.");
    expect(pro).toContain('Starts on {day(starts)}');
    expect(GO_PRO_ON).toBe('Go pro: join a Pro League and race your way to the Marble Spins Major League. Date to be announced.');
    // The top bar shows coins only: no credits in the header.
    expect(src('src/site/SiteHeader.jsx')).not.toMatch(/credit/i);
    expect(src('src/App.jsx')).toContain('<Route path="/wallet" element={<WalletPage NotFound={NotFound} />} />');
    expect(src('vercel.json')).toContain('|wallet|');
  });
});
