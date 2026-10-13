import { DESIGN, ITEM } from '../../shared/marbles';
import MarbleBadge from './MarbleBadge';

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** A First Edition certificate (or the ID card of an unnumbered copy): serial, first owner, date, race record, marble ID. */
export default function Certificate({ cert }) {
  const item = ITEM[cert.slug];
  if (!item) return null;
  const design = DESIGN[item.design.key];
  const shade = item.shade;
  const title = cert.firstEdition ? `${design.name} #${String(cert.editionNo).padStart(3, '0')}` : `${design.name} · ${shade.name}`;
  return (
    <article className="ms-cert" aria-label={`Certificate for ${title}`}>
      <span className="ms-cert__tag">{cert.firstEdition ? 'FIRST EDITION CERTIFICATE' : 'MARBLE ID CARD'}</span>
      <div className="ms-row" style={{ gap: 16 }}>
        <MarbleBadge slug={cert.slug} size={92} label={`${design.name}, ${shade.name}`} />
        <div style={{ display: 'grid', gap: 2 }}>
          <span className="ms-cert__title">{title}</span>
          <span style={{ color: 'var(--ms-soft)' }}>
            {cert.firstEdition ? `of the first ${cert.editionSize.toLocaleString('en-US')} made` : 'after the numbered run'}
          </span>
        </div>
      </div>
      <div className="ms-quote"><span style={{ color: 'var(--ms-yellow)' }}>Series · {design.name}</span><span style={{ fontStyle: 'italic' }}>{design.story}</span></div>
      <div className="ms-quote">
        <span style={{ color: 'var(--ms-orange)' }}>Shade · {shade.name}{shade.original ? ' (original)' : ''}</span>
        <span>{shade.description}</span>
        <span className="ms-swatches">{shade.colours.map((c) => <i key={c.name} style={{ background: c.hex }} />)}{shade.colours.map((c) => c.name).join(' · ')}</span>
      </div>
      <div className="ms-kv">
        <span>First owner</span><span>@{cert.firstOwner ?? '[owner]'}</span>
        <span>Made</span><span>{cert.made ? DATE.format(new Date(cert.made)) : '[date]'}</span>
        <span>Races</span><span>{cert.races} · {cert.wins} {cert.wins === 1 ? 'win' : 'wins'}</span>
        <span>Marble ID</span><span>{cert.marbleCode}</span>
      </div>
      <p className="ms-note">The first {cert.editionSize === 1000 ? '1,000' : '500'} buyers of every marble get a numbered First Edition with its own history. After that the marble is still for sale, just without a number.</p>
    </article>
  );
}
