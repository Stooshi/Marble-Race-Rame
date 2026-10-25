import { ownGate } from '../utils/standingsRows';

/**
 * "Your gate: 13", where the standings will be, while the countdown runs (the standings appear at GO).
 * Nothing for a viewer with no marble in the race.
 */
export default function YourGate({ entries, mine, className = 'replay3d__standings replay3d__gate' }) {
  const gate = ownGate(entries, mine);
  if (gate === null) return null;
  return <div className={className} aria-live="polite">Your gate: <strong>{gate}</strong></div>;
}
