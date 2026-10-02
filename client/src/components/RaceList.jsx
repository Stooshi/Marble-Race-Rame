import { Link } from 'react-router-dom';
import { timeAgo } from '../utils/format';
import { Empty } from './Status';

const STATUS_LABEL = { lobby: 'Open', countdown: 'Starting', running: 'Live', finished: 'Finished', cancelled: 'Cancelled' };

/** Compact list of races linking to the race (or results) page. */
export default function RaceList({ races, empty = 'No races yet.' }) {
  if (!races?.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="race-list">
      {races.map((r) => (
        <li key={r.id}>
          <Link to={r.status === 'finished' ? `/results/${r.id}` : `/race/${r.id}`} className="race-list__item">
            <span className={`badge badge--${r.status}`}>{STATUS_LABEL[r.status]}</span>
            <span className="race-list__name">
              <strong>{r.name || r.track_name}</strong>
              <small>{r.track_name} · {r.difficulty}</small>
            </span>
            <span className="race-list__meta">
              <span>{r.player_count} player{r.player_count === 1 ? '' : 's'}</span>
              <small>{r.entry_count}/{r.max_marbles} marbles · {timeAgo(r.created_at)}</small>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
