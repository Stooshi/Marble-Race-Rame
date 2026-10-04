import { formatDelta, formatNumber, formatTime, percent } from '../utils/format';
import { Empty } from './Status';

/**
 * All-time stat tiles plus a per-track records table.
 * stats: row from the user_stats view; records: /users/:id/track-records
 */
export default function StatsDisplay({ stats, records = [] }) {
  const played = Number(stats?.races_played ?? 0);
  const tiles = [
    ['Races', formatNumber(played)],
    ['Wins', formatNumber(stats?.wins ?? 0)],
    ['Win rate', percent(stats?.wins, played)],
    ['Podiums', formatNumber(stats?.podiums ?? 0)],
    ['Avg. position', stats?.avg_position ?? '—'],
    ['Best finish', formatTime(stats?.best_finish_time_ms)],
    ['Best halfway split', formatTime(stats?.best_split_ms)],
    ['Coins won', formatNumber(stats?.coins_won ?? 0)],
  ];

  return (
    <div className="stats-display">
      <section className="card">
        <div className="card__header"><h2>All-time stats</h2></div>
        <dl className="stat-tiles">
          {tiles.map(([label, value]) => (
            <div key={label} className="stat-tile">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card">
        <div className="card__header"><h2>Track records</h2></div>
        {!records.length ? (
          <Empty>No finished races yet. Each track will show its personal best here.</Empty>
        ) : (
          <table className="table table--stack">
            <thead>
              <tr>
                <th>Track</th>
                <th className="num">Races</th>
                <th className="num">Wins</th>
                <th className="num">Best pos.</th>
                <th className="num">Avg pos.</th>
                <th className="num">Best split</th>
                <th className="num">Best time</th>
                <th className="num">vs record</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const gap = r.best_time_ms - r.track_record_ms;
                return (
                  <tr key={r.track_id}>
                    <td data-label="Track" className="stack-head">
                      <strong>{r.track_name}</strong> <span className={`badge badge--${r.difficulty}`}>{r.difficulty}</span>
                    </td>
                    <td data-label="Races" className="num">{r.races}</td>
                    <td data-label="Wins" className="num">{r.wins}</td>
                    <td data-label="Best pos." className="num">{r.best_position}</td>
                    <td data-label="Avg pos." className="num">{r.avg_position}</td>
                    <td data-label="Best split" className="num">{formatTime(r.best_split_ms)}</td>
                    <td data-label="Best time" className="num"><strong>{formatTime(r.best_time_ms)}</strong></td>
                    <td data-label="vs record" className="num">
                      {gap === 0 ? <span className="badge badge--gold">Record holder</span> : <span className="muted">{formatDelta(gap)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
