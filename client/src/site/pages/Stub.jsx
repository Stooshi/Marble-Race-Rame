import { Link } from 'react-router-dom';

/**
 * A page of the new site that is still being built: its title, what it will hold, and a way on.
 * Each one is replaced by the real page in its build step.
 */
export default function Stub({ eyebrow, title, children, next }) {
  return (
    <div className="ms-page ms-page--narrow">
      <div className="ms-card" style={{ display: 'grid', gap: 14 }}>
        {eyebrow && <div className="ms-eyebrow">{eyebrow}</div>}
        <h1 className="ms-h1">{title}</h1>
        <p className="ms-lede">{children}</p>
        {next && (
          <div className="ms-row">
            {next.map(([to, label], k) => (
              <Link key={to} to={to} className={`ms-btn ${k === 0 ? 'ms-btn--primary' : ''}`}>{label}</Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const LandingPage = () => <Stub eyebrow="Marble Spins" title="20 marbles. One winner. Every 90 seconds." next={[['/play/start?quick=1', 'Play free'], ['/signup', 'Save your marble']]}>The landing page with a live replay of a close race. [Coming in this build]</Stub>;
