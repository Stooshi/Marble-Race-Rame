/** 84213 -> "1:24.21"; 9500 -> "9.50" */
export function formatTime(ms) {
  if (ms === null || ms === undefined || Number.isNaN(Number(ms))) return '—';
  const total = Math.max(0, Number(ms)) / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  const s = seconds.toFixed(2);
  return minutes ? `${minutes}:${s.padStart(5, '0')}` : s;
}

/** Signed time difference: -450 -> "−0.45s", 1230 -> "+1.23s". */
export function formatDelta(ms) {
  if (ms === null || ms === undefined || Number.isNaN(Number(ms))) return '—';
  const n = Number(ms);
  if (n === 0) return '±0.00s';
  return `${n < 0 ? '−' : '+'}${(Math.abs(n) / 1000).toFixed(2)}s`;
}

export function ordinal(n) {
  if (!n) return '—';
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
  return `${n}${suffix}`;
}

export function percent(part, whole) {
  if (!whole) return '—';
  return `${Math.round((Number(part) / Number(whole)) * 100)}%`;
}

export function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString();
}

export function timeAgo(date) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
