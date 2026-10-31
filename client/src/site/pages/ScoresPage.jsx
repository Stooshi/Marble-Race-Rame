import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { ITEM } from '../../shared/marbles';
import MarbleBadge from '../marbles/MarbleBadge';
import { handle } from '../../shared/playerName';
import ReportName from '../../components/ReportName';
import CountryRecords from './CountryRecords';

// The season comes from the server (a season in its seasons table that is on or ended last, or the
// numbered one in economy.json): without one there is no "This season" board and no season label.
const BOARDS = [['season', 'This season'], ['all', 'All time'], ['friends', 'Friends'], ['countries', 'Countries']];
const MEDAL = { 1: 'var(--ms-yellow)', 2: 'var(--ms-soft)', 3: 'var(--ms-orange)' };

export function daysLeftIn(season) {
  const d = Math.ceil((new Date(season.endsAt) - Date.now()) / 86400000);
  return Math.max(0, d);
}

/** Scoreboards: players ranked by coins earned in races (money can't buy a place). */
export default function ScoresPage() {
  const { isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const [board, setBoard] = useState(BOARDS.some(([k]) => k === params.get('board')) ? params.get('board') : 'season');
  const countries = board === 'countries';
  const [hasSeason, setHasSeason] = useState(true);
  const { data, error, loading } = useAsync(
    () => (countries || (board === 'friends' && !isAuthenticated) ? Promise.resolve(null) : api.scoreboard(board)),
    [board, isAuthenticated],
  );
  // No season on the server: open on All time and leave the season tab out.
  useEffect(() => {
    if (data && !data.season && board === 'season') { setHasSeason(false); setBoard('all'); }
  }, [data, board]);
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
          <span style={{ color: 'var(--ms-soft)' }}>{countries ? 'The fastest time on each track, country by country.' : 'Ranked by coins earned in races. Money can\'t buy a place here.'}</span>
        </div>
        <div role="tablist" aria-label="Scoreboard" className="ms-tabs">
          {BOARDS.filter(([k]) => k !== 'season' || hasSeason).map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={board === k} onClick={() => setBoard(k)}>{label}</button>)}
        </div>
      </div>
      {board === 'season' && data?.season && (
        <div className="ms-pills">
          <span className="ms-pill" style={{ color: 'var(--ms-orange)' }}>{data.season.ended ? `${data.season.name}: final standings` : `${data.season.name} ends in ${daysLeftIn(data.season)} days`}</span>
          <span className="ms-pill">{data.season.ended ? `The top ${data.season.badgeTop} won the season badge` : `Top ${data.season.badgeTop} win a season badge for their Marble Bag`}</span>
        </div>
      )}
      {board === 'friends' && <p className="ms-note" style={{ margin: 0 }}>Friends: the players you raced with in the last day.</p>}
      {board === 'friends' && !isAuthenticated && <div className="ms-card"><Link to="/signup?mode=login&next=/scores">Log in</Link> to see your friends.</div>}
      {countries && <CountryRecords initialTrack={params.get('track')} />}
      {error && <div className="ms-msg ms-msg--bad">{error.message}</div>}
      {loading && !data && <p className="ms-note">Loading…</p>}
      {data && (
        <div className="ms-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="ms-table ms-table--scores">
            <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Marble</th><th scope="col" className="num">Wins</th><th scope="col" className="num">Coins<span className="ms-wide-only"> earned</span></th></tr></thead>
            <tbody>
              {withGap.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--ms-muted)' }}>No races counted here yet. Race to get on the board.</td></tr>}
              {withGap.map((r) => (r.gap ? (
                <tr key={r.key}><td colSpan={5} style={{ color: 'var(--ms-muted)' }}>…</td></tr>
              ) : (
                <tr key={r.key} className={r.me ? 'is-me' : undefined}>
                  <td style={{ color: MEDAL[r.rank] ?? 'var(--ms-text)', fontWeight: 800 }}>{r.rank}</td>
                  <td className="ms-scores__player">{r.name ?? handle(r.username)}{r.me ? ' (you)' : <ReportName userId={r.userId} name={r.name ?? handle(r.username)} where="scoreboard" compact />}</td>
                  <td>
                    <span className="ms-row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      {r.shooter?.item ? <MarbleBadge slug={r.shooter.item} size={22} still /> : <MarbleBadge marble={r.shooter?.original} size={22} still />}
                      <span className="ms-scores__shooter">{r.shooter?.item ? `${ITEM[r.shooter.item]?.design.name ?? ''}` : r.shooter?.original?.name ?? 'Starter'}</span>
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
