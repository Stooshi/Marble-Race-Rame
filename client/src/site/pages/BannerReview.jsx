import { useMemo, useState } from 'react';
import TrackBanner, { BANNERS, BANNERS_ON, SERIES_PIC } from '../TrackBanner';

const ORDER = ['World Tour', 'Grand Prix', 'Coasters', 'Canyons', 'Blocks', 'Track and Field', 'Rivers', 'Peaks', 'Pinball', 'Arcade', 'Winter Wonders', 'Classic'];
const kb = (n) => `${Math.round(n / 1000)} kB`;

/**
 * /preview/banners (not linked): every track picture, as the picker's cards will show them, for
 * review before they are switched on (client/src/shared/trackBanners.json → enabled).
 */
export default function BannerReview() {
  const [series, setSeries] = useState('All');
  const all = useMemo(() => Object.entries(BANNERS).map(([slug, b]) => ({ slug, ...b }))
    .sort((a, b) => ORDER.indexOf(a.series) - ORDER.indexOf(b.series) || a.name.localeCompare(b.name)), []);
  const shown = series === 'All' ? all : all.filter((b) => b.series === series);
  const total = all.reduce((n, b) => n + b.bytes, 0);
  return (
    <div className="ms-page" style={{ gap: 18, paddingBottom: 40 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <span className="ms-eyebrow">Review</span>
        <h1 className="ms-h1" style={{ margin: 0 }}>Track pictures</h1>
        <p className="ms-lede" style={{ margin: 0 }}>
          {all.length} tracks, {kb(total)} in all at 640×360 (the picker loads only the cards on screen).
          {' '}In the track picker: <b>{BANNERS_ON ? 'switched on' : 'switched off (only here for now)'}</b>.
        </p>
      </div>
      <div className="ms-tabs" role="group" aria-label="Series">
        {['All', ...ORDER.filter((s) => all.some((b) => b.series === s))].map((s) => (
          <button key={s} type="button" aria-pressed={series === s} onClick={() => setSeries(s)}>{s} {s === 'All' ? all.length : all.filter((b) => b.series === s).length}</button>
        ))}
      </div>
      <section className="ms-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }} aria-label="Track pictures">
        {shown.map((b) => (
          <div key={b.slug} className="ms-trackcard" style={{ cursor: 'default' }}>
            <div className="ms-trackcard__pic" style={{ background: SERIES_PIC[b.series] }}>
              <TrackBanner slug={b.slug} force />
              <span className="ms-badge-label" style={{ background: 'var(--ms-green)' }}>NEW</span>
            </div>
            <div className="ms-trackcard__body">
              <b>{b.name}</b>
              <span>{b.series} · <code>{b.slug}</code></span>
              <span>
                {(b.t / 1000).toFixed(1)} s after GO · {b.side > 0 ? 'right' : 'left'} · {b.lighting ?? 'day'} · {b.marbles} marbles · {kb(b.bytes)} / <a href={`/tracks/${b.slug}@2x.webp?v=${b.v}`} target="_blank" rel="noreferrer">{kb(b.bytes2x)} @2x</a>
                {b.leaderHidden && <b style={{ color: 'var(--ms-orange)' }}> · leader hidden</b>}
              </span>
            </div>
          </div>
        ))}
      </section>
      <p className="ms-note">A picture to redo: give its track a moment and side in <code>scripts/track-banners.json</code> ({'{ "<slug>": { "t": 24000, "side": -1 } }'}), then <code>node scripts/track-banners.js &lt;slug&gt;</code>.</p>
    </div>
  );
}
