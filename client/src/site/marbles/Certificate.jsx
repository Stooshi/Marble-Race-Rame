import { DESIGN, ITEM, collectionOf, passNumber } from '../../shared/marbles';
import { retiredLine } from './useCollection';
import MarbleBadge from './MarbleBadge';
import { handle } from '../../shared/playerName';

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * A First Edition certificate (or the ID card of an unnumbered copy): serial, first owner, date, race
 * record, marble ID. A season pass's marble has its pass edition certificate ("Holiday 2026 #0001");
 * a seasonal marble after its retirement says so ("Retired 7 Jan 2027"); the league marble (Racing
 * Stripes) shows its owner's League wins and the Pro League it was first won in.
 */
export default function Certificate({ cert }) {
  const item = ITEM[cert.slug];
  if (!item) return null;
  const design = DESIGN[item.design.key];
  const shade = item.shade;
  const pass = item.kind === 'pass' && cert.editionNo;
  const league = item.kind === 'league';
  const retired = retiredLine(item);
  const title = league ? design.name : pass ? `${design.name} · ${passNumber(item, cert.editionNo)}` : cert.firstEdition ? `${design.name} #${String(cert.editionNo).padStart(3, '0')}` : `${design.name} · ${shade.name}`;
  return (
    <article className="ms-cert" aria-label={`Certificate for ${title}`}>
      <span className="ms-cert__tag">{league ? 'LEAGUE MARBLE' : pass ? collectionOf(item.design).edition.toUpperCase() : cert.firstEdition ? 'FIRST EDITION CERTIFICATE' : 'MARBLE ID CARD'}</span>
      <div className="ms-row" style={{ gap: 16 }}>
        <MarbleBadge slug={cert.slug} size={92} label={`${design.name}, ${shade.name}`} />
        <div style={{ display: 'grid', gap: 2 }}>
          <span className="ms-cert__title">{title}</span>
          {league && <span className="ms-cert__wins">League wins: {cert.league?.wins ?? 1}</span>}
          <span style={{ color: 'var(--ms-soft)' }}>
            {league ? `won in a Pro League${cert.league?.firstWon ? `: first in ${cert.league.firstWon.name}, ${DATE.format(new Date(cert.league.firstWon.at))}` : ''}` : pass ? 'given to a Holiday Season pass holder, numbered in order' : cert.firstEdition ? `of the first ${cert.editionSize.toLocaleString('en-US')} made` : 'after the numbered run'}
          </span>
          {retired && <span style={{ color: 'var(--ms-soft)', fontWeight: 700 }}>{retired} · never sold again</span>}
        </div>
      </div>
      <div className="ms-quote"><span style={{ color: 'var(--ms-yellow)' }}>{item.collection} · {design.name}</span><span style={{ fontStyle: 'italic' }}>{design.story}</span></div>
      <div className="ms-quote">
        <span style={{ color: 'var(--ms-orange)' }}>Shade · {shade.name}{shade.original ? ' (original)' : ''}</span>
        <span>{shade.description}</span>
        <span className="ms-swatches">{shade.colours.map((c) => <i key={c.name} style={{ background: c.hex }} />)}{shade.colours.map((c) => c.name).join(' · ')}</span>
      </div>
      <div className="ms-kv">
        <span>First owner</span><span>{cert.firstOwner ? handle(cert.firstOwner) : 'a former player'}</span>
        <span>Made</span><span>{cert.made ? DATE.format(new Date(cert.made)) : '[date]'}</span>
        <span>Races</span><span>{cert.races} · {cert.wins} {cert.wins === 1 ? 'win' : 'wins'}</span>
        <span>Marble ID</span><span><span className="ms-id ms-id--big">#{item.id}</span></span>
        <span>Collection</span><span>{item.collection}</span>
        <span>Certificate</span><span>{cert.marbleCode}</span>
      </div>
      {league
        ? <p className="ms-note">Not in the shop and never sold: only Pro League winners get it, once each. Each win after the first adds 1 to League wins. Racing with it is looks only, as always.</p>
        : pass
        ? <p className="ms-note">Only holders of the {collectionOf(item.design).name} pass ever get this marble, numbered in the order the passes were bought. It was never for sale.</p>
        : <p className="ms-note">The first {cert.editionSize === 1000 ? '1,000' : '500'} buyers of every marble get a numbered First Edition with its own history. After that the marble is still for sale, just without a number.</p>}
    </article>
  );
}
