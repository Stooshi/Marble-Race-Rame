import { useId } from 'react';

/**
 * The Marble Spins wordmark: "marblespins" in Lilita One, the dot of the i a
 * spinning marble (the logo marble, with its two orbit arcs). `as` a link or a span.
 */
export default function Logo({ size = 34, plain = false }) {
  const id = useId().replace(/:/g, '');
  if (plain) return <span className="ms-logo" style={{ fontSize: size }}>marblespins</span>;
  return (
    <span className="ms-logo" style={{ fontSize: size }} role="img" aria-label="Marble Spins">
      <span aria-hidden="true">
        marblesp
        <span className="ms-logo__i">
          ı
          <svg viewBox="-120 -120 240 240" aria-hidden="true">
            <defs>
              <radialGradient id={`ms-logo-${id}`} cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="28%" stopColor="#FFD21F" />
                <stop offset="100%" stopColor="#E8580C" />
              </radialGradient>
            </defs>
            <path d="M 104 0 A 104 104 0 0 1 52 90" fill="none" stroke="#FF7A1A" strokeWidth="14" strokeLinecap="round" />
            <path d="M -104 0 A 104 104 0 0 1 -52 -90" fill="none" stroke="#FFD21F" strokeWidth="14" strokeLinecap="round" />
            <circle cx="0" cy="0" r="80" fill={`url(#ms-logo-${id})`} />
            <path d="M -64 16 C -34 -46 34 -50 62 -16" fill="none" stroke="#FFFFFF" strokeOpacity="0.9" strokeWidth="15" strokeLinecap="round" />
          </svg>
        </span>
        ns
      </span>
    </span>
  );
}
