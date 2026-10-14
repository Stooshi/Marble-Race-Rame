import { GLOSS, badgeOf, plainBadge } from '../shared/marbles/badge';
import { pictureBackground } from '../site/marbles/picture';

/** A small marble: its flat picture (the collection look it wears, or a plain marble's own), as in the shop. */
export default function MarbleBall({ marble, size = 28, ring = false, title }) {
  const b = marble?.look ? badgeOf(marble.look) : plainBadge(marble ?? {});
  return (
    <span
      className={`marble-ball${ring ? ' marble-ball--ring' : ''}`}
      style={{ width: size, height: size, background: `${GLOSS}, ${pictureBackground(b, marble?.look ?? b.key)}` }}
      title={title ?? marble?.name}
      role="img"
      aria-label={title ?? marble?.name ?? 'marble'}
    />
  );
}
