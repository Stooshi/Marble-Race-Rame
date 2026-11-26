import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';

let user = null;
vi.mock('../src/context/AuthContext', () => ({ useOptionalUser: () => user }));
vi.mock('../src/sound/engine', () => ({ nowPlaying: () => ({ raceId: 'r1', kind: 'race', name: 'tune-9' }) }));

const { default: NowPlaying, tuneLabel } = await import('../src/components/NowPlaying');

describe('Now playing (admins only)', () => {
  beforeEach(() => { user = null; });
  it('names the tune as in music-inbox', () => {
    expect(tuneLabel('tune-9')).toBe('RACE MUSIC 9');
    expect(tuneLabel('tune-14')).toBe('RACE MUSIC 14');
    expect(tuneLabel('ceremony')).toBe('CEREMONY SONG');
  });
  it('shows "♪ RACE MUSIC 9" to an admin', () => {
    user = { id: 1, role: 'admin' };
    expect(renderToString(<NowPlaying />)).toContain('♪ RACE MUSIC 9');
  });
  it('never to a player or a guest', () => {
    user = { id: 2, role: 'player' };
    expect(renderToString(<NowPlaying />)).toBe('');
    user = null;
    expect(renderToString(<NowPlaying />)).toBe('');
  });
});
