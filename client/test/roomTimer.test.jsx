// A friend room's start timer on the room page (Moses, 24 Oct 2026): the host's "Start in…" (30 s,
// 1 min, 2 min), the countdown everyone sees by the server's clock, "Start now" and "Cancel".
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clock } from '../src/site/pages/RoomPage';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

describe('the room start timer', () => {
  it('shows minutes and seconds, never below zero', () => {
    expect(clock(120000)).toBe('2:00');
    expect(clock(61000)).toBe('1:01');
    expect(clock(8200)).toBe('0:09');
    expect(clock(-500)).toBe('0:00');
  });
  it('the host picks 30 s, 1 min or 2 min; then Start now or Cancel; everyone sees the countdown', () => {
    const page = src('src/site/pages/RoomPage.jsx');
    expect(page).toContain("const START_IN = [[30, '30 s'], [60, '1 min'], [120, '2 min']];");
    expect(page).toContain('api.roomStartIn(code, s)');
    expect(page).toContain('api.roomStartInCancel(code)');
    expect(page).toContain("race.startsAt ? 'START NOW'");
    expect(page).toContain('{open && waiting && race.startsAt && <StartCountdown');
    // (The server's clock: skew from serverNow, so a phone with a wrong clock counts down right.)
    expect(page).toContain('new Date(v.race.serverNow).getTime() - Date.now()');
    const api = src('src/api/client.js');
    expect(api).toContain('/start-in`, { method: \'POST\', body: { seconds } }');
    expect(api).toContain('/start-in/cancel`');
  });
});
