// No volume controls (Moses, 28 Oct 2026): players use the device's own volume. Only the mute button
// (the speaker) and Settings → "Game music" on/off; fixed levels; old saved volumes dropped.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { clean, engineSettings } from '../src/sound/settings';

const SRC = path.resolve(__dirname, '../src');
const files = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(d, e.name)) : /\.(jsx?|css)$/.test(e.name) ? [path.join(d, e.name)] : []));
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

describe('no volume controls', () => {
  it('no volume slider anywhere: the only range inputs are the replay and results timelines', () => {
    const ranges = files(SRC).filter((f) => /type="range"/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(SRC, f)).sort();
    expect(ranges).toEqual(['components/RaceReplayViewer.jsx', 'pages/Results.jsx']);
    for (const f of files(SRC)) expect(fs.readFileSync(f, 'utf8'), f).not.toMatch(/ms-sound__panel|Mute all sound|update\(\{ (music|effects): Number/);
  });

  it('the speaker button only mutes; Settings has the Game music switch', () => {
    const btn = read('site/SoundControl.jsx');
    expect(btn).toContain('onClick={() => update({ muted: !muted })}');
    const settings = read('site/pages/SettingsPage.jsx');
    expect(settings).toContain('<b>Game music</b>');
    expect(settings).toContain("onChange={(e) => update({ music: e.target.checked })}");
  });

  it('fixed levels; music on or off; old slider numbers read once and dropped', () => {
    expect(engineSettings({ muted: false, music: true })).toEqual({ music: 0.7, effects: 0.8, muted: false });
    expect(engineSettings({ muted: true, music: false })).toEqual({ music: 0, effects: 0.8, muted: true });
    expect(clean({ music: 0.6, effects: 0.3, muted: false })).toEqual({ muted: false, music: true });
    expect(clean({ music: 0, effects: 1, muted: true })).toEqual({ muted: true, music: false });
    expect(Object.keys(clean({ music: 0.6, effects: 0.3 })).sort()).toEqual(['music', 'muted']);
  });

  it('the Help answers say so (no sliders)', () => {
    const faq = read('site/help/faq.js');
    expect(faq).not.toMatch(/set music and effects separately/);
    expect(faq).toContain('**Settings → Game music**');
  });
});
