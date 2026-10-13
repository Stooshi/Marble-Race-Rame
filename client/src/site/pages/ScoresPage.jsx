import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { ITEM } from '../../shared/marbles';
import MarbleBadge from '../marbles/MarbleBadge';

const BOARDS = [['season', 'This season'], ['all', 'All time'], ['friends', 'Friends']];
const MEDAL = { 1: 'var(--ms-yellow)', 2: 'var(--ms-soft)', 3: 'var(--ms-orange)' };

export function daysLeftIn(season) {
  const d = Math.ceil((new Date(season.endsAt) - Date.now()) / 86400000);
  return Math.max(0, d);
}

/** Scoreboards: players ranked by coins earned in races (money can't buy a place). */
export default function ScoresPage() {
  const { isAuthenticated } = useAuth();
  const [board, setBoard] = useState('season');
  const { data, error, loading } = useAsync(
    () => (board === 'friends' && !isAuthenticated ? Promise.resolve(null) : api.scoreboard(board)),
    [board, isAuthenticated],
  );
  const rows = data?.rows ?? [];
  const withGap = [];
  rows.forEach((r, i) => {
    if (i > 0 && r.rank > rows[i - 1].rank + 1) withGap.push({ gap: true, key: `gap-${i}` });
    withGap.push({ ...r, key: r.userId });
  });

  return (
    <div className="ms-page">
      <div className="ms-row" style={{ justifyContent: 'space-between', alignItems: 'end' }}>
        <div style={{ display: 'grid', gap: 6, flex: '1 1 320px' }}>
          <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Scoreboards</h1>
          <span style={{ color: 'var(--ms-soft)' }}>Ranked by coins earned in races. Money can't buy a place here.</span>
        </div>
        <div role="tablist" aria-label="Scoreboard" className="ms-tabs">
          {BOARDS.map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={board === k} onClick={() => setBoard(k)}>{label}</button>)}
        </div>
      </div>
      {board === 'season' && data?.season && (
        <div className="ms-pills">
          <span className="ms-pill" style={{ color: 'var(--ms-orange)' }}>{data.season.name} ends in {daysLeftIn(data.season)} days</span>
          <span className="ms-pill">Top {data.season.badgeTop} win a season badge for their Marble Bag</span>
        </div>
      )}
      {board === 'friends' && <p className="ms-note" style={{ margin: 0 }}>Friends, for now: the players you raced with in the last day. Friend rooms with invites are coming next.</p>}
      {board === 'friends' && !isAuthenticated && <div className="ms-card"><Link to="/signup?mode=login&next=/scores">Log in</Link> to see your friends.</div>}
      {error && <div className="ms-msg ms-msg--bad">{error.message}</div>}
      {loading && !data && <p className="ms-note">Loading…</p>}
      {data && (
        <div className="ms-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="ms-table">
            <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Shooter</th><th scope="col" className="num">Wins</th><th scope="col" className="num">Coins earned</th></tr></thead>
            <tbody>
              {withGap.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--ms-muted)' }}>No races counted here yet. Race to get on the board.</td></tr>}
              {withGap.map((r) => (r.gap ? (
                <tr key={r.key}><td colSpan={5} style={{ color: 'var(--ms-muted)' }}>…</td></tr>
              ) : (
                <tr key={r.key} className={r.me ? 'is-me' : undefined}>
                  <td style={{ color: MEDAL[r.rank] ?? 'var(--ms-text)', fontWeight: 800 }}>{r.rank}</td>
                  <td>@{r.username}{r.me ? ' (you)' : ''}</td>
                  <td>
                    <span className="ms-row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      {r.shooter?.item ? <MarbleBadge slug={r.shooter.item} size={22} still /> : <MarbleBadge marble={r.shooter?.original} size={22} still />}
                      {r.shooter?.item ? `${ITEM[r.shooter.item]?.design.name ?? ''}` : r.shooter?.original?.name ?? 'Starter'}
                    </span>
                  </td>
                  <td className="num">{r.wins.toLocaleString('en-US')}</td>
                  <td className="num">{r.coins.toLocaleString('en-US')}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
