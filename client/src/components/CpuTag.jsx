/**
 * The small robot icon next to a computer player's name: computer players are always clearly
 * marked (honesty, store rules). "Computer player" is its tooltip and its accessible name.
 */
export default function CpuTag() {
  return (
    <span className="cpu-tag" title="Computer player" role="img" aria-label="Computer player">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
        <path d="M8 1.2v2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="8" cy="1.4" r="1.1" fill="currentColor" />
        <rect x="2.6" y="3.6" width="10.8" height="8.6" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="6" cy="7.4" r="1.15" fill="currentColor" />
        <circle cx="10" cy="7.4" r="1.15" fill="currentColor" />
        <path d="M6.2 10.1h3.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M1.2 6.8v2.6M14.8 6.8v2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5 12.2v2.2M11 12.2v2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
