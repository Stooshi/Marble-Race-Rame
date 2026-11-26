import LegalPage from './LegalPage';

/**
 * The review page (Moses, 12 Nov 2026; approved 16 Nov 2026, now live on /legal): the full terms with the track-pack
 * section and the sentences it changed highlighted. /preview/legal-packs: noindex like every /preview page, linked
 * from nowhere.
 */
export default function LegalPacksPreview() {
  return (
    <>
      <div className="ms-page ms-page--narrow" style={{ paddingBottom: 0 }}>
        <div className="ms-mock-banner" role="note">
          <b>Approved 16 November 2026, now live</b> The terms with the track-pack section. What changed is <mark className="ms-legal__new">highlighted</mark>. The live terms are at <a href="/legal#sale">/legal</a>.
        </div>
        <a href="#track-packs" className="ms-btn ms-btn--sm" style={{ justifySelf: 'start' }}>Go to the new section</a>
      </div>
      <LegalPage highlight />
    </>
  );
}
