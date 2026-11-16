import { Link } from 'react-router-dom';
import { RacerGate, TrackStep } from './RaceFlow';

/**
 * The track picker's new order, for review (Moses, 16 Nov 2026): /preview/picker-v2, noindex like every /preview
 * page, linked from nowhere. It shows the picker as it would be with TRACK_PACKS on for you, from your own packs
 * (owned packs unlocked): the tracks you can race first, then the locked ones mixed, with a pack banner where they
 * start, 7 rows later, 7 more rows later and at the end. The live picker (/play/track) is unchanged until approved.
 */
export default function PickerV2Preview() {
  return (
    <>
      <div className="ms-page" style={{ paddingBottom: 0 }}>
        <div className="ms-msg" role="note">
          Preview of the new track picker, as it would be with track packs locking for you (your own packs count as unlocked). The live <Link to="/play/track">track picker</Link> is unchanged.
        </div>
      </div>
      <RacerGate><TrackStep v2 preview /></RacerGate>
    </>
  );
}
