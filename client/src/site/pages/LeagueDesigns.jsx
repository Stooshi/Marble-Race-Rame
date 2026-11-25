import { useEffect } from 'react';
import { CSS, Row } from './HolidayDesigns';
import { LEAGUE_OPTIONS } from '../marbles/leagueDesigns';

/**
 * The league marble's three options (a preview page, not linked, not indexed): /preview/marbles/league
 * Each as the shop picture (large, and at the card's size) and as the 3D marble rolling, on a light
 * and a dark background, as the Holiday Season review page shows them. Nothing here is in the catalogue.
 */
export default function LeagueDesigns() {
  useEffect(() => { document.title = 'League marble designs · Marble Spins'; }, []);
  return (
    <div className="nl-page">
      <style>{CSS}</style>
      <header className="nl-head">
        <span className="nl-eyebrow">Design review · not in the shop</span>
        <h1>The league marble</h1>
        <p>The Pro League winner&apos;s marble, never sold. Three options; Moses chose <b>Racing Stripes</b> (26 Oct). Each shows its picture (large, and at the card&apos;s size) and the 3D marble rolling as it does in races, on a light and a dark background.</p>
      </header>
      {LEAGUE_OPTIONS.map((e) => <Row key={e.key} e={e} tag={e.letter} />)}
      <p className="nl-foot">Once one is chosen, it is built as a real catalogue item that only the league end job gives out.</p>
    </div>
  );
}
