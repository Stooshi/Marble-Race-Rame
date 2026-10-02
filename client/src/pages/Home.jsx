import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useLobby } from '../hooks/useLobby';
import AuthForm from '../components/AuthForm';
import Leaderboard from '../components/Leaderboard';
import MarbleBall from '../components/MarbleBall';
import RaceList from '../components/RaceList';
import { ErrorMessage, Spinner } from '../components/Status';

const HERO_MARBLES = [
  { color_primary: '#E0115F' }, { color_primary: '#0F52BA' }, { color_primary: '#50C878' },
  { color_primary: '#FF4500', color_secondary: '#FFD700', pattern: 'galaxy' }, { color_primary: '#9966CC', color_secondary: '#E6E6FA', pattern: 'swirl' },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const races = useAsync(async () => {
    const { races: list } = await api.races(undefined, 30);
    return {
      live: list.filter((r) => ['lobby', 'countdown', 'running'].includes(r.status)),
      recent: list.filter((r) => r.status === 'finished').slice(0, 6),
    };
  }, []);
  const { reload } = races;
  useLobby(useCallback(() => reload(), [reload]));

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero__text">
          <h1>20 marbles. 90 seconds. One winner.</h1>
          <p className="lead">
            Pick a marble, choose a track — or let fate pick one — and watch every race unfold live with
            everyone else. Chase personal bests, beat your halfway splits and climb the leaderboard.
          </p>
          {isAuthenticated ? (
            <div className="hero__actions">
              <button type="button" className="btn btn--primary btn--lg" onClick={() => navigate('/dashboard')}>
                Start a race
              </button>
              <span className="muted">Welcome back, {user.display_name || user.username}.</span>
            </div>
          ) : (
            <ol className="steps">
              <li><strong>Pick your marble</strong> — 4 starters free, more in the shop.</li>
              <li><strong>Pick a track</strong> — or roll a random one.</li>
              <li><strong>Watch it live</strong> — every player sees the same race.</li>
            </ol>
          )}
          <div className="hero__marbles" aria-hidden="true">
            {HERO_MARBLES.map((m, i) => <MarbleBall key={i} marble={m} size={34} />)}
          </div>
        </div>
        {!isAuthenticated && (
          <div className="hero__auth">
            <AuthForm onSuccess={() => navigate('/dashboard')} />
          </div>
        )}
      </section>

      <div className="grid grid--main">
        <div className="stack">
          <section className="card">
            <div className="card__header">
              <h2>Live & open races</h2>
              {isAuthenticated && <Link to="/dashboard" className="btn btn--sm">New race</Link>}
            </div>
            {races.error && <ErrorMessage error={races.error} onRetry={reload} />}
            {races.loading && !races.data ? <Spinner /> : (
              <RaceList races={races.data?.live} empty="No open races right now. Start one from your dashboard!" />
            )}
          </section>
          <section className="card">
            <div className="card__header"><h2>Recent results</h2></div>
            {races.data && <RaceList races={races.data.recent} empty="No finished races yet." />}
          </section>
        </div>
        <Leaderboard />
      </div>
    </div>
  );
}
