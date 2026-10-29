import { useEffect, useState } from 'react';
import { useOptionalUser } from '../context/AuthContext';
import { nowPlaying } from '../sound/engine';

/** The music's name as in music-inbox: tune-9 → RACE MUSIC 9. */
export function tuneLabel(name) {
  if (!name) return null;
  const m = /^tune-(\d+)$/.exec(name);
  if (m) return `RACE MUSIC ${m[1]}`;
  return name === 'ceremony' ? 'CEREMONY SONG' : name.toUpperCase();
}

/**
 * Admins only (Moses, 29 Oct 2026; never shown to players): a small note in the race screen naming the
 * music playing now, "♪ RACE MUSIC 9", for checking the shuffle.
 */
export default function NowPlaying() {
  const user = useOptionalUser();
  const admin = user?.role === 'admin';
  const [name, setName] = useState(() => (admin ? nowPlaying()?.name ?? null : null));
  useEffect(() => {
    if (!admin) return undefined;
    const tick = () => setName(nowPlaying()?.name ?? null);
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [admin]);
  if (!admin || !name) return null;
  return <div className="replay3d__nowplaying" aria-hidden="true">{`♪ ${tuneLabel(name)}`}</div>;
}
