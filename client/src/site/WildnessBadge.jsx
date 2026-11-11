import { WILDNESS, WILDNESS_NOTE, wildnessOf } from '../shared/wildness.js';

/** Waves: one for Easy, two for Wild, three for Extreme (with the word: never colour alone). */
function Waves({ n }) {
  return (
    <svg className="ms-wild__waves" viewBox="0 0 14 12" width="14" height="12" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const y = n === 1 ? 6 : n === 2 ? 4 + i * 4 : 2.5 + i * 3.5;
        return <path key={i} d={`M1 ${y} q3 -2.4 6 0 t6 0`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />;
      })}
    </svg>
  );
}

/** A track's wildness badge (nothing for a track without one). `title`: the explanation on hover. */
export default function WildnessBadge({ track, level = wildnessOf(track), className = '' }) {
  const w = WILDNESS[level];
  if (!w) return null;
  return (
    <span className={`ms-wild ms-wild--${level} ${className}`.trim()} title={`${w.about}. ${WILDNESS_NOTE}`}>
      <Waves n={w.waves} />{w.word}
    </span>
  );
}
