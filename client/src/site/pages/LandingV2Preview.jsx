import LandingPage from '../landing/LandingPage';

/**
 * The landing page draft v2 (Moses, 13 Nov 2026): /preview/landing-v2, noindex like every /preview page and linked
 * from nowhere. The live landing page (/) with "How it works" under the hero race, the "Collect" display case and
 * "Your Marble Bag" (src/site/landing/LandingV2Sections.jsx). The live page is unchanged.
 */
export default function LandingV2Preview() {
  return (
    <>
      <div className="ms-preview-bar" role="note">Preview: landing page draft v2. Not live.</div>
      <LandingPage v2 />
    </>
  );
}
