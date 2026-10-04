import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { formatNumber } from '../utils/format';
import { Empty, ErrorMessage, Spinner } from './Status';

const SORTS = [
  ['wins', 'Wins'],
  ['podiums', 'Podiums'],
  ['races_played', 'Races'],
  ['coins_won', 'Coins'],
];

/** Global player leaderboard with sortable categories. */
export default function Leaderboard({ limit = 10, title = 'Leaderboard' }) {
  const { user } = useAuth();
  const [sort, setSort] = useState('wins');
  const { data, error, loading, reload } = useAsync(() => api.leaderboard(sort, limit), [sort, limit]);
  const rows = data?.leaderboard ?? [];

  return (
    <section className="card leaderboard">
      <div className="card__header">
        <h2>{title}</h2>
      </div>
      <div className="segmented segmented--sm" role="tablist" aria-label="Sort leaderboard by">
        {SORTS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={sort === key} onClick={() => setSort(key)}>{label}</button>
        ))}
      </div>
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && !rows.length && <Empty>No finished races yet — be the first on the board.</Empty>}
      {rows.length > 0 && (
        <ol className="leaderboard__list">
          {rows.map((r) => (
            <li key={r.user_id} className={r.user_id === user?.id ? 'is-me' : undefined}>
              <span className={`rank rank--${r.rank}`}>{r.rank}</span>
              <Link to={`/profile/${r.user_id}`} className="leaderboard__name">{r.display_name || r.username}</Link>
              <span className="leaderboard__value">
                {formatNumber(r[sort])}
                <small>{sort === 'wins' ? `${r.races_played} races` : `${r.wins} wins`}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
