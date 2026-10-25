// The race standings appear at GO (Moses, 25 Oct 2026): before the gates open the order is only the
// starting order, and places 1–5 would look as if the race were already decided. During the countdown
// the viewer sees only "Your gate: 13". Looks only: the race itself is untouched.
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ownGate, standingsRows, standingsShown } from '../src/utils/standingsRows';
import YourGate from '../src/components/YourGate';
import RaceViewer from '../src/components/RaceViewer';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const marble = { name: 'Topaz', colors: ['#f00'] };
const entries = Array.from({ length: 4 }, (_, i) => ({
  index: i, entryId: `e${i}`, lane: [12, 3, 0, 7][i], marble, isBot: i > 0,
  user: i === 0 ? { id: 'u1', username: 'nova' } : null,
}));
const meta = { raceId: 'r1', durationMs: 60000, track: { name: 'Test Run' }, entries };

describe('the standings appear at GO', () => {
  it('only once the race clock reaches 0', () => {
    expect(standingsShown(null)).toBe(false);
    expect(standingsShown(undefined)).toBe(false);
    expect(standingsShown(-4200)).toBe(false);
    expect(standingsShown(-1)).toBe(false);
    expect(standingsShown(0)).toBe(true);
    expect(standingsShown(31000)).toBe(true);
  });

  it('the own gate is the entry\'s lane, counted from 1', () => {
    expect(ownGate(entries, [0])).toBe(13);
    expect(ownGate(entries, [2])).toBe(1);
    expect(ownGate(entries, [])).toBe(null);
    expect(ownGate(entries, [9])).toBe(null);
    expect(renderToString(<YourGate entries={entries} mine={[0]} />)).toContain('Your gate: <strong>13</strong>');
    expect(renderToString(<YourGate entries={entries} mine={[]} />)).toBe('');
  });

  it('the rows themselves are unchanged', () => {
    expect(standingsRows([3, 1, 2, 0], [0], 2)).toEqual([
      { index: 3, pos: 0, own: false }, { index: 1, pos: 1, own: false }, { index: 0, pos: 3, own: true },
    ]);
  });

  it('2D: no standings list before GO, only the own gate; the list from GO', () => {
    const before = renderToString(<RaceViewer live meta={meta} sample={() => null} frame={null} highlight={[0]} />);
    expect(before).not.toContain('class="standings"');
    expect(before).toContain('Your gate: <strong>13</strong>');
    const at = renderToString(<RaceViewer live meta={meta} sample={() => null} frame={{ t: 0, s: [2, 1, 3, 0], p: [0, 0, 0, 0] }} highlight={[0]} />);
    expect(at).toContain('class="standings"');
    expect(at).not.toContain('Your gate');
  });

  it('3D live and replays hide the list until GO and show the own gate instead', () => {
    for (const f of ['src/components/LiveRaceViewer3D.jsx', 'src/components/RaceReplayViewer.jsx']) {
      const s = src(f);
      expect(s, f).toMatch(/standingsShown\(/);
      expect(s, f).toMatch(/<YourGate /);
      // Every standings list is behind the GO check.
      const lists = s.split('className="replay3d__standings"').length - 1;
      expect(lists, f).toBe(1);
      expect(s, f).toMatch(/\{show\.phase === 'racing' && (gone|standingsShown\(replay\.time\)) && \(\s*<ol className="replay3d__standings"/);
    }
  });
});
