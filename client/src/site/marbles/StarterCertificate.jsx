import MarbleBadge from './MarbleBadge';
import { handle } from '../../shared/playerName';

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** A starter marble's certificate: every player's own 4 (20 Oct 2026), never sold. */
export default function StarterCertificate({ cert }) {
  const two = cert.marble.pattern === 'half';
  return (
    <article className="ms-cert" aria-label={`Certificate for ${cert.name}, ${cert.marbleCode}`}>
      <span className="ms-cert__tag">STARTER MARBLE · ID CARD</span>
      <div className="ms-row" style={{ gap: 16 }}>
        <MarbleBadge marble={cert.marble} size={92} label={cert.name} />
        <div style={{ display: 'grid', gap: 2 }}>
          <span className="ms-cert__title">{cert.name}</span>
          <span style={{ color: 'var(--ms-soft)' }}>Starter {cert.starterNo} of 4 · {two ? 'plain glass, two colours, half and half' : 'plain glass, one colour'}</span>
        </div>
      </div>
      <div className="ms-quote">
        <span className="ms-swatches">{[cert.marble.color_primary, cert.marble.color_secondary].filter(Boolean).map((c) => <i key={c} style={{ background: c }} />)}{cert.name.replace(' & ', ' · ')}</span>
      </div>
      <div className="ms-kv">
        <span>Owner</span><span>{handle(cert.owner)}</span>
        <span>Made</span><span>{DATE.format(new Date(cert.made))}</span>
        <span>Races</span><span>{cert.races} · {cert.wins} {cert.wins === 1 ? 'win' : 'wins'}</span>
        <span>Marble ID</span><span><span className="ms-id ms-id--big">{cert.marbleCode}</span></span>
      </div>
      <p className="ms-note">Every player gets 4 starter marbles of their own, each with its own Marble ID. They are never sold, and like every marble they never change how fast you race.</p>
    </article>
  );
}
