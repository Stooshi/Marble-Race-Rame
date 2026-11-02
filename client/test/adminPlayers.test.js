// The back office's Players list: "Last race" (the last finished race, "–" if none) and sorting
// by Last race, Joined and Races (Moses, 1 Nov 2026).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eachLimited, firstCountry, lastFinishedRace, sortPlayers } from '../src/admin/players';

describe('last race', () => {
  it('is the latest finished race; unfinished ones and none give null', () => {
    const d = { races: { recent: [
      { status: 'running', finished_at: null },
      { status: 'finished', finished_at: '2026-11-01T18:00:00Z' },
      { status: 'finished', finished_at: '2026-11-01T20:30:00Z' },
    ] } };
    expect(lastFinishedRace(d)).toBe('2026-11-01T20:30:00Z');
    expect(lastFinishedRace({ races: { recent: [{ status: 'waiting', finished_at: null }] } })).toBeNull();
    expect(lastFinishedRace({ races: { recent: [] } })).toBeNull();
  });
});

describe('first country (never the IP address)', () => {
  it('the server\'s first_country when it sends one, else the oldest event with a country', () => {
    expect(firstCountry({ player: { first_country: 'SE' }, security: { events: [{ country: 'NO', created_at: '2026-01-01' }] } })).toBe('SE');
    expect(firstCountry({ player: { first_country: null }, security: { events: [{ country: 'NO', created_at: '2026-01-01' }] } })).toBeNull();
    expect(firstCountry({ player: {}, security: { events: [
      { country: 'DK', created_at: '2026-11-01T10:00:00Z' }, { country: null, created_at: '2026-10-01T10:00:00Z' }, { country: 'FI', created_at: '2026-10-30T10:00:00Z' },
    ] } })).toBe('FI');
    expect(firstCountry({ player: {}, security: { events: [] } })).toBeNull();
  });
});

describe('sorting', () => {
  const ps = [
    { id: 'a', races: 3, created_at: '2026-10-30T10:00:00Z', last_race_at: null },
    { id: 'b', races: 10, created_at: '2026-11-01T09:00:00Z', last_race_at: '2026-11-01T12:00:00Z' },
    { id: 'c', races: 0, created_at: '2026-10-20T09:00:00Z', last_race_at: '2026-10-31T12:00:00Z' },
  ];
  const ids = (l) => l.map((p) => p.id).join('');
  it('by last race, newest first, never-raced last either way', () => {
    expect(ids(sortPlayers(ps, 'lastRace'))).toBe('bca');
    expect(ids(sortPlayers(ps, 'lastRace', 'asc'))).toBe('cba');
  });
  it('by joined and by races', () => {
    expect(ids(sortPlayers(ps, 'joined'))).toBe('bac');
    expect(ids(sortPlayers(ps, 'joined', 'asc'))).toBe('cab');
    expect(ids(sortPlayers(ps, 'races'))).toBe('bac');
    expect(ids(sortPlayers(ps, 'races', 'asc'))).toBe('cab');
  });
  it('no key keeps the server order', () => {
    expect(ids(sortPlayers(ps, null))).toBe('abc');
  });
});

describe('loading', () => {
  it('reads every player, a few at a time, and survives a failure', async () => {
    let running = 0; let most = 0; const got = {};
    await eachLimited([1, 2, 3, 4, 5, 6], 2, async (x) => {
      running++; most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      if (x === 3) throw new Error('no');
      return x * 10;
    }, (x, r) => { got[x] = r; });
    expect(most).toBe(2);
    expect(got).toEqual({ 1: 10, 2: 20, 3: undefined, 4: 40, 5: 50, 6: 60 });
  });
});

describe('the Players table', () => {
  const src = readFileSync(join(__dirname, '..', 'src', 'admin', 'AdminApp.jsx'), 'utf8');
  it('has the Last race column and sortable Last race, Joined and Races; times in Swedish time', () => {
    expect(src).toMatch(/<Sort k="lastRace" label="Last race" \/>/);
    expect(src).toMatch(/<Sort k="joined" label="Joined" \/>/);
    expect(src).toMatch(/<Sort k="races" label="Races" num \/>/);
    expect(src).toMatch(/timeZone: 'Europe\/Stockholm'/);
    expect(src).toMatch(/<th>Country<\/th>/);
    expect(src).toMatch(/Country \(first visit\)/);
  });
  it('the Security tab loads its addresses on its own (audited by the server), not with the details', () => {
    expect(src).toMatch(/tab === 'Security' && <SecurityTab id=\{p\.id\}/);
    expect(src).toMatch(/adminApi\.security\(id\)/);
    expect(readFileSync(join(__dirname, '..', 'src', 'admin', 'adminApi.js'), 'utf8')).toMatch(/\/admin\/players\/\$\{id\}\/security/);
  });
});

describe('the Dashboard and staff (2 Nov 2026)', () => {
  const app = readFileSync(join(__dirname, '..', 'src', 'admin', 'AdminApp.jsx'), 'utf8');
  it('is the first tab and the start page, with the six periods', () => {
    expect(app.indexOf('to="/admin/dashboard">Dashboard')).toBeLessThan(app.indexOf('to="/admin/players">Players'));
    expect(app).toContain('<Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />');
    for (const k of ["'6h'", "'24h'", "'7d'", "'30d'", "'mtd'", "'lastmonth'"]) expect(app).toContain(k);
  });
  it('staff: a tag in the list and on the page, and the action (not for admins)', () => {
    expect(app).toContain('{p.is_staff && <span className="adm-tag adm-tag--staff">staff</span>}</td>');
    expect(app).toContain("adminApi.staff(p.id, !p.is_staff, reason)");
    expect(app).toContain("{p.role !== 'admin' && (");
  });
});

