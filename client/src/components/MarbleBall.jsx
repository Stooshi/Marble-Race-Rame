/** A CSS-rendered marble in the marble's colours. */
export default function MarbleBall({ marble, size = 28, ring = false, title }) {
  const primary = marble?.color_primary || '#888888';
  const secondary = marble?.color_secondary || primary;
  const pattern = marble?.pattern || 'solid';
  const layers = ['radial-gradient(circle at 32% 28%, rgba(255,255,255,.85) 0 8%, rgba(255,255,255,0) 30%)'];
  if (pattern === 'swirl' || pattern === 'galaxy') {
    layers.push(`conic-gradient(from 40deg, ${primary}, ${secondary}, ${primary}, ${secondary}, ${primary})`);
  } else if (pattern === 'striped') {
    layers.push(`repeating-linear-gradient(45deg, ${primary} 0 22%, ${secondary} 22% 34%)`);
  } else if (pattern === 'cat-eye') {
    layers.push(`linear-gradient(100deg, ${primary} 0 42%, ${secondary} 42% 58%, ${primary} 58%)`);
  }
  layers.push(`radial-gradient(circle at 35% 35%, ${primary}, ${secondary === primary ? shade(primary) : secondary})`);
  return (
    <span
      className={`marble-ball${ring ? ' marble-ball--ring' : ''}`}
      style={{ width: size, height: size, background: layers.join(', ') }}
      title={title ?? marble?.name}
      role="img"
      aria-label={title ?? marble?.name ?? 'marble'}
    />
  );
}

function shade(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.45);
  const g = Math.round(((n >> 8) & 255) * 0.45);
  const b = Math.round((n & 255) * 0.45);
  return `rgb(${r}, ${g}, ${b})`;
}
