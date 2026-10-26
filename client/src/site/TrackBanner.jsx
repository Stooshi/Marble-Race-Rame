import { useState } from 'react';
import banners from '../shared/trackBanners.json';

/** Each series' gradient: the card's picture until a track's own has loaded, or when it has none. */
export const SERIES_PIC = {
  'World Tour': 'linear-gradient(150deg,#1D3A5C,#3DDC97)', 'Grand Prix': 'linear-gradient(150deg,#C94F3D,#2F5BEA)',
  Coasters: 'linear-gradient(150deg,#F2A541,#3A6B8C)', Canyons: 'linear-gradient(150deg,#D9773A,#5A2E1E)', Rivers: 'linear-gradient(150deg,#2E86AB,#3F7A4A)', Peaks: 'linear-gradient(150deg,#123A8C,#C9DCEF)', Blocks: 'linear-gradient(150deg,#5B7FB8,#7FAE5F)', 'Track and Field': 'linear-gradient(150deg,#B9493A,#2F5D9A)', Pinball: 'linear-gradient(150deg,#3A1E6B,#FF3FA8)',
  Arcade: 'linear-gradient(150deg,#0A0A12,#3FD8FF)', Classic: 'linear-gradient(150deg,#D9B77E,#1FA35B)',
};

/** Whether the picker shows the tracks' pictures (trackBanners.json → enabled; switched on after review). */
export const BANNERS_ON = Boolean(banners.enabled);
export const BANNERS = banners.banners ?? {};

/** A track's picture: { src, srcSet } (640×360, and 1280×720 for sharp screens), or null if it has none. */
export function bannerSrc(slug) {
  const b = BANNERS[slug];
  if (!b) return null;
  return { src: `/tracks/${slug}.webp?v=${b.v}`, srcSet: `/tracks/${slug}.webp?v=${b.v} 1x, /tracks/${slug}@2x.webp?v=${b.v} 2x` };
}

/**
 * The track's picture over the card's gradient: loaded only when the card nears the screen,
 * faded in once decoded; a missing or broken picture leaves the gradient. `force`: show it even
 * while the picker's pictures are switched off (the review page).
 */
export default function TrackBanner({ slug, force = false }) {
  const [state, setState] = useState('loading');
  const pic = (BANNERS_ON || force) ? bannerSrc(slug) : null;
  if (!pic || state === 'failed') return null;
  return (
    <img
      className="ms-trackcard__img"
      src={pic.src}
      srcSet={pic.srcSet}
      sizes="(max-width: 520px) 100vw, 320px"
      width="640"
      height="360"
      alt=""
      loading="lazy"
      decoding="async"
      data-loaded={state === 'loaded' || undefined}
      onLoad={() => setState('loaded')}
      onError={() => setState('failed')}
    />
  );
}
