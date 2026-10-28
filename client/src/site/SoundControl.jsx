import { useAuth } from '../context/AuthContext';
import { useSoundSettings } from '../sound/settings';

/**
 * The speaker button in the header (on a phone, in the menu): sound on or off, remembered per player.
 * No volume controls (Moses, 28 Oct 2026): players use the device's own volume; the game music can be
 * switched off in Settings ("Game music").
 */
export default function SoundControl() {
  const { user } = useAuth();
  const { settings, update } = useSoundSettings(user);
  const muted = settings.muted;
  return (
    <div className="ms-sound">
      <button type="button" className="ms-sound__btn" aria-pressed={muted} aria-label={muted ? 'Sound off: turn it on' : 'Sound on: mute it'} title={muted ? 'Sound off' : 'Sound on'} onClick={() => update({ muted: !muted })}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
          {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19.5 5.5a9 9 0 0 1 0 13" /></>}
        </svg>
      </button>
    </div>
  );
}
