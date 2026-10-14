import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSoundSettings } from '../sound/settings';

/** The speaker button in the header: music and effects volume, and mute (remembered per player). */
export default function SoundControl() {
  const { user } = useAuth();
  const { settings, update } = useSoundSettings(user);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const silent = settings.muted || (settings.music === 0 && settings.effects === 0);
  return (
    <div className="ms-sound" ref={ref}>
      <button type="button" className="ms-sound__btn" aria-expanded={open} aria-label={silent ? 'Sound: off' : 'Sound'} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
          {silent ? <path d="M17 9l5 6M22 9l-5 6" /> : <><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19.5 5.5a9 9 0 0 1 0 13" /></>}
        </svg>
      </button>
      {open && (
        <div className="ms-sound__panel" role="dialog" aria-label="Sound">
          <label className="ms-sound__row">
            <span>Music</span>
            <input type="range" min="0" max="100" value={Math.round(settings.music * 100)} onChange={(e) => update({ music: Number(e.target.value) / 100, muted: false })} />
          </label>
          <label className="ms-sound__row">
            <span>Effects</span>
            <input type="range" min="0" max="100" value={Math.round(settings.effects * 100)} onChange={(e) => update({ effects: Number(e.target.value) / 100, muted: false })} />
          </label>
          <label className="ms-sound__row ms-sound__mute">
            <input type="checkbox" checked={settings.muted} onChange={(e) => update({ muted: e.target.checked })} />
            <span>Mute all sound</span>
          </label>
        </div>
      )}
    </div>
  );
}
