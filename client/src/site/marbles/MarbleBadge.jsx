import { GLOSS, badgeOf, plainBadge } from '../../shared/marbles/badge';
import { pictureBackground } from './picture';

/** A marble as a flat, shiny badge (cards, lists, certificates). `slug` for a collection item, `marble` for a plain Original. */
export default function MarbleBadge({ slug, marble, size = 84, label, still = false }) {
  const b = slug ? badgeOf(slug) : plainBadge(marble);
  const shadow = b.glow ? `0 0 ${Math.round(size / 4)}px ${b.glow}, 0 10px 20px rgba(0,0,0,0.45)` : '0 10px 20px rgba(0,0,0,0.45)';
  return (
    <span className="ms-m" style={{ width: size, height: size, boxShadow: shadow }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <i className={!still && b.spin ? `ms-spin-${b.spin}` : undefined} style={{ background: pictureBackground(b, slug ?? b.key) }} />
      {!still && b.shimmer && <i className="ms-shimmer" />}
      <i style={{ background: GLOSS }} />
    </span>
  );
}
