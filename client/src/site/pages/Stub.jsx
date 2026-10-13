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

export const FriendsPage = () => <Stub eyebrow="Race · step 1 of 4" title="Who are you racing?" next={[['/play/track', 'Next: pick a track']]}>Race the open lobby or pick friends from today's races. [Coming in this build]</Stub>;
export const TrackPage = () => <Stub eyebrow="Race · step 2 of 4" title="Pick a track" next={[['/play/shooter', 'Next: your shooter']]}>Every track that's switched on, with its series and a preview. [Coming in this build]</Stub>;
export const ShooterPage = () => <Stub eyebrow="Race · step 3 of 4" title="Pick your shooter" next={[['/play/start', 'Next: the starting line']]}>Choose a marble from your Marble Bag. [Coming in this build]</Stub>;
export const StartLinePage = () => <Stub eyebrow="Race · step 4 of 4" title="Starting line" next={[['/home', 'Back to races']]}>The grid, the countdown and the gate. [Coming in this build]</Stub>;
export const LandingPage = () => <Stub eyebrow="Marble Spins" title="20 marbles. One winner. Every 90 seconds." next={[['/home', 'Play free'], ['/signup', 'Save your marble']]}>The landing page with a live replay of a close race. [Coming in this build]</Stub>;
